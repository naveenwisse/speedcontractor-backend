var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var competitorSchema = new Schema({
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    score: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        required: true,
        enum: [
            'pending',
            'accepted',
            'declined'
        ],
        default: 'pending'
    },
    competingEmployees: [{
        type: Schema.Types.ObjectId,
        ref: 'CompetingEmployee',
        default: []
    }]
});

module.exports = competitorSchema;
