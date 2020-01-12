var mongoose = require('mongoose');
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var imageSchema = require('pp/models/sub-schema/image');
var Schema = mongoose.Schema;

var productSchema = new Schema({
    name: String,
    image: imageSchema,
    description: String,
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    type: String,
    rating: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        default: 0
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review',
        default: []
    }],
    modelType: {
        type: String,
        default: 'PRODUCT'
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

productSchema.plugin(deepPopulate);

module.exports = mongoose.model('Product', productSchema);
