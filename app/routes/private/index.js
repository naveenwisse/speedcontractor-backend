'use strict';

const router = module.exports = require('express').Router();

router.use('/api', require('./splat'));
router.use('/api', require('./tasting'));
router.use('/api', require('./competition'));
router.use('/api/stripe', require('./stripe'));
router.use('/api', require('./product'));
router.use('/api/job', require('./job'));
