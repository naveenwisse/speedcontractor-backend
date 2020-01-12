var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var rescheduleSchema = require('pp/models/sub-schema/reschedule');
var Schema = mongoose.Schema;

var tastingSchema = new Schema({
    title: String,
    description: String,
    type: String,
    startTime: Date,
    endTime: Date,
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    businessVenue: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    accepted: {
        type: Boolean,
        default: false
    },
    capacity: {
        type: Number,
        default: 30
    },
    atCapacity: {
        type: Boolean,
        default: false
    },
    declined: Boolean,
    formattedAddress: String,
    loc: {
        type: {
            type: String
        },
        coordinates: [Number]
    },
    modelType: {
        type: String,
        default: 'TASTING'
    },
    level: String,
    levelArray: [String],
    tastingType: String,
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product',
        default: []
    }],
    reschedule: {
        type: [rescheduleSchema],
        default: []
    },
    rescheduleText: {
        type: String,
        default: ''
    },
    code: String,
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    checkedIn: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review',
        default: []
    }]
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

tastingSchema
    .virtual('cutOff')
    .get(function() {
        var now = new Date(),
            end = new Date(this.startTime),
            cutOff = new Date(
                end.getFullYear(),
                end.getMonth(),
                end.getDate() - 2,
                end.getHours(),
                end.getMinutes());
        return (now > cutOff);
    });

tastingSchema.index({ "loc": "2dsphere" });
tastingSchema.plugin(deepPopulate);

module.exports = mongoose.model('Tasting', tastingSchema);
