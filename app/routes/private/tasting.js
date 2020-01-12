'use strict';

const crypto = require('crypto');
const uuid = require('uuid');
const express = require('express');
const moment = require('moment');
const routeService = require('pp/services/route-service');
const aws = require('pp/config/aws');
const validateMiddleware = require('pp/routes/middleware/validate');
const validateBody = validateMiddleware.body;

const router = module.exports = express.Router();

/**
 * @api {post} /api/addTasting
 * @apiDescription Create a tasting
 * @apiParam {MongoId} businessId
 * @apiParam {string} tasting
 */
router.post('/addTasting', validateBody({
    businessId: {
        isMongoId: true
    },
    tasting: {
        notEmpty: true
    }
}), function(req, res) {
    routeService.addTasting(req, function(err, business) {
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
 * @api {post} /api/deleteTasting
 * @apiDescription Delete a tasting
 * @apiParam {MongoId} businessId
 * @apiParam {string} tasting
 */
router.post('/deleteTasting', validateBody({
    businessId: {
        isMongoId: true
    },
    tasting: {
        notEmpty: true
    }
}), function(req, res) {
    routeService.deleteTasting(req, res, function(err, business) {
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
 * @api {post} /api/attendTasting
 * @apiDescription Attend a tasting
 * @apiParam {MongoId} tastingId
 */
router.post('/attendTasting', validateBody({
    tastingId: {
        isMongoId: true
    }
}), function(req, res) {
    routeService.attendTasting(req, function(err, tasting) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: err
            });
        }
        if (!tasting) {
            return res.status(400).send({
                success: false,
                message: 'Unable to find the tasting to attend.'
            });
        }

        console.log('User attended successfully');
        res.json({
            success: true,
            message: 'User attended Successfully'
        });

    });
});

/**
 * @api {post} /api/attendTasting
 * @apiDescription Attend a tasting
 * @apiParam {MongoId} tastingId
 */
router.post('/addCheckIns', validateBody({
    checkIns: {
        isArray: true
    },
    code: {
        notEmpty: true
    },
    tastingId: {
        isMongoId: true
    }
}), function(req, res) {
    routeService.addCheckIns(req, function(err, tasting) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: err
            });
        }
        if (!tasting) {
            return res.status(400).send({
                success: false,
                message: 'Unable to find the users in check-in.'
            });
        }

        console.log('Users check-in successfully');
        res.json({
            success: true,
            message: 'Users check-in Successfully'
        });

    });
});

/**
 * @api {post} /api/checkInTasting
 * @apiDescription Check in to a tasting
 * @apiParam {MongoId} tastingId
 * @apiParam {Number} lon Longitude of the tasting
 * @apiParam {Number} lat Latitude of the tasting
 * @apiParam {String} code Tasting check in code
 */
router.post('/checkInTasting', validateBody({
    tastingId: {
        isMongoId: true
    },
    lon: {
        isDecimal: true
    },
    lat: {
        isDecimal: true
    },
    code: {
        notEmpty: true
    }
}), function(req, res) {
    routeService.checkInTasting(req, function(err, tasting) {
        if (err) {
            return res.status(500).send({
                success: false,
                message: err
            });
        }
        if (!tasting) {
            return res.status(400).send({
                success: false,
                message: 'Unable to find the tasting to check in.'
            });
        }
        res.json({
            success: true,
            message: 'User check in successfully'
        });
    });
});

/**
 * @api {post} /api/acceptTasting
 * @apiDescription Accept a tasting
 * @apiParam {MongoId} tastingId
 * @apiParam {Array} conflictingTastings
 */
router.post('/acceptTasting', validateBody({
    tastingId: {
        isMongoId: true
    },
    conflictingTastings: {
        isArray: true
    }
}), function(req, res) {
    routeService.acceptTasting(req, res, function(err, business) {
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
        console.log('business retrieved successfully');
        res.json({
            success: true,
            message: 'business retrieved successfully',
            business: business
        });

    });
});

/**
 * @api {post} /api/declineTasting
 * @apiDescription Decline a tasting
 * @apiParam {MongoId} tastingId
 */
router.post('/declineTasting', validateBody({
    tastingId: {
        isMongoId: true
    }
}), function(req, res) {
    routeService.declineTasting(req, function(err, business) {
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

        console.log('business retrieved successfully');
        res.json({
            success: true,
            message: 'business retrieved successfully',
            business: business
        });

    });
});

/**
 * @api {post} /api/rescheduleTasting
 * @apiDescription Reschedule a tasting
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} tastingId
 * @apiParam {Array} times
 */
router.post('/rescheduleTasting', validateBody({
    tastingId: {
        isMongoId: true
    },
    businessId: {
        isMongoId: true
    },
    times: {
        isArray: true
    }
}), function(req, res) {
    routeService.rescheduleTasting(req, function(err, business) {
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

        console.log('business retrieved successfully');
        res.json({
            success: true,
            message: 'business retrieved successfully',
            business: business
        });

    });
});

/**
 * @api {post} /api/acceptReschedule
 * @apiDescription Accept the tastings rescheduling
 * @apiParam {MongoId} tastingId
 * @apiParam {MongoId} businessId
 * @apiParam {Date} newTime Tastings new time
 */
router.post('/acceptReschedule', validateBody({
    tastingId: {
        isMongoId: true
    },
    businessId: {
        isMongoId: true
    },
    newTime: {
        notEmpty: true
    }
}), function(req, res) {
    routeService.acceptReschedule(req, function(err, business) {
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

        console.log('business retrieved successfully');
        res.json({
            success: true,
            message: 'business retrieved successfully',
            business: business
        });

    });
});

/**
 * @api {post} /api/tastingImageUpload
 * @apiDescription Upload tasting media
 * @apiParam {MongoId} tastingId
 * @apiParam {MongoId} businessId
 * @apiParam {String} type
 */
router.post('/tastingImageUpload', validateBody({
    tastingId: {
        isMongoId: true
    },
    businessId: {
        isMongoId: true
    },
    type: {
        notEmpty: true
    }
}), function(req, res) {
    var s3Url = 'https://' + aws.tastingBucket + '.s3.amazonaws.com',
        fileName = uuid.v1() + '.png',
        s3Policy = {
            'expiration': moment().add(5, 'm').toDate(),
            'conditions': [{
                    'bucket': aws.tastingBucket
                },
                ['starts-with', '$key', fileName], {
                    'acl': 'private'
                }, {
                    'success_action_status': '201'
                },
                ['starts-with', '$Content-Type', req.body.type],
                ['content-length-range', 0, 524288000], //min and max
            ]
        },
        stringPolicy = JSON.stringify(s3Policy),
        base64Policy = new Buffer(stringPolicy, 'utf-8').toString('base64'),
        signature = crypto.createHmac('sha1', aws.secret)
        .update(new Buffer(base64Policy, 'utf-8')).digest('base64'),
        credentials = {
            url: s3Url,
            fields: {
                key: fileName,
                AWSAccessKeyId: aws.key,
                acl: 'private',
                policy: base64Policy,
                signature: signature,
                'Content-Type': req.body.type,
                success_action_status: 201
            }
        };

    req.body.bucket = aws.tastingBucket;
    req.body.filename = fileName;
    routeService.updateTastingImage(req, function(err, image) {
        if (!image) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that tasting in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to upload the photo.'
            });
        }

        console.log('tasting photo updated successfully');
        res.json({
            credentials: credentials,
            image: image
        });

    });
});

/**
 * @api {post} /api/deleteTastingImage
 * @apiDescription Delete tasting media
 * @apiParam {MongoId} tastingId
 * @apiParam {MongoId} businessId
 * @apiParam {String} filename
 */
router.post('/deleteTastingImage', validateBody({
    tastingId: {
        isMongoId: true
    },
    businessId: {
        isMongoId: true
    },
    filename: {
        notEmpty: true
    }
}), function(req, res) {
    routeService.deleteTastingImage(req, function(err, tasting) {
        if (!tasting) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that tasting in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to upload the photo.'
            });
        }
        console.log('tasting photo updated successfully');
        res.json({
            tasting: tasting
        });
    });
});
