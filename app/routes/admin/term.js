'use strict';

const express = require('express');
const adminService = require('pp/services/admin-service');

const router = module.exports = express.Router();

router.get('/terms', function(req, res) {
  adminService.getAllTerms(function(err, terms) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all terms.'
      });
    }
    if (!terms) return res.status(400).send({
      success: false,
      message: 'Could not find the terms'
    });
    console.log('(admin) terms retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your terms Admin',
      terms: terms,
    });
  });
});

router.post('/term', function(req, res) {
  adminService.createTerm(req.body, function(err, term) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while creating all term.'
      });
    }
    if (!term) return res.status(400).send({
      success: false,
      message: 'Could not create the term'
    });
    console.log('(admin) term added successfully');
    res.json({
      success: true,
      message: 'Here is your new term Admin',
      term: term,
    });
  });
});

router.post('/removeterm', function(req, res) {
  adminService.removeTerm(req.body, function(err, term) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while removing all term.'
      });
    }
    if (!term) return res.status(400).send({
      success: false,
      message: 'Could not remove the term'
    });
    console.log('(admin) term removed successfully');
    res.json({
      success: true,
      message: 'Here is your removed term Admin',
      term: term,
    });
  });
});

router.get('/term/:id', function(req, res) {
  adminService.getTerm(req.params.id, function(err, term) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while retrieving all term.'
      });
    }
    if (!term) return res.status(400).send({
      success: false,
      message: 'Could not find the term'
    });
    console.log('(admin) term retrieved successfully');
    res.json({
      success: true,
      message: 'Here is your term Admin',
      term: term,
    });
  });
});

router.post('/editterm', function(req, res) {
  adminService.updateTerm(req.body, function(err, term) {
    if (err) {
      console.log(err);
      return res.status(500).send({
          success: false,
          message: 'An error occurred while removing all term.'
      });
    }
    if (!term) return res.status(400).send({
      success: false,
      message: 'Could not remove the term'
    });
    console.log('(admin) term removed successfully');
    res.json({
      success: true,
      message: 'Here is your removed term Admin',
      term: term,
    });
  });
});