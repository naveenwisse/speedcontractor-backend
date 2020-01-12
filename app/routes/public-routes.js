'use strict';

const util = require('util');
const express = require('express');
const async = require('async');
const mandrill = require('node-mandrill')('qyWPKiR-JFh40H3U4m6O6A');
const routeService = require('pp/services/route-service');
const authMiddleware = require('pp/routes/middleware/auth');
const validateMiddleware = require('pp/routes/middleware/validate');
const { validate, body: validateBody } = validateMiddleware;

const router = module.exports = express.Router();

router.get('/', function(req, res) {
    res.send('Sup girl you trien to hangout?');
});

router.post('/stripe-webhook', function(req, res) {
    console.log(JSON.stringify(req.body));
    res.status(200).send('Success.');
});

router.post('/contact', function(req, res) {
    req
        .checkBody('email', 'Invalid email.')
        .notEmpty()
        .withMessage('Email is required.')
        .isEmail();
    req
        .checkBody('name', 'Name is required.')
        .notEmpty();
    req
        .checkBody('subject', 'Subject is required.')
        .notEmpty();
    req
        .checkBody('inputMessage', 'A message is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    mandrill('/messages/send', {
        "message": {
            "text": 'Begin message:\n\n' +
                'Email: ' + req.body.email + '\n\n' +
                'Subject: ' + req.body.subject + '\n\n' +
                'Message: ' + req.body.inputMessage + '\n',
            "subject": 'Contact Form (' + req.body.name + ') - Speed Contractor',
            "from_email": "do-not-reply@speedcontractor.com",
            "from_name": "Speed Contractor",
            "to": [{
                "email": 'info@speedcontractor.com',
                "name": 'Contact Form',
                "type": "to"
            }],
            "tags": [
                "contact-form"
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
            message: 'We have received your email and will get back to you shortly.'
        });

    });
});

router.get('/acceptBus', validate({
    id: {
        in: 'query',
        isMongoId: true
    },
    token: {
        in: 'query',
        isHexadecimal: true
    }
}), function(req, res) {

    async.waterfall([
        function(done) {
            routeService.acceptBusiness(req, function(err, business) {
                if (err) {
                    res.status(500).send({
                        success: false,
                        message: 'An error occurred while attempting to accept the business',
                        err: err
                    });
                } else if (!business) {
                    res.status(400).send({
                        success: false,
                        message: 'Unable to find business'
                    });
                } else {
                    console.log('Business accepted successfully');
                    done(null, business);
                }
            });
        },
        function(business) {
            mandrill('/messages/send', {
                "message": {
                    "text": 'Hello,\n\n' +
                        'This is a confirmation that your business account (' + business.companyName + ') has just been approved.\n',
                    "subject": 'Your business has been approved - Speed Contractor',
                    "from_email": "do-not-reply@speedcontractor.com",
                    "from_name": "Speed Contractor",
                    "to": [{
                        "email": business.usersAdmin[0].email,
                        "name": business.companyName,
                        "type": "to"
                    }],
                    "tags": [
                        "business-approved"
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
                    return res.status(400).send({
                        success: false,
                        message: 'Failed to send email.'
                    });
                }
                res.json({
                    success: true,
                    message: 'Success! Your Business has been accepted.'
                });
            });
        }
    ], function(err) {
        return res.status(500).send({
            success: false,
            message: 'Failed to accept business.',
            err: err
        });
    });
});

router.post('/profile',
    authMiddleware.authOptional,
    validateBody({
        _id: {
            isMongoId: true
        }
    }),
function(req, res) {
    // Authenticated user getting own profile
    if (req.authUserId === req.body._id) {
        routeService.getProfileAuthenticated(req, done);
    } else {
        routeService.getProfilePublic(req, done);
    }

    function done(err, user, jobTypes) {
        if (err) return res.status(500).send({
            success: false,
            message: 'An error occurred while retrieving the profile.'
        });
        if (!user) return res.status(400).send({
            success: false,
            message: 'Could not find the profile'
        });
        res.json({
            success: true,
            user: user,
            jobTypes: jobTypes
        });
    }
});

router.post('/business',
    authMiddleware.authOptional,
    validate({
        _id: {
            in: 'body',
            isMongoId: true
        }
    }),
function(req, res) {

    routeService.checkIfAuthUserIsBusinessAdmin(req, function(err, isAdmin) {
        if (isAdmin) {
            routeService.getBusinessAuthenticated(req, done);
        } else {
            routeService.getBusinessPublic(req, done);
        }
    });

    function done(err, business) {
        if (err) return res.status(500).send({
            success: false,
            message: 'An error occurred while retrieving the business profile.'
        });
        if (!business) return res.status(400).send({
            success: false,
            message: 'Could not find the business'
        });
        if(business.businessPending) return res.status(400).send({
            success: false,
            message: 'Business Pending'
        });
        res.json({
            success: true,
            business: business
        });
    }
});

router.post('/event', function(req, res) {
    req
        .checkBody('_id', 'A valid event ID is required.')
        .notEmpty()
        .isMongoId();
    var errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }
    routeService.getEvent(req, function(err, event) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while retrieving the event.'
            });
        }
        if (!event) return res.status(400).send({
            success: false,
            message: 'Could not find the event'
        });
        console.log('Event retrieved successfully');
        res.json({
            success: true,
            message: 'Here is your event',
            event: event
        });

    });
});

router.post('/tasting', authMiddleware.authOptional, function(req, res) {
    req
        .checkBody('_id', 'A valid tasting ID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.getTasting(req, function(err, tasting) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while retrieving the tasting.'
            });
        }
        if (!tasting) return res.status(400).send({
            success: false,
            message: 'Could not find the tasting'
        });
        console.log('Tasting retrieved successfully');
        res.json({
            success: true,
            message: 'Here is your tasting',
            tasting: tasting
        });

    });
});

router.post('/findInvite', function(req, res) {
    req
        .checkBody('token', 'Invalid token')
        .notEmpty()
        .withMessage('Token is required.')
        .isAlphanumeric();

    const errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.findInvite(req.body.token, function(err, invite) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while retrieving the invite.'
            });
        }
        if (!invite) return res.status(400).send({
            success: false,
            message: 'Could not find the invite'
        });
        console.log('Invite retrieved successfully');
        res.json({
            success: true,
            message: 'Invite verified.'
        });

    });
});

router.post('/resource', function(req, res) {
    req
        .checkBody('resourceId', 'A valid resource ID is required.')
        .notEmpty()
        .isMongoId();

    const errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.getResource(req, function(err, resource) {
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
            resource: resource
        });

    });
});


router.post('/updateemail', function(req, res) {
    req
        .checkBody('currentEmail', 'A valid resource ID is required.')
        .notEmpty();
    req
        .checkBody('newEmail', 'A valid resource ID is required.')
        .notEmpty();

    const errors = req.validationErrors();
    if (errors) {
        return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
    }

    routeService.updateEmail(req.body.currentEmail, req.body.newEmail, function(err, email) {
        if (err) {
            console.log(err);
            return res.status(403).send({
                success: false,
                message: 'An error occurred while retrieving the email.'
            });
        }
        if (!email) return res.status(404).send({
            success: false,
            message: 'Could not find the email'
        });
        console.log('email updated successfully');
        res.json({
            success: true,
            message: 'Here is your change',
        });

    });
});

router.get('/markers', function(req, res) {
    routeService.getMapMarkers(function(err, data) {
        if (err) {
            console.log(err);
            return res.status(403).send({
                success: false,
                message: 'An error occurred while retrieving the map markers.'
            });
        }
        console.log('Building markers');
        const markers = data.map(elem => {
            return {
                _id: elem._id,
                formattedAddress: elem.formattedAddress,
                title: elem.title,
                startTime: elem.startTime,
                endTime: elem.endTime,
                business: elem.business,
                loc: elem.loc,
                massHire: elem.massHire,
                modelType: elem.modelType
            } = elem;
        })

        const groups = {};
        markers.forEach((marker) => {
            const groupName = marker.formattedAddress + marker.business.companyName;
            if (!groups[groupName]) {
                groups[groupName] = {
                    markers: [],
                    titles: [],
                    companyName: marker.business.companyName,
                    formattedAddress: marker.formattedAddress,
                    coordinates: marker.loc.coordinates,
                    cityName: marker.business.city
                };
            }
            groups[groupName].markers.push(marker);
            groups[groupName].titles.push(marker.title);
        });

        const allGroups = Object.keys(groups).map(function(key) {
            return groups[key];
        });

        res.json({
            success: true,
            markers,
            groups: allGroups,
            message: 'Here are your markers',
        });

    });
});

router.post('/allbycoords', function(req, res) {
    routeService.getAllByCoords(req.body.coords, function(err, data) {
        if (err) {
            console.log(err);
            return res.status(403).send({
                success: false,
                message: 'An error occurred while retrieving the map markers.'
            });
        }
        res.json({
            success: true,
            jobs: data,
            message: 'Here are your jobs by coords',
        });

    });
});

router.post('/requestjobinvitation', function(req, res) {
    routeService.requestJobInvitation(req.body.jobId, req.body.userId, function(err, resource) {
        if (err) {
            console.log(err);
            return res.status(403).send({
                success: false,
                message: err.msg || 'An error occurred'
            });
        }
        res.json({
            success: true,
            resource,
            message: 'Here are your jobs by coords',
        });

    });
});

router.post('/getjob', function(req, res) {
    routeService.jobByMassHire(req.body.massHireResource, req.body.group, function(err, resource) {
        if (err) {
            console.log(err);
            return res.status(403).send({
                success: false,
                message: err.msg || 'An error occurred'
            });
        }
        res.json({
            success: true,
            resource,
            message: 'Here are your jobs by coords',
        });

    });
});

router.post('/sendinvitationjob', function(req, res) {
    routeService.sendInvitationJob(req.body.user, req.body.resource, function(err, response) {
        if (err) {
            console.log(err);
            return res.status(403).send({
                success: false,
                message: err.msg || 'An error occurred'
            });
        }
        res.json({
            success: true,
            response,
            message: 'Here are your jobs by coords',
        });

    });
});
