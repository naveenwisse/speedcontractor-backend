var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userScoreSchema = new Schema({
    jobType: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    score: Number,
    ratings: Schema.Types.Mixed
});

module.exports = userScoreSchema;
