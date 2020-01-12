'use strict';

const express = require('express');
const competitionService = require('pp/services/competition');
const validateMiddleware = require('pp/routes/middleware/validate');
const validateBody = validateMiddleware.body;

const router = module.exports = express.Router();

/**
 * @api {post} /api/addCompetition
 * @apiDescription Create a competition
 * @apiParam {MongoId} business
 * @apiParam {String} competitors
 * @apiParam {String} title
 * @apiParam {String} description
 * @apiParam {String} startsAt
 * @apiParam {String} endsAt
 */
router.post('/addCompetition', validateBody({
    business: {
        isMongoId: true
    },
    competitors: {
        isArray: true
    },
    title: {
        notEmpty: true
    },
    tier: {
        notEmpty: true
    },
    base: {
        notEmpty: true
    },
    description: {
        notEmpty: true
    },
    startsAt: {
        notEmpty: true
    },
    endsAt: {
        notEmpty: true
    }
}), function(req, res) {
    competitionService.addCompetition(req, function(err, competition) {
        if (!competition || err) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: err
            });
        }

        console.log('competition retrieved successfully');
        res.json({
            success: true,
            message: 'competition retrieved successfully',
            competitionId: competition._id
        });

    });
});

/**
 * @api {post} /api/deleteCompetition
 * @apiDescription Delete a competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 */
router.post('/deleteCompetition', validateBody({
    businessId: {
        isMongoId: true
    },
    competitionId: {
        isMongoId: true
    }
}), function(req, res) {
    competitionService.deleteCompetition(req, res, function(err, business) {
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
            message: 'Business retrieved successfully'
        });

    });
});

/**
 * @api {post} /api/updateCompetitorScore
 * @apiDescription Update competitor score for competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 * @apiParam {MongoId} competitorId
 * @apiParam {String} newScore
 */
router.post('/updateCompetitorScore', validateBody({
    businessId: {
        isMongoId: true
    },
    competitionId: {
        isMongoId: true
    },
    competitorId: {
        isMongoId: true
    },
    newScore: {
        isNumeric: true
    }
}), function(req, res) {
    competitionService.updateCompetitionScore(req, function(err, business) {
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
                message: 'An error occured while attempting to update the score.'
            });
        }

        console.log('Score updated successfully');
        res.json({
            success: true,
            message: 'Score updated successfully'
        });

    });
});

/**
 * @api {post} /api/updateEmployeeScore
 * @apiDescription Update employee score for competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competingEmployeeId
 * @apiParam {String} newScore
 */
router.post('/updateEmployeeCompetitorScore', validateBody({
    businessId: {
        isMongoId: true
    },
    competingEmployeeId: {
        isMongoId: true
    },
    newScore: {
        isNumeric: true
    }
}), function(req, res) {
    competitionService.updateEmployeeCompetitorScore(req, function(err, business) {
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
                message: 'An error occured while attempting to update the score.'
            });
        }

        console.log('Score updated successfully');
        res.json({
            success: true,
            message: 'Score updated successfully'
        });

    });
});

/**
 * @api {post} /api/acceptCompetition
 * @apiDescription Accept a competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 * @apiParam {Array} conflictingCompetitions
 */
router.post('/acceptCompetition', validateBody({
    businessId: {
        isMongoId: true
    },
    competitionId: {
        isMongoId: true
    },
    conflictingCompetitions: {
        isArray: true
    }
}), function(req, res) {
    competitionService.acceptCompetition(req, res, function(err, business) {
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
        console.log('Competition accepted successfully');
        res.json({
            success: true,
            message: 'Competition accepted successfully'
        });

    });
});

/**
 * @api {post} /api/declineCompetition
 * @apiDescription Decline a competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 */
router.post('/declineCompetition', validateBody({
    businessId: {
        isMongoId: true
    },
    competitionId: {
        isMongoId: true
    }
}), function(req, res) {
    competitionService.declineCompetition(req, function(err, business) {
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

        console.log('Competition declined successfully');
        res.json({
            success: true,
            message: 'Competition declined successfully'
        });

    });
});


/**
 * @api {post} /api/addCompetingEmployees
 * @apiDescription Add employees to a competitor of a competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitorId
 * @apiParam {MongoId} competitionId
 * @apiParam {Array} competingEmployees
 * @apiParam {Array} invitations
 */
router.post('/addCompetingEmployees', validateBody({
    businessId: {
        isMongoId: true
    },
    competitorId: {
        isMongoId: true
    },
    competitionId: {
        isMongoId: true
    },
    competingEmployees: {
        isArray: true
    },
    invitations: {
        isArray: true
    }
}), function(req, res) {
    let phones = [];
    let emails = [];
    let patternPhone = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{4}[-\s.]?[0-9]{4,7}$/
    req.body.invitations.forEach((inv) => {
        if (patternPhone.test(inv)) {
            phones.push(inv);
        } else {
            emails.push(inv);
        }
    });
    competitionService.addCompetingEmployeesEmail(req, emails);
    competitionService.addCompetingEmployeesPhone(req, phones);
    competitionService.addCompetingEmployees(req, function(err, employees) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to add employees.'
            });
        }
        console.log('Employees added successfully');
        res.json({
            success: true,
            message: 'Employees added successfully',
            employees: employees
        });
    });
});

/**
 * @api {post} /api/finalizeCompetition
 * @apiDescription Finalize the competition after all scores are updated
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 */
router.post('/finalizeCompetition', validateBody({
    businessId: {
        isMongoId: true
    },
    competitionId: {
        isMongoId: true
    }
}), function(req, res) {
    competitionService.finalizeCompetition(req, function(err, competition) {
        if (!competition) {
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
                message: 'An error occured while attempting to finalize the competition.'
            });
        }

        console.log('Competition finalized successfully');
        res.json({
            success: true,
            message: 'Competition finalized successfully'
        });

    });
});

/**
 * @api {post} /api/acceptCompetitionProfile
 * @apiDescription Accept competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 */
router.post('/acceptCompetitionProfile', validateBody({
    _id: {
        isMongoId: true
    }
}), function(req, res) {
    competitionService.acceptCompetitionProfile(req, function(err, competition) {
        if (!competition) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Competition not found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to accepted the competition.'
            });
        }

        console.log('Competition accepted successfully');
        res.json({
            success: true,
            message: 'Competition accepted successfully'
        });

    });
});

/**
 * @api {post} /api/declineCompetitionProfile
 * @apiDescription Decline competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 */
router.post('/declineCompetitionProfile', validateBody({
    _id: {
        isMongoId: true
    }
}), function(req, res) {
    competitionService.declineCompetitionProfile(req, function(err, competition) {
        if (!competition) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Competition not found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to decline the competition.'
            });
        }

        console.log('Competition decline successfully');
        res.json({
            success: true,
            message: 'Competition decline successfully'
        });

    });
});
