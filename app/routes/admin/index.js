'use strict';

const express = require('express');
const router = module.exports = express.Router();

router.use('/api/admin', require('./user'));
router.use('/api/admin', require('./position'));
router.use('/api/admin', require('./term'));
router.use('/api/admin', require('./businesses'));

