var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var educationsSchema = new Schema({
    contactNumber: String,
    courseCompleted: String,
    state: String,
    city: String,
    endDate: String,
    startDate: String,
    studied: String,
    schoolName: String
});

module.exports = educationsSchema;