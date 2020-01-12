'use strict';

const qs = require('querystring');
const request = require('request');

const {
    StripeAccount,
    StripeAccountConnection,
    Business,
    User
} = require('pp/models');

const {
    STRIPE_API_KEY,
    STRIPE_CLIENT_ID,
    STRIPE_REDIRECT_URI
} = process.env;

const stripe = require('stripe')(STRIPE_API_KEY);
const stripeOAuthTokenHref = 'https://connect.stripe.com/oauth/token';
const stripeConnectAccountHref = 'https://connect.stripe.com/oauth/authorize';

exports.findAccount = function(query) {
    return StripeAccount.findOne(query);
};

exports.verifyUserCanAccessAccount = function(authUserId, account) {
    if (account.accountType === 'Business') {
        return account.populate({
            path: 'accountHolder',
            select: '_id usersAdmin',
            query: {
                usersAdmin: {
                    $eq: authUserId
                }
            }
        }).execPopulate().then(function(account) {
            const holder = account.accountHolder;
            if (holder && holder.usersAdmin) {
                return holder.usersAdmin.some(function(id) {
                    return String(id) === String(authUserId);
                });
            } else {
                return false;
            }
        });
    } else {
        return Promise.resolve(account.accountHolder == authUserId);
    }
};

/**
 * Middleware for validating requests containing params:
 *
 *   accountId      ID of a stripeAccount
 *   accountType    StripeAccount type, can be 'Business' or 'User'
 *   accountHolder  ID of the account holder, which will be a Business or User
 *
 * When an account is found we verify that the currently signed in user
 * does in fact have read / write privileges, 401'ing when a user does not
 * have access to said account. An authorized user attempting to access an
 * account through these endpoints will be signed out if they _do not_ have
 * sufficient privileges.
 *
 * Securing user accounts
 * ---
 * When accessing a user account, the stripeAccount.accountHolder (ID) must match
 * the authenticated user's ID (authUserId), as users can not grant others admin access
 * to their account.
 *
 * Securing business accounts
 * ---
 * When accessing a business account, the authenticated user's ID (authUserId) must
 * exist in the account holder's (a business) `usersAdmin` collection.
 */
exports.validateStripeAccountRequestAndCheckUserAccess = function(req) {
    const authUserId = req.authUserId;
    const accountId = locateParam(req, 'accountId');
    const accountType = locateParam(req, 'accountType');
    const accountHolder = locateParam(req, 'accountHolder');

    if (accountId) {
        return exports.findAccount({ _id: accountId })
            .then(handleFindAccount, handleError);
    } else if (accountType && accountHolder) {
        return exports.findAccount({ accountType, accountHolder })
            .then(handleFindAccount, handleError);
    } else {
        // This shouldn't actually happen. Hitting this endpoint without
        // an account id or type and holder would be confusing..
        // 400 Bad Request
        // https://httpstatuses.com/400
        return Promise.resolve(false);
    }

    function handleFindAccount(account) {
        if (account) {
            return exports.verifyUserCanAccessAccount(authUserId, account)
                .then(function(hasAccess) {
                    if (hasAccess) {
                        req.account = account;
                        // Move along now
                        return account;
                    } else {
                        // Not your account bruh, 401 Unauthorized
                        // NOTE: this will sign people out for being sketchy
                        // https://httpstatuses.com/401
                        return false;
                    }
                }, handleError);
        } else {
            return Promise.resolve(false);
        }
    }

    function handleError() {
        return false;
    }

    function locateParam(req, param) {
        return req.params[param] ||
            req.query[param] ||
            req.body[param];
    }
};

exports.addPaymentMethodFromPaymentToken = function(account, paymentToken) {
    // TODO: this sucks.. even if the customerObject has not been set
    // mongoose provides an empty object, resulting in a false positive
    const customerObject = Promise.resolve(account.customerObject.id ?
        account.customerObject : exports.createCustomer(account));

    return customerObject.then(function(customer) {
        return stripe.customers.createSource(customer.id, { source: paymentToken.id })
            .then(function(card) {
                account.paymentMethod = card;
                account.customerObject.default_source = card.id;
                return account.save();
            });
    });

};

exports.createCustomer = function(account) {
    return stripe.customers.create({
        metadata: {
            stripeAccount: account.id
        }
    }).then(function(customer) {
        account.customerObject = customer;
        return account.save().then(function() {
            return account.customerObject;
        });
    });
};

exports.removePaymentMethod = function(account) {
    return stripe.customers.deleteCard(
        account.customerObject.id,
        account.paymentMethod.id
    ).then(function() {
        return stripe.customers.retrieve(account.customerObject.id)
            .then(function(customer) {
                account.customerObject = customer;
                account.paymentMethod = null;
                return account.save();
            });
    });
};

exports.createAccountConnection = function(authUserId, accountType, accountHolder) {
    return StripeAccountConnection.create({
        accountCreator: authUserId,
        accountType: accountType,
        accountHolder: accountHolder
    }).then(function(connectionRequest) {
        return stripeConnectAccountHref + '?' + qs.stringify({
            client_id: STRIPE_CLIENT_ID,
            response_type: 'code',
            scope: 'read_write',
            state: connectionRequest.id,
            redirect_uri: STRIPE_REDIRECT_URI || null
        });
    });
};

exports.connectAccount = function(authUserId, code, state) {
    return StripeAccountConnection.findOne({
        _id: state,
        accountCreator: {
            $eq: authUserId
        }
    }).then(function(account) {

        if (!account) {
            return Promise.reject({
                code: 404,
                status: 404,
                message: 'Not Found'
            });
        }

        return exports.verifyUserCanAccessAccount(authUserId, account)
            .then(function(hasAccess) {
                if (hasAccess) {
                    return Promise.all([
                        account,
                        authorizeAccount()
                    ]);
                } else {
                    return Promise.reject({
                        code: 403,
                        status: 403,
                        message: 'Forbidden'
                    });
                }
            });

        //////////////
        // helpers
        //////////////

        function authorizeAccount() {
            return new Promise(function(resolve, reject) {
                request.post(stripeOAuthTokenHref, {
                    form: {
                        code: code,
                        grant_type: 'authorization_code',
                        client_id: process.env.STRIPE_CLIENT_ID,
                        client_secret: process.env.STRIPE_API_KEY
                    }
                }, function(err, response, body) {
                    if (!err && response.statusCode == 200) {
                        getStripeAccount(JSON.parse(body)).then(resolve, reject);
                    } else {
                        reject(err);
                    }
                });
            });
        }

        function getStripeAccount(auth) {
            return stripe.accounts.retrieve(auth.stripe_user_id)
                .then(function(account) {
                    return {
                        auth,
                        account
                    };
                });
        }

    }).then(function([connectAccount, stripeData]) {

        return StripeAccountConnection.remove({
            _id: connectAccount._id
        }).then(function() {
            return StripeAccount.create({
                accountType: connectAccount.accountType,
                accountHolder: connectAccount.accountHolder,
                accountCreator: connectAccount.accountCreator,
                auth: stripeData.auth,
                account: stripeData.account
            });

        });

    }).then(function(stripeAccount) {
        const Model = stripeAccount.accountType === 'Business' ?
            Business : User;

        // Attach the stripe account to the account holders
        // model ( Business or User )
        Model.update({
            _id: stripeAccount.accountHolder
        }, {
            stripeAccount: stripeAccount._id
        }, function(err) {
            if (err) console.error(`Failed to update ${ stripeAccount.accountType } ` +
                `${ stripeAccount.accountHolder } account with stripeAccount`, err);
        });

        return stripeAccount;
    });
};


exports.disconnectAccount = function(authUserId, code, state) {
    return StripeAccount.findOne({
        _id: state,
        accountCreator: {
            $eq: authUserId
        }
    }).then(function(account) {

        return StripeAccount.remove({
            _id: account._id
        }).then(function() {
            const Model = account.accountType === 'Business' ?
            Business : User;

            Model.update({
                _id: account.accountHolder
            }, {
                stripeAccount: null
            }, function(err) {
                if (err) console.error(`Failed to update ${ account.accountType } ` +
                    `${ account.accountHolder } account with stripeAccount`, err);
            });

            return account;

        });
    });
};


exports.createDirectCustomerCharge = function(account, amount) {
    // amount should allows be in cents
    return stripe.charges.create({
        amount: amount,
        currency: "usd",
        customer: account.customerObject.id
    });
};

exports.createDirectCustomerChargeWithFee = function(account, payAccount, amount, fee) {
    // amount should allows be in cents
    return stripe.charges.create({
        amount: amount,
        currency: "usd",
        customer: account.customerObject.id,
        destination: {
            amount: amount - fee,
            account: payAccount.id
        }
    });
};

exports.refundDirectCustomerCharge = function(charge) {
    return stripe.refunds.create({
        charge: charge
    });
};