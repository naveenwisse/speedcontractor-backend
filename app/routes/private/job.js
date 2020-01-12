'use strict';

const express = require('express');
const authMiddleware = require('pp/routes/middleware/auth');
// const { validate } = require('pp/routes/middleware/validate');

const router = module.exports = express.Router();
router.use(authMiddleware.authRequired);

const jobService = require('pp/services/job');

/**
 * @api {get} /api/job
 * @apiDescription Get job types
 */
router.get('/', function(req, res) {
    jobService.getJobTypes(req, function(err, jobTypes) {
        if (!jobTypes) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No job types found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get job types.'
            });
        }

        console.log('Job types retrieved successfully');
        res.json({
            success: true,
            message: 'Job types retrieved successfully',
            jobTypes: jobTypes
        });
    });
});
