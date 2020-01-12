'use strict';

const express = require('express');
const adminService = require('pp/services/admin-service');
const router = module.exports = express.Router();

router.post('/users', function(req, res) {
  /*req
    .checkBody('_id', 'A valid event ID is required.')
    .notEmpty()
    .isMongoId();
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
  }
  */
  adminService.getAllUsers(req.body, function(err, users) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all users.'
      });
    }
    if (!users) return res.status(400).send({
      success: false,
      message: 'Could not find the users'
    });
    console.log('(admin) users retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your users Admin',
      users: users.users,
      count: users.count,
    });
  });
});

router.post('/suspend', function(req, res) {
  /*req
    .checkBody('_id', 'A valid event ID is required.')
    .notEmpty()
    .isMongoId();
  var errors = req.validationErrors();
  if (errors) {
    return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
  }
  */
  adminService.suspendUser(req.body, function(err, user) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while suspending user.'
      });
    }
    if (!user) return res.status(400).send({
      success: false,
      message: 'Could not find the user'
    });
    console.log('(admin) user suspended successfully');
    res.json({
      success: true,
      message: 'User updated',
      status: user.status,
      // user: user, It's not necessary
    });
  });
});
