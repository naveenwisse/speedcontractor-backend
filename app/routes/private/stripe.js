'use strict';

const express = require('express');
const stripeAccountService = require('pp/services/stripe');
const authMiddleware = require('pp/routes/middleware/auth');
const { validate } = require('pp/routes/middleware/validate');

const router = module.exports = express.Router();
router.use(authMiddleware.authRequired);

/**
 * Middleware that requires an account for the route.
 * Bail & 404 when an account is not found
 */
const sansAccount404s = (req, res, next) => {
    if (req.account) {
        next();
    } else {
        // No account
        // https://httpstatuses.com/404
        res.status(404).end();
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
const validateAccountRequestAndCheckUserAccess = (req, res, next) => {
    const authUserId = req.authUserId;
    const accountId = locateParam(req, 'accountId');
    const accountType = locateParam(req, 'accountType');
    const accountHolder = locateParam(req, 'accountHolder');

    process.stdout.write(`\n\n##got request for stripe account validation, request body is ${JSON.stringify(req.body, null, 2)}\n\n`);



    if (accountId) {
        stripeAccountService
            .findAccount({ _id: accountId })
            .then(handleFindAccount)
            .catch(error => {
                process.stdout.write(`\n\n!!account find errored with ${error}\n\n`);
                return next(error);
            });
    } else if (accountType && accountHolder) {
        stripeAccountService
            .findAccount({ accountType, accountHolder })
            .then(handleFindAccount)
            .catch(error => {
                process.stdout.write(`\n\n!!account find errored with ${error}\n\n`);
                return next(error);
            });
    } else {
        // This shouldn't actually happen. Hitting this endpoint without
        // an account id or type and holder would be confusing..
        // 400 Bad Request
        // https://httpstatuses.com/400
        res.status(400).end();
    }

    function handleFindAccount(account) {
        process.stdout.write(`\n\n**Handle find account called, account is ${JSON.stringify(account, null, 2)}\n\n`);
        if (account) {
            stripeAccountService
                .verifyUserCanAccessAccount(authUserId, account)
                .then(function(hasAccess) {
                    if (hasAccess) {
                        req.account = account;
                        // Move along now
                        next();
                    } else {
                        // Not your account bruh, 401 Unauthorized
                        // NOTE: this will sign people out for being sketchy
                        // https://httpstatuses.com/401
                        res.status(401).end();
                    }
                }, next);
        } else {
            next();
        }
    }

    function locateParam(req, param) {
        return req.params[param] ||
               req.query[param] ||
               req.body[param];
    }
};

/**
 * @api {post} /api/stripe/confirm
 * @apiDescription Confirm an account connection, creating
 *                 an actual account if the connection is valid.
 *                 The confirmation must be performed by the same user
 *                 that initiated the connection within 30 minutes of
 *                 when they started.
 * @apiParam {string} code Stripe code used to confirm / authorize account
 * @apiParam {MongoId} state Id of the stripe account connection
 */
router.post('/confirm', validate({
    code: {
        in: 'body',
        notEmpty: true
    },
    state: {
        in: 'body',
        isMongoId: true
    }
}), function(req, res, next) {
    process.stdout.write(`stripe confirm endpoint called, `);

    stripeAccountService.connectAccount(
        req.authUserId,
        req.body.code,
        req.body.state
    ).then(function(ret) {
        res.json(ret);
    }).catch(next);

});

/**
 * HEADS UP: Routes defined beyond this point will require
 * & validate params accountId, accountType, and accountHolder.
 *
 *   400 Bad Request is terminal
 *   401 Unauthorized is terminal
 *   404 Not Found will pass through
 */
router.use(validate({
    accountId: {
        in: 'any',
        optional: true,
        isMongoId: true
    },
    accountType: {
        in: 'any',
        optional: true,
        matches: {
            options: [/Business|User/]
        }
    },
    accountHolder: {
        in: 'any',
        optional: true,
        isMongoId: true
    }
}), validateAccountRequestAndCheckUserAccess);

/**
 * @api {get} /api/stripe
 * @apiDescription Get stripe account
 */
router.get('/', function(req, res) {
    const account = req.account;
    if (account) {
        res.json(account);
    } else {
        // Valid request, no account
        // 404 Not Found
        // https://httpstatuses.com/404
        res.status(404).end();
    }
});

/**
 * @api {post} /api/stripe/connect
 * @apiDescription Creates a stripe account connection, which is the
 *                 first step in actually creating an account. Once the
 *                 connection is confirmed an account can be created.
 *                 The connection is valid for 30 minutes and can only be
 *                 confirmed by the user that started the process.
 * @apiParam {string} accountType Type of account to create. can be Business or User
 * @apiParam {MongoId} accountHolder Id of the account owner, can be a business id or user id
 */
router.post('/connect', validate({
    accountType: {
        in: 'body',
        matches: {
            options: [/Business|User/]
        }
    },
    accountHolder: {
        in: 'body',
        isMongoId: true
    }
}), function(req, res, next) {

    stripeAccountService.createAccountConnection(
        req.authUserId,
        req.body.accountType,
        req.body.accountHolder
    ).then(function(connectAccountHref) {
        res.json({
            connectAccountHref
        });
    }).catch(next);

});

/**
 * @api {post} /api/stripe/disconnect
 * @apiDescription Remove a stripe account connection, which is the
 *                 first step in actually creating an account. Once the
 *                 connection is confirmed an account can be removed.
 *                 The connection is valid for 30 minutes and can only be
 *                 confirmed by the user that started the process.
 * @apiParam {string} accountType Type of account to create. can be Business or User
 * @apiParam {MongoId} accountHolder Id of the account owner, can be a business id or user id
 */
router.post('/disconnect', validate({
    accountType: {
        in: 'body',
        matches: {
            options: [/Business|User/]
        }
    },
    accountId: {
        in: 'body',
        isMongoId: true
    }
}), function(req, res, next) {

    stripeAccountService.disconnectAccount(
        req.authUserId,
        req.body.accountType,
        req.body.accountId
    ).then(function(connectAccountHref) {
        res.json({
            connectAccountHref
        });
    }).catch(next);

});

/**
 * HEADS UP: Routes defined beyond this point will 404 if an
 * account is not found given an accountId or accountHolder + accountType
 */
router.use(sansAccount404s);

/**
 * @api {post} /api/stripe/addPaymentMethod
 * @apiDescription
 * @apiParam {MongoId} accountId Id of the account to add a payment method for
 * @apiParam {Object} paymentToken Payment token object containing the card information that
 *                                 will be saved & used to create a Customer
 */
router.post('/addPaymentMethod', validate({
    paymentToken: {
        in: 'body',
        notEmpty: true
    }
}), function(req, res, next) {

    const { account } = req;
    const { paymentToken } = req.body;

    stripeAccountService
        .addPaymentMethodFromPaymentToken(account, paymentToken)
        .then(data => res.json(data) )
        .catch(next);

});

/**
 * @api {post} /api/stripe/removePaymentMethod
 * @apiDescription Removes the default payment method from a stripe account
 * @apiParam {MongoId} accountId Id of the account to remove a payment method from
 */
router.post('/removePaymentMethod', function(req, res, next) {

    const { account } = req;

    stripeAccountService
        .removePaymentMethod(account)
        .then(data => res.json(data) )
        .catch(next);

});
