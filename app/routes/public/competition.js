'use strict';

const express = require('express');
const competitionService = require('pp/services/competition');
const authMiddleware = require('pp/routes/middleware/auth');
const validateMiddleware = require('pp/routes/middleware/validate');
const validateBody = validateMiddleware.body;

const router = module.exports = express.Router();

/**
 * @api {post} /competition
 * @apiDescription Get competition
 * @apiParam {String} _id
 */
router.post('/competition',
    authMiddleware.authOptional,
    validateBody({
    _id: {
        notEmpty: true,
        isMongoId: true
    }
}), function(req, res) {
    competitionService.getCompetition(req, function(err, competition) {
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occurred while retrieving the competition.'
            });
        }
        if (!competition) return res.status(400).send({
            success: false,
            message: 'Could not find the competition'
        });
        console.log('Competition retrieved successfully');
        res.json({
            success: true,
            message: 'Here is your competition',
            competition: competition
        });

    });
});
