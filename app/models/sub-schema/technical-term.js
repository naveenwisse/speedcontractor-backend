var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var technicalSchema = new Schema({
    term: String,
    sanitization: String,
    ratingCount: {
        type: Number,
        default: 0
    },
    overallSkill: {
        type: Number,
        default: 0
    },
    skill: {
        type: [Number],
        default: [25.0, 8.333333333333334]
    },
    category: {
        type: String,
        enum: ['Universal', 'Technical'],
        default: 'Universal'
    }
});

module.exports = technicalSchema;
