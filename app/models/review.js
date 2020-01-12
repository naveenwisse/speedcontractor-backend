var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var Schema = mongoose.Schema;

var reviewSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product'
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    tasting: {
        type: Schema.Types.ObjectId,
        ref: 'Tasting'
    },
    competition: {
        type: Schema.Types.ObjectId,
        ref: 'Competition'
    },
    rating: {
        type: Number,
        default: 0
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

reviewSchema.index({ product: 1 });
reviewSchema.plugin(deepPopulate);

module.exports = mongoose.model('Review', reviewSchema);
