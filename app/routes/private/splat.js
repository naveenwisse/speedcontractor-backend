'use strict';

const util = require('util');
const crypto = require('crypto');
const querystring = require('querystring');
const async = require('async');
const jwt = require('jsonwebtoken');
const express = require('express');
const moment = require('moment');
const mandrill = require('node-mandrill')('qyWPKiR-JFh40H3U4m6O6A');
const RateLimit = require('express-rate-limit');
const aws = require('pp/config/aws');
const routeService = require('pp/services/route-service');
const priceService = require('pp/services/prices');
const authMiddleware = require('pp/routes/middleware/auth');
const validateMiddleware = require('pp/routes/middleware/validate');
const validateBody = validateMiddleware.body;

// Ratelimit API calls to 3000 per 15min window without delay
const rateLimitApi = new RateLimit({
    // 15 minutes
    windowMs: 15 * 60 * 1000,
    // Start blocking after 3000 requests
    max: 3000,
    // Full speed until the limit is reached
    delayMs: 0,
    // A useful message to go along with the rejection
    message: "Too many API requests from this IP, please try again after an hour"
});

const router = module.exports = express.Router();
router.use(rateLimitApi);

// ---------------------------------------------------------
// route middleware to authenticate and check token
// ---------------------------------------------------------
router.use(authMiddleware.authRequired);

// ---------------------------------------------------------
// authenticated routes
// ---------------------------------------------------------
router.get('/', function (req, res) {
    res.json({
        message: 'Welcome to the coolest API on earth!'
    });
});

// refresh token
router.post('/getPrices', validateBody({
    priceType: {
        in: 'body',
        notEmpty: true,
        matches: {
            options: [/competition|tasting/]
        }
    }
}), function (req, res) {
    res.json({
        prices: priceService.getPrices(req.body.priceType)
    });
});

// refresh token
router.post('/authRefresh', function (req, res) {
    var token = jwt.sign({
        _id: req.authUserId
    }, process.env.SECRET, {
            expiresIn: 3600 // expires in 1 hour
        });

    console.log('refresh succeeded');
    res.set('x-access-token', token);
    res.json({
        success: true,
        message: 'Enjoy your token!'
    });
});

router.post('/regBus', function (req, res) {
    req
        .checkBody('email', 'Invalid email.')
        .notEmpty()
        .withMessage('Email is required.')
        .isEmail();
    req
        .checkBody('companyName', 'Company name is required.')
        .notEmpty();
    var errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }
    async.waterfall([
        function (done) {
            routeService.registerBusiness(req, function (err, business) {
                if (err) {
                    console.log(err);
                    return res.status(500).send({
                        success: false,
                        message: 'An error occurred while attempting to register the business'
                    });
                }

                console.log('Business created successfully');
                done(null, business);
            });
        },
        function (business) {
            const internalQueryString = querystring.stringify({
                id: business.id,
                token: business.emailConfirmToken
            });
            const verificationUrl = `${process.env.SERVER_NAME}/acceptBus?${internalQueryString}`;

            const recipients = process.env.APPROVAL_EMAILS.split(',').map(entry => Object.assign({}, {
                'email': entry,
                'name': 'Speed Contractor',
                'type': 'cc'
            }));
            recipients.push({
                "email": `${process.env.INFO_EMAIL}`,
                "name": "Speed Contractor",
                "type": "to"
            });
            mandrill('/messages/send', {
                "message": {
                    "text": 'You are receiving this because (' + business.email + ') has requested to create a business (' + business.companyName + ').\n\n' +
                        'Please click on the following link, or paste this into your browser to complete the process after you have verified:\n\n' +
                        verificationUrl + '\n',
                    "subject": 'Business Request - Speed Contractor',
                    "from_email": "do-not-reply@speedcontractor.com",
                    "from_name": "Speed Contractor",
                    "to": recipients,
                    "tags": [
                        "business-request"
                    ],
                    "google_analytics_domains": [
                        "www.speedcontractor.com"
                    ],
                    "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                    "metadata": {
                        "website": "www.speedcontractor.com"
                    }
                }
            }, function (err) {
                //uh oh, there was an error
                if (err) {
                    return res.status(400).send({
                        success: false,
                        message: 'Failed to send email.'
                    });
                }
                res.json({
                    success: true,
                    business: business,
                    message: 'Business created and pending approval.'
                });

            });
        }
    ], function (err) {
        console.log(err);
        return res.status(500).send({
            success: false,
            message: 'Failed to reset password.'
        });
    });
});

router.post('/sendInvite', function (req, res) {
    req
        .checkBody('email', 'A valid email is required.')
        .notEmpty()
        .isEmail();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function (token, done) {
            req.body.token = token;

            routeService.sendInvite(req, function (err, invite) {
                if (!invite) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: 'No invite was created.'
                    });
                }
                if (err) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: 'An error occurred while creating the invite.'
                    });
                }

                console.log('Invite created.');
                done(err, token, invite);

            });

        },
        function (token, invite) {
            mandrill('/messages/send', {
                "message": {
                    "text": 'You have been invited to join the Speed Contractor Beta.\n\n' +
                        'Please click on the following link, or paste this into your browser to register:\n\n' +
                        'https://www.speedcontractor.com/register/' + invite.inviteToken + '\n',
                    "subject": 'You\'re Invited! - Speed Contractor',
                    "from_email": "do-not-reply@speedcontractor.com",
                    "from_name": "Speed Contractor",
                    "to": [{
                        "email": invite.inviteEmail,
                        "name": "New User",
                        "type": "to"
                    }],
                    "tags": [
                        "user-invite"
                    ],
                    "google_analytics_domains": [
                        "www.speedcontractor.com"
                    ],
                    "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                    "metadata": {
                        "website": "www.speedcontractor.com"
                    }
                }
            }, function (err, response) {
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
                    message: 'An e-mail has been sent to ' + invite.inviteEmail + ' with further instructions.'
                });

            });
        }
    ], function (err) {
        console.log(err);
        return res.status(500).send({
            success: false,
            message: 'Failed to send invite.'
        });
    });
});

router.post('/addEvent', function (req, res) {
    req
        .checkBody('title', 'Title is required.')
        .notEmpty();
    req
        .checkBody('type', 'Type is required.')
        .notEmpty();
    req
        .checkBody('description', 'Description is required.')
        .notEmpty();
    req
        .checkBody('endsAt', 'End date must be a valid date')
        .notEmpty()
        .withMessage('An end date is required.');
    req
        .checkBody('startsAt', 'Start date must be a valid date')
        .notEmpty()
        .withMessage('An start date is required.');
    req
        .checkBody('formattedAddress', 'Formatted Address is required.')
        .notEmpty();
    req
        .checkBody('geoLocation', 'A geolocation is required.')
        .notEmpty();
    req
        .checkBody('business', 'A valid business ID is required.')
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.addEvent(req, function (err, event) {
        if (!event) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Event not created.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add an event.'
            });
        }

        console.log('Event created successfully');
        res.json({
            success: true,
            message: 'Successfully added event!',
            event: event
        });

    });
});

/**
 * @api {post} /api/updateCompetitorScore
 * @apiDescription Update competitor score for competition
 * @apiParam {String} title
 * @apiParam {String} description
 * @apiParam {Object} loc
 * @apiParam {String} formattedAddress
 * @apiParam {MongoId} business
 * @apiParam {MongoId} eventId
 * @apiParam {Data} startsAt
 * @apiParam {Date} endsAt
 */
router.post('/editEvent', validateBody({
    title: {
        notEmpty: true
    },
    description: {
        notEmpty: true
    },
    loc: {
        notEmpty: true
    },
    formattedAddress: {
        notEmpty: true
    },
    business: {
        isMongoId: true
    },
    eventId: {
        isMongoId: true
    },
    startsAt: {
        notEmpty: true
    }
    ,
    endsAt: {
        notEmpty: true
    }
}), function (req, res) {
    routeService.editEvent(req, function (err, event) {
        if (!event) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Event not created.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to edit the event.'
            });
        }

        console.log('Event updated successfully');
        res.json({
            success: true,
            message: 'Successfully updated event.'
        });

    });
});

/**
 * @api {post} /api/getRatingResource
 * @apiDescription Get the resource to be rated with questions
 * @apiParam {MongoId} resourceId
 */
router.post('/getRatingResource', validateBody({
    resourceId: {
        isMongoId: true
    }
}), function (req, res) {
    routeService.getRatingResource(req, function (err, resource, questions) {
        if (err) {
            console.log(err);
            return res.status(403).send({
                success: false,
                message: 'An error occurred while retrieving the resource.'
            });
        }
        if (!resource) return res.status(404).send({
            success: false,
            message: 'Could not find the resource'
        });
        console.log('Resource retrieved successfully');
        res.json({
            success: true,
            message: 'Here is your resource',
            resource: resource,
            questions: questions
        });

    });
});

/**
 * @api {post} /api/addRating
 * @apiDescription Rate a user after completing a shift
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} userId
 * @apiParam {MongoId} resourceId
 * @apiParam {Array} ratings
 */
router.post('/addRating', validateBody({
    businessId: {
        isMongoId: true
    },
    userId: {
        isMongoId: true
    },
    resourceId: {
        isMongoId: true
    },
    ratings: {
        isArray: true
    }
}), function (req, res) {
    routeService.addRating(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Rating unable to be added.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add the rating.'
            });
        }

        console.log('Rating added successfully');
        res.json({
            success: true,
            message: 'Successfully added rating!'
        });

    });
});

/**
 * @api {post} /api/addRating2Business
 * @apiDescription Rate a user after completing a shift
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} userId
 * @apiParam {MongoId} resourceId
 * @apiParam {Array} ratings
 */
router.post('/addRating2Business', validateBody({
    // businessId: {
    //     isMongoId: true
    // },
    // userId: {
    //     isMongoId: true
    // },
    resourceId: {
        isMongoId: true
    }
    // ,
    // rating_money: {
    //     isArray: true
    // }
}), function (req, res) {
    routeService.addRating2Business(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Business review unable to be added.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add the business review.'
            });
        }

        console.log('Business review added successfully');
        res.json({
            success: true,
            message: 'Successfully added Business review!'
        });

    });
});
router.post('/addExperience', validateBody({
    title: {
        notEmpty: true
    },
    from: {
        notEmpty: true
    },
    to: {
        notEmpty: true
    },
    employer: {
        notEmpty: true
    },
    business: {
        optional: true,
        isMongoId: true
    }
}), function (req, res) {
    routeService.addExperience(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Profile unable to be added.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add the position.'
            });
        }

        console.log('Position created successfully');
        res.json({
            success: true,
            message: 'Successfully added position!'
        });

    });
});

router.post('/removeExperience', validateBody({
    _id: {
        isMongoId: true
    }
}), function (req, res) {
    routeService.removeExperience(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that position in the database.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add the position.'
            });
        }

        console.log('Position removed successfully');
        res.json({
            success: true,
            message: 'Successfully removed position!'
        });

    });
});

router.post('/acceptEmployee', validateBody({
    employeeId: {
        isMongoId: true
    },
    businessId: {
        isMongoId: true
    },
    userId: {
        isMongoId: true
    }
}), function (req, res) {
    routeService.acceptEmployee(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that employee in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to accept the employee.'
            });
        }

        console.log('Employee updated successfully');
        res.json({
            success: true,
            message: 'Successfully approved employee!'
        });

    });
});

router.post('/declineEmployee', validateBody({
    employeeId: {
        isMongoId: true
    },
    businessId: {
        isMongoId: true
    }
}), function (req, res) {
    routeService.declineEmployee(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that employee in the database.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add the employee.'
            });
        }

        console.log('Employee declined successfully');
        res.json({
            success: true,
            message: 'Successfully declined employee!'
        });

    });
});

router.post('/addEducation', function (req, res) {
    req
        .checkBody('state', 'State is required.')
        .notEmpty();
    req
        .checkBody('city', 'City is required.')
        .notEmpty();
    req
        .checkBody('endDate', 'End date is required.')
        .notEmpty();
    req
        .checkBody('startDate', 'Start date is required.')
        .notEmpty();
    req
        .checkBody('studied', 'Course/major is required.')
        .notEmpty();
    req
        .checkBody('schoolName', 'School name is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.addEducation(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Education unable to be added.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add education.'
            });
        }

        console.log('Education added successfully');
        res.json({
            success: true,
            message: 'Successfully added position!'
        });

    });
});

router.post('/removeEducation', function (req, res) {
    req
        .checkBody('_id', 'ID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.removeEducation(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that education information in the database.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to remove the education information.'
            });
        }

        res.json({
            success: true,
            message: 'Successfully removed education information!'
        });

    });
});

router.post('/addSkill', validateBody({
    type: {
        notEmpty: true
    },
    yearsProficiency: {
        isInt: {
            options: [{
                min: 0
            }]
        }
    }
}), function (req, res) {
    routeService.addSkill(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Skill unable to be added.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to addskill.'
            });
        }

        console.log('Skill added successfully');
        res.json({
            success: true,
            message: 'Successfully added skill!'
        });

    });
});

router.post('/updateSkill', validateBody({
    _id: {
        isMongoId: true
    },
    type: {
        notEmpty: true
    },
    yearsProficiency: {
        isInt: {
            options: [{
                min: 0
            }]
        }
    }
}), function (req, res) {
    routeService.updateSkill(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that user in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to update the skill.'
            });
        }
        console.log('Skill updated successfully');
        res.json({
            success: true,
            message: 'Successfully updated skill!'
        });

    });
});

router.post('/removeSkill', validateBody({
    _id: {
        isMongoId: true
    }
}), function (req, res) {
    routeService.removeSkill(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that skill information in the database.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to remove the skill information.'
            });
        }

        res.json({
            success: true,
            message: 'Successfully removed skill information!'
        });

    });
});

router.post('/addJob', validateBody({
    title: {
        notEmpty: true
    },
    experience: {
        notEmpty: true
    }
}), function (req, res) {
    routeService.addJob(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Job unable to be added.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to add the job.'
            });
        }

        console.log('Job created successfully');
        res.json({
            success: true,
            message: 'Successfully added job!'
        });
    });
});

router.post('/getUserCalendar', function (req, res) {
    routeService.getUserCalendar(req, function (err, events) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while retrieving the events.'
            });
        }

        console.log('Events retrieved successfully');
        res.json({
            success: true,
            message: 'Here is the events in your calendar',
            events: events
        });

    });
});

router.post('/getBusinessCalendar', validateBody({
    businessId: {
        isMongoId: true
    },
}), function (req, res) {
    routeService.getBusinessCalendar(req, function (err, events) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while retrieving the events.'
            });
        }

        console.log('Events retrieved successfully');
        res.json({
            success: true,
            message: 'Here is the events in your calendar',
            events: events
        });

    });
});

router.post('/getUserEvents', function (req, res) {
    routeService.getUserEvents(req, function (err, user) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while retrieving the events.'
            });
        }

        console.log('Events retrieved successfully');
        res.json({
            success: true,
            message: 'Here is the events for this user',
            events: user.events
        });

    });
});

router.post('/applyResource', function (req, res) {
    req
        .checkBody('resourceId', 'ResourceID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.applyResource(req, function (err, resource) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: err
            });
        }
        if (!resource) {
            return res.status(400).send({
                success: false,
                message: 'Unable to find the resource to apply.'
            });
        }

        console.log('User applied successfully');
        res.json({
            success: true,
            message: 'User applied Successfully'
        });

    });
});

router.post('/applyResourcejob', function (req, res) {
    req
        .checkBody('resourceId', 'ResourceID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.applyResourceJob(req, function (err, resource) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: err
            });
        }
        if (!resource) {
            return res.status(400).send({
                success: false,
                message: 'Unable to find the resource to apply.'
            });
        }

        console.log('User applied successfully');
        res.json({
            success: true,
            message: 'User applied Successfully'
        });

    });
});



router.post('/updateName', function (req, res) {
    req
        .checkBody('name', 'Name is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.updateName(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that user in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to update the name.'
            });
        }

        console.log('Name updated successfully');
        res.json({
            success: true,
            message: 'Successfully updated name!'
        });

    });
});

router.post('/updateOccupation', function (req, res) {
    req
        .checkBody('occupation', 'Occupation is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.updateOccupation(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that user in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to update the occupation.'
            });
        }

        console.log('Occupation updated successfully');
        res.json({
            success: true,
            message: 'Successfully updated occupation!'
        });

    });
});

router.post('/updateEducation', function (req, res) {
    req
        .checkBody('_id', 'ID is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('state', 'State is required.')
        .notEmpty();
    req
        .checkBody('city', 'City is required.')
        .notEmpty();
    req
        .checkBody('endDate', 'End date is required.')
        .notEmpty();
    req
        .checkBody('startDate', 'Start date is required.')
        .notEmpty();
    req
        .checkBody('studied', 'Course/major is required.')
        .notEmpty();
    req
        .checkBody('schoolName', 'School name is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.updateEducation(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that user in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to update the education.'
            });
        }

        console.log('Education updated successfully');
        res.json({
            success: true,
            message: 'Successfully updated education!'
        });

    });
});

router.post('/updateAddress', function (req, res) {
    req
        .checkBody('address1', 'Address is required.')
        .notEmpty();
    req
        .checkBody('city', 'City is required.')
        .notEmpty();
    req
        .checkBody('regionId', 'Region is required.')
        .notEmpty();
    req
        .checkBody('postalCode', 'Postal code is required.')
        .notEmpty();
    req
        .checkBody('businessId')
        .optional()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.updateAddress(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: err === 'Request failed' ? 'Unable to verify physical address.' : 'Unable to find that user in the database.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to update the address.'
            });
        }

        console.log('Address updated successfully');
        res.json({
            success: true,
            message: 'Successfully updated address!'
        });

    });
});

router.post('/full-gallery', function (req, res) {
    routeService.getFullGallery(req.body.businessId, function (err, gallery) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error ocurred while attempting get full gallery'
            });
        }
        return res.json({
            success: true,
            message: 'Full gallery',
            gallery,
        });
    });
});
//
router.post('/remove-photo-gallery', function (req, res) {
    routeService.removePhotoGallery(req.body.id, req.body.photo, function (err, photo) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error ocurred while attempting remove photo'
            });
        }
        return res.json({
            success: true,
            message: 'Photo removed',
            photo
        });
    });
});
//
router.post('/remove-video-gallery', function (req, res) {
    routeService.removeVideoGallery(req.body.id, req.body.video, function (err, photo) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error ocurred while attempting remove photo'
            });
        }
        return res.json({
            success: true,
            message: 'Video removed',
            photo
        });
    });
});
router.post('/updatePhone', function (req, res) {
    req
        .checkBody('mobilePhone', 'Phone is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.updatePhone(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: err === 'Request failed' ? 'Unable to verify physical Phone.' : 'Unable to find that user in the database.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while attempting to update the Phone.'
            });
        }

        console.log('Phone updated successfully');
        res.json({
            success: true,
            message: 'Successfully updated Phone!'
        });

    });
});

router.post('/video-gallery-upload', function (req, res) {
    req
        .checkBody('_id', 'Entity id is required.')
        .isMongoId();
    req
        .checkBody('type', 'Type is required.')
        .notEmpty();
    req
        .checkBody('filename', 'File name is required.')
        .notEmpty();
    req
        .checkBody('encodedFilename', 'Encoded filename is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    var s3Url = 'https://' + aws.bucket + '.s3.amazonaws.com';
    var request = req.body;
    var fileName = request.filename;
    var path = 'gallery-video/' + request.businessId + '/' + fileName;
    var readType = 'private';
    var expiration = moment().add(5, 'm').toDate(); //15 minutes

    var s3Policy = {
        'expiration': expiration,
        'conditions': [{
            'bucket': aws.bucket
        },
        ['starts-with', '$key', path], {
            'acl': readType
        }, {
            'success_action_status': '201'
        },
        ['starts-with', '$Content-Type', request.type],
        ['content-length-range', 0, 524288000], //min and max
        ]
    };

    var stringPolicy = JSON.stringify(s3Policy);
    var base64Policy = new Buffer(stringPolicy, 'utf-8').toString('base64');

    // sign policy
    var signature = crypto.createHmac('sha1', aws.secret)
        .update(new Buffer(base64Policy, 'utf-8')).digest('base64');

    var credentials = {
        url: s3Url,
        fields: {
            key: path,
            AWSAccessKeyId: aws.key,
            acl: readType,
            policy: base64Policy,
            signature: signature,
            'Content-Type': request.type,
            success_action_status: 201
        }
    };

    req.body.bucket = aws.bucket;
    routeService.updateVideoGallery(req, function (err, data) {
        if (!data) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that business in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to upload the photo.'
            });
        }

        console.log(request.imageType + ' photo updated successfully');
        res.json({
            credentials: credentials
        });

    });
});

router.post('/imageUpload', function (req, res) {
    req
        .checkBody('_id', 'Entity id is required.')
        .isMongoId();
    req
        .checkBody('type', 'Type is required.')
        .notEmpty();
    req
        .checkBody('filename', 'File name is required.')
        .notEmpty();
    req
        .checkBody('encodedFilename', 'Encoded filename is required.')
        .notEmpty();
    req
        .checkBody('imageType', 'Image type is required.')
        .notEmpty();
    req
        .checkBody('profileType', 'Profile type is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    var s3Url = 'https://' + aws.bucket + '.s3.amazonaws.com';
    var request = req.body;
    var fileName = request.filename;
    var path = request.profileType + '/' + request.imageType + '/' + fileName;
    if (request.businessId) // gallery case
        path = request.profileType + '/' + request.businessId + '/' + fileName;
    var readType = 'private';
    var expiration = moment().add(5, 'm').toDate(); //15 minutes

    var s3Policy = {
        'expiration': expiration,
        'conditions': [{
            'bucket': aws.bucket
        },
        ['starts-with', '$key', path], {
            'acl': readType
        }, {
            'success_action_status': '201'
        },
        ['starts-with', '$Content-Type', request.type],
        ['content-length-range', 0, 524288000], //min and max
        ]
    };

    var stringPolicy = JSON.stringify(s3Policy);
    var base64Policy = new Buffer(stringPolicy, 'utf-8').toString('base64');

    // sign policy
    var signature = crypto.createHmac('sha1', aws.secret)
        .update(new Buffer(base64Policy, 'utf-8')).digest('base64');

    var credentials = {
        url: s3Url,
        fields: {
            key: path,
            AWSAccessKeyId: aws.key,
            acl: readType,
            policy: base64Policy,
            signature: signature,
            'Content-Type': request.type,
            success_action_status: 201
        }
    };

    req.body.bucket = aws.bucket;
    routeService.updateImage(req, function (err, data) {
        if (!data) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that ' + request.profileType + ' in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to upload the photo.'
            });
        }

        console.log(request.imageType + ' photo updated successfully');
        res.json({
            credentials: credentials,
            image: data.image,
            coverImage: data.coverImage
        });

    });
});

router.post('/deleteImage', function (req, res) {
    req
        .checkBody('_id', 'Entity id is required.')
        .notEmpty();
    req
        .checkBody('imageType', 'Image type is required.')
        .notEmpty();
    req
        .checkBody('profileType', 'Profile type is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.deleteImage(req, function (err, data) {
        if (!data) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that ' + req.body.profileType + ' in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to delete the photo.'
            });
        }

        console.log(req.body.imageType + ' photo deleted successfully');
        res.json({
            success: true,
            message: req.body.imageType + ' photo deleted successfully',
            image: data.image,
            coverImage: data.coverImage
        });

    });
});



router.post('/confirmResend', function (req, res) {
    async.waterfall([
        function (done) {
            // returns a subset of user {
            //   name
            //   email
            //   emailConfirmToken
            // }
            routeService.getConfirmResendUser(req.authUserId, function (err, user) {
                if (!user) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: 'Unable to find a user.'
                    });
                }
                if (err) {
                    console.log(err);
                    return res.json({
                        success: false,
                        message: 'An error has occurred finding user.'
                    });
                }

                console.log('User found in database');
                done(err, user);

            });
        },
        function (user) {
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
                        "confirm-email-resend"
                    ],
                    "google_analytics_domains": [
                        "www.speedcontractor.com"
                    ],
                    "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                    "metadata": {
                        "website": "www.speedcontractor.com"
                    }
                }
            }, function (err) {
                if (err) {
                    res.status(400).send({
                        success: false,
                        message: 'Failed to send email.'
                    });
                } else {
                    res.json({
                        success: true,
                        message: 'Success! Your email has been confirmed.'
                    });
                }
            });
        }
    ], function (err) {
        console.log('email confirm send error', err);
        return res.status(500).send({
            success: false,
            message: 'Failed to confirm email.'
        });
    });
});

router.post('/getFeed', validateBody({
    positions: {
        isArray: true
    },
    resources: {
        isArray: true
    },
    lat: {
        notEmpty: true,
        isDecimal: true
    },
    lon: {
        notEmpty: true,
        isDecimal: true
    }
}), function (req, res) {
    routeService.getFeed(req, function (err, feed) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get your feed.'
            });
        }

        console.log('Feed retrieved successfully');
        res.json({
            success: true,
            message: 'Feed retrieved successfully',
            feed: feed
        });

    });
});

router.post('/getBusinesses', validateBody({
    companyName: {
        notEmpty: true
    }
}), function (req, res) {
    routeService.getBusinesses(req, function (err, businesses) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get businesses.'
            });
        }

        console.log('Businesses retrieved successfully');
        res.json({
            success: true,
            message: 'Businesses retrieved successfully',
            businesses: businesses
        });

    });
});

router.post('/getResourceUsers', validateBody({
    lat: {
        notEmpty: true,
        isDecimal: true
    },
    lon: {
        notEmpty: true,
        isDecimal: true
    },
    startsAt: Date,
    endsAt: Date,
}), function (req, res) {
    routeService.getResourceUsers(req, function (err, users) {
        if (!users) {
            console.log(err);

            return res.status(400).send({
                success: false,
                message: 'No users found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get users.'
            });
        }

        console.log('Users retrieved successfully');
        var arrayUsers = [];
        var ifElement;
        users.forEach(function (element) {
            ifElement = false;
            element.conflict.forEach(function (conflict) {
                if (new Date(conflict.startTime).getTime() >= new Date(req.body.startsAt).getTime() && new Date(conflict.endTime).getTime() <= new Date(req.body.endsAt).getTime() && conflict.accepted == true) {
                    ifElement = true;
                }
            });
            if (!ifElement) {
                arrayUsers.push(element);
            }
        });

        res.json({
            success: true,
            message: 'Users retrieved successfully',
            users: arrayUsers
        });

    });
});

router.post('/getUsers', validateBody({
    name: {
        notEmpty: true
    }
}), function (req, res) {
    routeService.getUsers(req, function (err, users) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get users.'
            });
        }

        console.log('Users retrieved successfully');
        res.json({
            success: true,
            message: 'Users retrieved successfully',
            users: users
        });

    });
});

router.post('/addResources', validateBody({
    eventId: {
        isMongoId: true
    },
    resources: {
        isArray: true
    },
    businessId: {
        isMongoId: true
    }
}), function (req, res) {
    routeService.addResources(req, function (err, event) {
        if (!event) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No event found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: err
            });
        }

        console.log('Event retrieved successfully');
        res.json({
            success: true,
            message: 'Event retrieved successfully',
            event: event
        });

    });
});

router.post('/addResource', function (req, res) {
    req
        .checkBody('businessId')
        .isMongoId();
    req
        .checkBody('resource', 'Resource is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.addResource(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});

router.post('/deleteResource', function (req, res) {
    req
        .checkBody('businessId')
        .isMongoId();
    req
        .checkBody('resource', 'Resource is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.deleteResource(req, res, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});

router.post('/finishResource', function (req, res) {
    req
        .checkBody('ids', 'Resource is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.finishResource(req, res, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});

router.post('/editResource', function (req, res) {
    req
        .checkBody('_id', 'A valid resource ID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.editResource(req, res, function (err, resource) {
        if (!resource) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No resource found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get resource.'
            });
        }

        console.log('Rusiness retrieved successfully');
        res.json({
            success: true,
            message: 'Rusiness retrieved successfully'
        });

    });
});

router.post('/acceptResource', function (req, res) {
    req
        .checkBody('resourceId', 'A valid resource ID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.acceptResource(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No user found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get user.'
            });
        }

        console.log('User retrieved successfully');
        res.json({
            success: true,
            message: 'User retrieved successfully',
            user: user
        });

    });
});

router.post('/declineResource', function (req, res) {
    req
        .checkBody('resourceId', 'A valid resource ID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.declineResource(req, function (err, user) {
        if (!user) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No user found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get user.'
            });
        }

        console.log('User retrieved successfully');
        res.json({
            success: true,
            message: 'User retrieved successfully',
            user: user
        });

    });
});




router.post('/deleteEvent', function (req, res) {
    req
        .checkBody('eventId', 'A valid event ID is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('businessId', 'A valid business ID is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('resources', 'Resources must be an array.')
        .optional()
        .isArray();
    req
        .checkBody('startDate', 'Start date must be a valid date')
        .notEmpty()
        .withMessage('An start date is required.');

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.deleteEvent(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});

router.post('/addAdministrator', function (req, res) {
    req
        .checkBody('businessId', 'A valid business id is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('admin', 'A new admin user is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('password', 'A valid password is required')
        .notEmpty()
        .isPassword();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.addAdministrator(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});

router.post('/addFBAdministrator', function (req, res) {
    req
        .checkBody('businessId', 'A valid business id is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('admin', 'A new admin user is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('token', 'A valid access token is required')
        .notEmpty()
        .isAlphanumeric();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.addFBAdministrator(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});

router.post('/removeAdministrator', function (req, res) {
    req
        .checkBody('businessId', 'A valid business id is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('admin', 'A new admin user is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('password', 'A valid password is required')
        .notEmpty()
        .isPassword();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.removeAdministrator(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});

router.post('/removeFBAdministrator', function (req, res) {
    req
        .checkBody('businessId', 'A valid business id is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('admin', 'A new admin user is required.')
        .notEmpty()
        .isMongoId();
    req
        .checkBody('token', 'A valid access token is required')
        .notEmpty()
        .isAlphanumeric();

    const errors = req.validationErrors();
    if (errors) {
        console.log(util.inspect(errors));
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.removeFBAdministrator(req, function (err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully',
            business: business
        });

    });
});


/**
 * @api {post} /api/addEventProducts
 * @apiDescription Add products to a specified model
 * @apiParam {MongoId} tastingId
 * @apiParam {MongoId} competitionId
 * @apiParam {MongoId} businessId
 * @apiParam {Array} products
 */
router.post('/addEventProducts', validateBody({
    competitionId: {
        optional: true,
        isMongoId: true
    },
    tastingId: {
        optional: true,
        isMongoId: true
    },
    businessId: {
        isMongoId: true
    },
    products: {
        isArray: true
    }
}), function (req, res) {
    routeService.addEventProducts(req, function (err, model) {
        if (!model) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that model in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to add the products.'
            });
        }
        console.log('Models products updated successfully');
        res.json({
            success: true,
            message: 'Models products updated successfully.'
        });
    });
});

/**
 * @api {post} /api/addProductReview
 * @apiDescription Add product review to a model
* @apiParam {MongoId} competitionId
 * @apiParam {MongoId} tastingId
 * @apiParam {MongoId} productId
 * @apiParam {Number} rating
 * @apiParam {String} review
 */
router.post('/addProductReview', validateBody({
    competitionId: {
        optional: true,
        isMongoId: true
    },
    tastingId: {
        optional: true,
        isMongoId: true
    },
    productId: {
        isMongoId: true
    },
    rating: {
        isNumeric: true
    },
    review: {
        notEmpty: true
    }
}), function (req, res) {
    routeService.addProductReview(req, function (err, model) {
        if (err) {
            console.log(err);
            return res.status(200).send({
                success: false,
                message: err
            });
        }
        if (!model) {
            console.log(err);
            return res.status(200).send({
                success: false,
                message: err
            });
        }
        console.log('Product review added successfully');
        res.json({
            success: true,
            message: 'Product review added successfully.'
        });
    });
});

/**
 * @api {post} /api/getProductReviews
 * @apiDescription Get reviews for a product
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} productId
 * @apiParam {String} optionalType
 * @apiParam {String} optionalArray
 */
router.post('/getProductReviews', validateBody({
    businessId: {
        isMongoId: true
    },
    productId: {
        isMongoId: true
    },
    optionalArray: {
        optional: true,
        isArray: true
    }
}), function (req, res) {
    routeService.getProductReviews(req, function (err, reviews) {
        if (err) {
            console.log(err);
            return res.status(200).send({
                success: false,
                message: err
            });
        }
        if (!reviews) {
            console.log(err);
            return res.status(200).send({
                success: false,
                message: err
            });
        }
        console.log('Product reviews retrieved successfully');
        res.json({
            success: true,
            message: 'Product review retrieved successfully.',
            reviews: reviews
        });
    });
});


/**
 * @api {post} /api/getBusinessReviews
 * @apiDescription Get reviews for a business
 * @apiParam {MongoId} businessId
 */
router.post('/getBusinessReviews', validateBody({

}), function (req, res) {
    routeService.getBusinessReviews(req, function (err, reviews) {
        if (err) {
            console.log(err);
            return res.status(200).send({
                success: false,
                message: err
            });
        }
        if (!reviews) {
            console.log(err);
            return res.status(200).send({
                success: false,
                message: err
            });
        }
        console.log('Business reviews retrieved successfully');
        res.json({
            success: true,
            message: 'Business review retrieved successfully.',
            reviews: reviews
        });
    });
});