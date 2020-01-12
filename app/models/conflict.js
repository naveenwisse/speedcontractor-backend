var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;


var conflictSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    type:  String,
    events: [{
        type: Schema.Types.ObjectId,
        ref: 'Event',
        default: []
    }],
    tastings: [{
        type: Schema.Types.ObjectId,
        ref: 'Tasting',
        default: []
    }],
    resources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    startTime: Date,
    endTime: Date,
    accepted: {
        type: Boolean,
        default: false
    },
});

conflictSchema
    .virtual('isFinished')
    .get(function() {
        var now = new Date(),
            end = new Date(this.startTime),
            isFinished = new Date(
                end.getFullYear(),
                end.getMonth(),
                end.getDate() - 2,
                end.getHours(),
                end.getMinutes());
        return (now > isFinished);
    });

conflictSchema.plugin(deepPopulate);
module.exports = mongoose.model('Conflict', conflictSchema);

