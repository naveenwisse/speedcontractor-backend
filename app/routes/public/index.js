'use strict';

const util = require('util');
const async = require('async');
const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const mandrill = require('node-mandrill')('qyWPKiR-JFh40H3U4m6O6A');
const routeService = require('../../services/route-service');
const RateLimit = require('express-rate-limit');
const { validate } = require('pp/routes/middleware/validate');
const notificationService = require('pp/services/notification');

const router = express.Router();
module.exports = router;

router.use(require('./competition'));

// Ratelimit API signup calls to 10 per 15min window without delay
const rateLimitSignup = new RateLimit({
    // 15 minutes
    windowMs: 15 * 60 * 1000,
    // Start blocking after 10 requests
    max: 10,
    // Full speed until the limit is reached
    delayMs: 0,
    // A useful message to go along with the rejection
    message: 'Too many accounts created from this IP, please try again after an hour'
});

// Ratelimit API login calls to 10 per 15min window without delay
const rateLimitLogin = new RateLimit({
    // 15 minutes
    windowMs: 15 * 60 * 1000,
    // Start blocking after 10 requests
    max: 10,
    // Full speed until the limit is reached
    delayMs: 0,
    // A useful message to go along with the rejection
    message: "Too many login attempts from this IP, please try again after an hour"
});

router.post('/login', rateLimitLogin, validate({
    email: {
        in: 'body',
        isEmail: true
    },
    password: {
        in: 'body',
        isPassword: true
    }
}), function(req, res) {
    _handleLogin('planted', req, res);
});

router.post('/loginFacebook', rateLimitLogin, validate({
    token: {
        in: 'body',
        notEmpty: true
    }
}), function(req, res) {
    _handleLogin('facebook', req, res);
});

function _handleLogin(provider, req, res) {
    let loginProviderFn;

    switch (provider) {
        case 'planted':
            loginProviderFn = routeService.login;
            break;
        case 'facebook':
            loginProviderFn = routeService.loginFacebook;
            break;
    }

    loginProviderFn(req, function(err, user) {
        if (err) {
            res.status(500).send({
                success: false,
                message: err
            });
        } else if (!user) {
            res.status(404).send({
                success: false,
                message: 'No user found.'
            });
        } else {

            var token = jwt.sign({
                _id: user._id
            }, process.env.SECRET, {
                expiresIn: 3600 // expires in 30 minutes
            });

            console.log(`${ provider } login success!`);
            const authUser = {
                _id: user._id,
                slug: user.slug,
                name: user.name,
                email: user.email,
                birthday: user.birthday,
                positions: user.positions.map(o => o.title),
                businesses: user.businesses,
                image: user.image,
                coverImage: user.coverImage,
                loc: user.loc,
                roles: user.roles
            };
            // this is totally cheating but we can handle
            // the duplication.. We stuff it into storage and it
            // is not that many bytes
            authUser.personas = user.businesses
                // Kick out pending for personas
                .filter(b => !b.pending)
                // rewrite `companyName` to `name`
                // add isBusiness flag
                .map(b => {
                    return {
                        _id: b._id,
                        isBusiness: true,
                        slug: b.slug,
                        name: b.companyName,
                        image: b.image
                    };
                });

            // Add the user to the personas. Makes shit easier
            authUser.personas.unshift({
                _id: user._id,
                isUser: true,
                slug: user.slug,
                name: user.name,
                image: user.image
            });

            res.set('x-access-token', token);
            res.json(authUser);
        }

    });
}

router.post('/signup', rateLimitSignup, validate({
    name: {
        in: 'body',
        notEmpty: true
    },
    email: {
        in: 'body',
        isEmail: true
    },
    password: {
        in: 'body',
        isPassword: true
    },
    birthday: {
        in: 'body',
        isDate: true
    }
}), function(req, res) {
    _handleSignup('planted', req, res);
});

router.post('/signupFacebook', rateLimitSignup, validate({
    token: {
        in: 'body',
        notEmpty: true
    },
    name: {
        in: 'body',
        notEmpty: true
    },
    email: {
        in: 'body',
        isEmail: true
    },
    birthday: {
        in: 'body',
        isDate: true
    }
}), function(req, res) {
    _handleSignup('facebook', req, res);
});

function _handleSignup(provider, req, res) {
    let signupProviderFn;

    switch (provider) {
        case 'planted':
            signupProviderFn = routeService.signup;
            break;
        case 'facebook':
            signupProviderFn = routeService.signupFacebook;
            break;
    }

    const emailConfirmToken = crypto.randomBytes(20).toString('hex');
    req.body.emailConfirmToken = emailConfirmToken;

    async.waterfall([function(done) {

        signupProviderFn(req.body, function(err, user) {
            if (err) {
                console.log(err);
                if (err.code === 11000) {
                  res.status(500).send({
                    success: false,
                    code: err.code,
                    message: `Duplicate key error collection for provider "${ provider }" - error`
                  });
                } else {
                  res.status(500).send({
                    success: false,
                    message: `Unable to create user for provider "${ provider }" - error`
                  });
                }
            } else if (!user) {
                res.status(400).send({
                    success: false,
                    message: `Unable to create user for provider "${ provider }" - no user returned`
                });
            } else {
                console.log(`Successfuly created user for provider "${ provider }"`);
                if (req.body.token) {
                    user.token = req.body.token;
                    routeService.addCompetition(user);
                }
                done(null, user);
            }
        });

    }, function(user, done) {

        mandrill('/messages/send', {
            "message": {
                "text": 'You are receiving this because you have signed up for an account with Speed Contractor.\n\n' +
                    'Please click on the following link, or paste this into your browser to confirm your email address:\n\n' +
                    'https://www.speedcontractor.com/confirm/' + user.emailConfirmToken + '/\n\n' +
                    'If you did not sign up for Speed Contractor, please ignore this email.\n',
                "subject": 'Please confirm your email (' + user.email + ') - Speed Contractor',
                "from_email": "do-not-reply@speedcontractor.com",
                "from_name": "Speed Contractor",
                "to": [{
                    "email": user.email,
                    "name": user.name,
                    "type": "to"
                }],
                "tags": [
                    "confirm-email"
                ],
                "google_analytics_domains": [
                    "www.speedcontractor.com"
                ],
                "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                "metadata": {
                    "website": "www.speedcontractor.com"
                }
            }
        }, function(err) {
            if (err) {
                res.status(400).send({
                    success: false,
                    message: 'Failed to send email.'
                });
            } else {
                done(null, user);
            }
        });

    }, function(user) {

        var token = jwt.sign({
            _id: user._id
        }, process.env.SECRET, {
            expiresIn: 3600 // expires in 30 minutes
        });

        console.log(`${ provider } signup success!`);

        const authUser = {
            _id: user._id,
            slug: user.slug,
            name: user.name,
            email: user.email,
            birthday: user.birthday,
            positions: [],
            businesses: [],
            personas: [],
            image: user.image,
            coverImage: user.coverImage,
            loc: user.loc,
        };

        // Add the user to the personas. Makes shit easier
        authUser.personas.unshift({
            _id: user._id,
            isUser: true,
            name: user.name,
            slug: user.slug,
            image: user.image
        });

        res.set('x-access-token', token);
        res.json(authUser);

    }], function(err) {
        console.log('facebook signup error', err);
        return res.status(500).send({
            success: false,
            message: 'Failed to create user.'
        });
    });

}

router.post('/confirmEmail', function(req, res) {
    req
        .checkBody('token', 'Invalid token')
        .notEmpty()
        .withMessage('Token is required.')
        .isAlphanumeric();
    var errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }
    async.waterfall([
        function(done) {
            routeService.confirmEmail(req, function(err, user) {
                if (err) {
                    res.status(500).send({
                        success: false,
                        message: 'An error has occurred confirming your email.'
                    });
                } else if (!user) {
                    res.status(400).send({
                        success: false,
                        message: 'Unable to find a user to confirm, or the user has already been confirmed.'
                    });
                } else {
                    console.log('User email confirmed in database');
                    done(null, user);
                }
            });
        },
        function(user) {
            mandrill('/messages/send', {
                "message": {
                    "text": 'Hello,\n\n' +
                        'Welcome to Speed Contractor, you can login to your account at the link below to get started.\n\n' +
                        'https://www.speedcontractor.com/login',
                    "subject": 'Welcome to Speed Contractor',
                    "from_email": "do-not-reply@speedcontractor.com",
                    "from_name": "Speed Contractor",
                    "to": [{
                        "email": user.email,
                        "name": user.name,
                        "type": "to"
                    }],
                    "tags": [
                        "welcome"
                    ],
                    "google_analytics_domains": [
                        "www.speedcontractor.com"
                    ],
                    "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                    "metadata": {
                        "website": "www.speedcontractor.com"
                    }
                }
            }, function(err, response) {
                //uh oh, there was an error
                if (err) {
                    console.log(JSON.stringify(err));
                    return res.status(400).send({
                        success: false,
                        message: 'Failed to send confirmation email.'
                    });
                }
                console.log(response);
                res.json({
                    success: true,
                    message: 'Success! Your email has been confirmed.'
                });

            });
        }
    ], function(err) {
        console.log(err);
        return res.status(500).send({
            success: false,
            message: 'Failed to confirm email.'
        });
    });
});

router.post('/forgot', function(req, res) {
    req
        .checkBody('email', 'Invalid email.')
        .notEmpty()
        .withMessage('Email is required.')
        .isEmail();
    var errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done) {
            req.body.token = token;

            routeService.forgot(req, function(err, user) {
                if (!user) {
                    console.log(err);
                    return res.status(400).send({
                        success: false,
                        message: 'No account with that email address exists.'
                    });
                }
                if (err) {
                    console.log(err);
                    return res.status(500).send({
                        success: false,
                        message: 'An error occurred while looking for that user.'
                    });
                }

                console.log('Reset token/expire set');
                done(err, token, user);

            });

        },
        function(token, user) {
            mandrill('/messages/send', {
                "message": {
                    "text": 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                        'https://www.speedcontractor.com/reset/' + token + '\n\n' +
                        'If you did not request this, please ignore this email and your password will remain unchanged.\n',
                    "subject": 'Password Reset - Speed Contractor',
                    "from_email": "do-not-reply@speedcontractor.com",
                    "from_name": "Speed Contractor",
                    "to": [{
                        "email": user.email,
                        "name": user.name,
                        "type": "to"
                    }],
                    "tags": [
                        "password-reset"
                    ],
                    "google_analytics_domains": [
                        "www.speedcontractor.com"
                    ],
                    "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                    "metadata": {
                        "website": "www.speedcontractor.com"
                    }
                }
            }, function(err, response) {
                //uh oh, there was an error
                if (err) {
                    console.log(JSON.stringify(err));
                    return res.status(400).send({
                        success: false,
                        message: 'Failed to send email.'
                    });
                }
                console.log(response);
                res.json({
                    success: true,
                    message: 'An e-mail has been sent to ' + user.email + ' with further instructions.'
                });

            });
        }
    ], function(err) {
        console.log(err);
        return res.status(500).send({
            success: false,
            message: 'Failed to reset password.'
        });
    });
});

router.post('/reset', function(req, res) {
    req
        .checkBody('token', 'Invalid token')
        .notEmpty()
        .withMessage('Token is required.')
        .isAlphanumeric();
    req
        .checkBody('password', 'Invalid password.\n Must be 4-14 characters long and must contain at least one letter, one number.\nThe characters $,@,!,%,*,#,?,& are also permitted, but not required.')
        .notEmpty()
        .withMessage('Password is required.')
        .isPassword();
    var errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }
    async.waterfall([
        function(done) {
            routeService.reset(req, function(err, user) {
                if (!user) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: 'Password reset token is invalid or has expired.'
                    });
                }
                if (err) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: 'An error has occurred updating your password.'
                    });
                }

                console.log('Password reset in database');
                done(err, user);

            });
        },
        function(user) {
            mandrill('/messages/send', {
                "message": {
                    "text": 'Hello,\n\n' +
                        'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n',
                    "subject": 'Your password has been changed - Speed Contractor',
                    "from_email": "do-not-reply@speedcontractor.com",
                    "from_name": "Speed Contractor",
                    "to": [{
                        "email": user.email,
                        "name": user.name,
                        "type": "to"
                    }],
                    "tags": [
                        "password-changed"
                    ],
                    "google_analytics_domains": [
                        "www.speedcontractor.com"
                    ],
                    "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                    "metadata": {
                        "website": "www.speedcontractor.com"
                    }
                }
            }, function(err, response) {
                //uh oh, there was an error
                if (err) {
                    console.log(JSON.stringify(err));
                    return res.status(400).send({
                        success: false,
                        message: 'Failed to send email.'
                    });
                }
                console.log(response);
                res.json({
                    success: true,
                    message: 'Success! Your password has been changed.'
                });

            });
        }
    ], function(err) {
        console.log(err);
        return res.status(500).send({
            success: false,
            message: 'Failed to reset password.'
        });
    });
});


router.get('/notificationtest', function(req, res) {
    const params = {
        htmlParams : { name: 'Sergio' },
        to: 'sergio.baldani+1992@gmail.com'
    };
    notificationService.notify(notificationService.notifyTypes.test, params);
    return res.status(200).send({
        success: true,
        message: 'Ready'
    });
})