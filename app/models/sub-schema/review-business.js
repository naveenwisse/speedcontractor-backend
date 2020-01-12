var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var reviewBusinessSchema = new Schema({
    name: String,
    date: {
        type: Date,
        default: Date.now
    },
    review: String
});

module.exports = reviewBusinessSchema;