'use strict';

const util = require('util');

exports.body = function(validationSchema) {
    return function(req, res, next) {
        req.checkBody(validationSchema);
        const errors = req.validationErrors();
        if (errors) {
            console.log(util.inspect(errors));
            return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
        }
        next();
    };
};

exports.validate = function(validationSchema) {
    return function(req, res, next) {
        req.check(validationSchema);
        const errors = req.validationErrors();
        if (errors) {
            console.log(util.inspect(errors));
            return res.status(400).send('There have been validation errors: ' + util.inspect(errors));
        }
        next();
    };
};
