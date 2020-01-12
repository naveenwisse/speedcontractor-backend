const mongoose = require('mongoose');
const deepPopulate = require('mongoose-deep-populate')(mongoose);
const slugify = require('slugify');

const {
    userScoreSchema,
    employeeSchema
} = require('pp/models/sub-schema');

var Schema = mongoose.Schema;

var businessSchema = new Schema({
    companyName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: 'active'
    },
    slug: {
        type: String,
        lowercase: true,
        default: ''
    },
    email: {
        type: String,
        lowercase: true,
        required: true
    },
    image: {
        type: String,
        default: 'i/default-user-image.png'
    },
    coverImage: {
        type: String,
        default: ''
    },
    description: String,
    phone: String,
    formattedAddress: String,
    loc: {
        type: {
            type: String
        },
        coordinates: [Number]
    },
    address1: String,
    address2: String,
    city: String,
    regionId: String,
    postalCode: String,
    country: String,
    events: [{
        type: Schema.Types.ObjectId,
        ref: 'Event',
        default: []
    }],
    resources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    usersAdmin: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: []
    }],
    rateResources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    rating_money: {
        type: Number,
        default: 0
    },
    total_money: {
        type: Number,
        default: 0
    },
    rating_prof: {
        type: Number,
        default: 0
    },
    total_prof: {
        type: Number,
        default: 0
    },
    rating_over: {
        type: Number,
        default: 0
    },
    total_over: {
        type: Number,
        default: 0
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'ReviewBusiness',
        default: []
    }],
    pendingResources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    myMassHireResource: [{
        type: Schema.Types.ObjectId,
        ref: 'MassHireResource',
        default: []
    }],
    // tastings this business created
    myTastings: [{
        type: Schema.Types.ObjectId,
        ref: 'Tasting',
        default: []
    }],
    // tastings this business is hosting
    pendingTastings: [{
        type: Schema.Types.ObjectId,
        ref: 'Tasting',
        default: []
    }],
    tastings: [{
        type: Schema.Types.ObjectId,
        ref: 'Tasting',
        default: []
    }],
    // competitions this business created
    myCompetitions: [{
        type: Schema.Types.ObjectId,
        ref: 'Competition',
        default: []
    }],
    // competitions this business is participating in
    competitions: [{
        type: Schema.Types.ObjectId,
        ref: 'Competition',
        default: []
    }],
    // products this business uses for tastings and competitions
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product',
        default: []
    }],
    accept: {
        type: Boolean,
        default: true,
        set: function() {
            return this.accept;
        }
    },
    emailConfirmToken: {
        type: String,
        select: false
    },
    pending: {
        type: Boolean,
        default: true
    },
    recentUserJobScores: {
        type: [userScoreSchema],
        default: []
    },
    employees: {
        type: [employeeSchema],
        default: []
    },
    stripeAccount: {
        type: Schema.Types.ObjectId,
        ref: 'StripeAccount'
    },
    conflict: [{
        type: Schema.Types.ObjectId,
        ref: 'Conflict',
        default: []
    }],
    galleryPhotoVideos: {
        type: [{ source: String, title: String, comment: String, itemType: String, category: String}],
        /*
        itemType: "img" or "video"
        category: {
            "facility":"Facility Images/Videos",
            "promotional":"Promotional Special",
            "amentities":"Amenities",
            "benefits":"Benefits",
            "foodlist":"Food Lists",
            "drinklist":"Drink Lists",
            "winelist":"Wine Lists"
        }*/
        default: []
    },
    eventFree: {
        status: {
            type: Boolean,
            default: true
        },
        event: {
            type: Schema.Types.ObjectId,
            ref: 'Event'
        },
        used: Date,
    },
    jobFree: {
        status: {
            type: Boolean,
            default: true
        },
        job: {
            type: Schema.Types.ObjectId,
            ref: 'Event'
        },
        used: Date,
    }
});

businessSchema.index({ "loc": "2dsphere" });
businessSchema.index({ "companyName": "text" });
businessSchema.index({ _id: 1, usersAdmin: 1 }, { unique: true });
businessSchema.plugin(deepPopulate);

businessSchema.pre('save', function(next) {
    if (this._id && this.companyName && !this.slug) {
        this.slug = `/b/${ this._id }/${ slugify(this.companyName) }`;
    }
    next();
});

module.exports = mongoose.model('Business', businessSchema);
