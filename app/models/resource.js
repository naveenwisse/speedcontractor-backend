var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var resourceSchema = new Schema({
    title: String,
    type: String,
    finished: Date,
    startTime: Date,
    endTime: Date,
    busAttire: String,
    attire: String,
    compensation: Number,
    additional: String,
    charge: String,
    group: Number, // Internal reference to mass hire set
    created: {
        type: Date,
        default: Date.now
    },
    requiresFinish: {
        type: Boolean,
        default: false
    },
    massHireResource: {
        type: Schema.Types.ObjectId,
        ref: 'MassHireResource'
    },
    free: {
        type: Boolean,
        default: false
    },
    unfilled: {
        type: Boolean,
        default: true
    },
    filled: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    event: {
        type: Schema.Types.ObjectId,
        ref: 'Event'
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    invitationRequest: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    users: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    invitedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    declinedInvitedUsers: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    rated: {
        type: Boolean,
        default: false
    },
    rated2Business: {
        type: Boolean,
        default: false
    },
    accepted: {
        type: Boolean,
        default: false
    },
    temp: {
        type: Boolean,
        default: false
    },
    formattedAddress: String,
    loc: {
        type: {
            type: String
        },
        coordinates: [Number]
    },
    modelType: {
        type: String,
        default: 'RESOURCE'
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

resourceSchema
    .virtual('cutOff')
    .get(function() {
        var now = new Date(),
            end = new Date(this.startTime),
            cutOff = new Date(
                end.getFullYear(),
                end.getMonth(),
                end.getDate(),
                end.getHours() - 2,
                end.getMinutes());
        return (now > cutOff);
    });

resourceSchema.index({ "loc": "2dsphere" });
resourceSchema.plugin(deepPopulate);

module.exports = mongoose.model('Resource', resourceSchema);
