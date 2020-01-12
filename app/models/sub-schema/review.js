var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var reviewSchema = new Schema({
    name: String,
    date: {
        type: Date,
        default: Date.now
    },
    review: String
});

module.exports = reviewSchema;