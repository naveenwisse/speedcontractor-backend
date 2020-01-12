var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var employeeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    pending: Boolean
});

module.exports = employeeSchema;
