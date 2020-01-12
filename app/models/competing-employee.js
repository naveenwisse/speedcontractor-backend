var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var competingEmployeeSchema = new Schema({
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    score: {
        type: Number,
        default: 0
    }
});

competingEmployeeSchema.plugin(deepPopulate);

module.exports = mongoose.model('CompetingEmployee', competingEmployeeSchema);
