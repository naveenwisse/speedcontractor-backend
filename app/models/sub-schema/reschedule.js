var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rescheduleSchema = new Schema({
    startTime: Date,
    endTime: Date
});

module.exports = rescheduleSchema;
