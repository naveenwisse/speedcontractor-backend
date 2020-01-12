var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var pendingCompetitionSchema = new Schema({
    competition: {
        type: Schema.Types.ObjectId,
        ref: 'Competition'
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    competitor: {
        type: String,
        default: ''
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

pendingCompetitionSchema.plugin(deepPopulate);

module.exports = mongoose.model('PendingCompetition', pendingCompetitionSchema);
