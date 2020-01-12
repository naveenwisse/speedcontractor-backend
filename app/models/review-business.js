var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var reviewBusinessSchema = new Schema({
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    resource: {
        type: Schema.Types.ObjectId,
        ref: 'Resource'
    },
    rating_money: {
        type: Number,
        default: 1
    },
    rating_prof: {
        type: Number,
        default: 1
    },
    rating_over: {
        type: Number,
        default: 1
    },
    review: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    modelType: {
        type: String,
        default: 'REVIEW'
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

reviewBusinessSchema.index({ product: 1 });
reviewBusinessSchema.plugin(deepPopulate);

module.exports = mongoose.model('ReviewBusiness', reviewBusinessSchema);
