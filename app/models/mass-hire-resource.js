var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var massHireResourceSchema = new Schema({
    created: {
        type: Date,
        default: Date.now
    },
    free: {
        type: Boolean,
        default: false
    },
    title: {
        type: String,
        default: 'Mass Hire #' + Math.floor(Math.random() * 100000),
    },
    status: {
        type: String,
        default: 'pending' // pending-finished
    },
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    resources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

massHireResourceSchema.plugin(deepPopulate);

module.exports = mongoose.model('MassHireResource', massHireResourceSchema);
