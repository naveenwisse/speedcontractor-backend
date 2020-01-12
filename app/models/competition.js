var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var competitorSchema = require('pp/models/sub-schema/competitor');
var Schema = mongoose.Schema;

var competitionSchema = new Schema({
    title: String,
    description: String,
    // the type property is required by the calendar
    type: {
        type: String,
        default: 'success'
    },
    startsAt: Date,
    endsAt: Date,
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    modelType: {
        type: String,
        default: 'COMPETITION'
    },
    competitors: {
        type: [competitorSchema],
        default: []
    },
    pendingCompetitors: Number,
    charge: String,
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product',
        default: []
    }],
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review',
        default: []
    }],
    finalized: {
        type: Boolean,
        default: false
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

competitionSchema
    .virtual('cutOff')
    .get(function() {
        var now = new Date(),
            end = new Date(this.startsAt),
            cutOff = new Date(
                end.getFullYear(),
                end.getMonth(),
                end.getDate() - 2,
                end.getHours(),
                end.getMinutes());
        return (now > cutOff);
    });

competitionSchema
    .virtual('ended')
    .get(function() {
        var now = new Date(),
            end = new Date(this.endsAt);
        return (now > end);
    });

competitionSchema.plugin(deepPopulate);

module.exports = mongoose.model('Competition', competitionSchema);
