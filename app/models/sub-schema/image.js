var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var imageSchema = new Schema({
    filename: String,
    path: String
});

module.exports = imageSchema;
