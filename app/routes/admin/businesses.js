'use strict';
const express = require('express');
const adminService = require('pp/services/admin-service');
const router = module.exports = express.Router();

router.post('/businesses', function(req, res) {
  /*req
    .checkBody('_id', 'A valid event ID is required.')
    .notEmpty()
    .isMongoId();
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
  }
  */
  adminService.getAllBusinesses(req.body, function(err, businesses) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all businesses.'
      });
    }
    if (!businesses) return res.status(400).send({
      success: false,
      message: 'Could not find the businesses'
    });
    console.log('(admin) businesses retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your businesses Admin',
      businesses: businesses.businesses,
      count: businesses.count,
    });
  });
});


router.post('/suspendBusinesses', function(req, res) {
    adminService.suspendBusinesses(req.body, function(err, businesses) {
      if (err) {
        console.log(err);
        return res.status(500).send({
            success: false,
            message: 'An error occurred while suspending business.'
        });
      }
      if (!businesses) return res.status(400).send({
        success: false,
        message: 'Could not find the business'
      });
      console.log('(admin) business suspended successfully');
      res.json({
        success: true,
        message: 'Business updated',
        status: businesses.status,
        // user: user, It's not necessary
      });
    });
  });

