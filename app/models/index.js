'use strict';
var mongoose = require('mongoose');
mongoose.plugin(schema => { schema.options.usePushEach = true });

module.exports = {
    Business: require('./business'),
    Event: require('./event'),
    Invite: require('./invite'),
    Resource: require('./resource'),
    Tasting: require('./tasting'),
    User: require('./user'),
    Position: require('./positions'),
    Term: require('./term'),
    Competition: require('./competition'),
    CompetingEmployee: require('./competing-employee'),
    StripeAccount: require('./stripe-account'),
    StripeAccountConnection: require('./stripe-account-connection'),
    Product: require('./product'),
    Review: require('./review'),
    ReviewBusiness: require('./review-business'),
    Conflict: require('./conflict'),
    MassHireResource: require('./mass-hire-resource'),
    PendingCompetition: require('./pending-competition')
};
