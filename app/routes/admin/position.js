'use strict';

const express = require('express');
const adminService = require('pp/services/admin-service');

const router = module.exports = express.Router();

router.get('/positions', function(req, res) {
  adminService.getAllPositions(function(err, positions) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all positions.'
      });
    }
    if (!positions) return res.status(400).send({
      success: false,
      message: 'Could not find the positions'
    });
    console.log('(admin) positions retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your positions Admin',
      positions: positions,
    });
  });
});

router.get('/position/:id', function(req, res) {
  adminService.getPosition(req.params.id, function(err, position) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all position.'
      });
    }
    if (!position) return res.status(400).send({
      success: false,
      message: 'Could not find the position'
    });
    console.log('(admin) position retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your position Admin',
      position: position,
    });
  });
});

router.put('/position', function(req, res) {
  adminService.updatePosition(req.body, function(err, position) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all position.'
      });
    }
    if (!position) return res.status(400).send({
      success: false,
      message: 'Could not find the position'
    });
    console.log('(admin) position retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your position updated Admin',
      position: position,
    });
  });
});

router.post('/position', function(req, res) {
  adminService.createPosition(req.body.name, function(err, position) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all position.'
      });
    }
    if (!position) return res.status(400).send({
      success: false,
      message: 'Could not find the position'
    });
    console.log('(admin) position retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your new position Admin',
      position: position,
    });
  });
});

router.post('/positionswitch', function(req, res) {
  adminService.switchStatusPosition(req.body, function(err, position) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all position.'
      });
    }
    if (!position) return res.status(400).send({
      success: false,
      message: 'Could not find the position'
    });
    console.log('(admin) position retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your new position Admin',
      position: position,
    });
  });
});