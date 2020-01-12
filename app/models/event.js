var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var eventSchema = new Schema({
    title: String,
    type: String,
    startsAt: String,
    endsAt: String,
    formattedAddress: String,
    description: String,
    free: {
        type: Boolean,
        default: false
    },
    resources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    loc: {
        type: {
            type: String
        },
        coordinates: [Number]
    },
    modelType: {
        type: String,
        default: 'EVENT'
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

eventSchema
    .virtual('cutOff')
    .get(function() {
        var now = new Date(),
            end = new Date(this.startsAt),
            cutOff = new Date(
                end.getFullYear(),
                end.getMonth(),
                end.getDate(),
                end.getHours() - 2,
                end.getMinutes());
        return (now > cutOff);
    });

eventSchema.index({ "loc": "2dsphere" });
eventSchema.plugin(deepPopulate);

module.exports = mongoose.model('Event', eventSchema);
