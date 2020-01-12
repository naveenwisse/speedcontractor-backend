'use strict';

const termsService = require('pp/services/terms');

exports.getJobTypes = function(req, next) {
    termsService.getJobTypes((err, jobs) => {
      if (err) next(err, null);
      else next(null, jobs);
    });
};
