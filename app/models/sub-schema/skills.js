var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var skillsSchema = new Schema({
    type: String,
    yearsProficiency: Number
});

module.exports = skillsSchema;
