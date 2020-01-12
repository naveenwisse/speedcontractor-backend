'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Capped collection. Account creation requests
// expire after 30 minutes and can only be completed
// by the user that initiated the request

const stripeAccountConnectionSchema = new Schema({

    createDate: {
        type: Date,
        default: Date.now
    },

    accountType: {
        type: String,
        required: true,
        enum: [
            'User',
            'Business'
        ]
    },

    accountCreator: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    accountHolder: {
        type: Schema.Types.ObjectId,
        refPath: 'accountType'
    }

});

stripeAccountConnectionSchema.index({
    createDate: 1
}, {
    // expires after 30 minutes
    expireAfterSeconds: 60 * 30
});

module.exports = mongoose.model('StripeAccountConnection', stripeAccountConnectionSchema);
