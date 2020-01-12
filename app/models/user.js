'use strict';

const mongoose = require('mongoose');
const deepPopulate = require('mongoose-deep-populate')(mongoose);
const moment = require('moment');
const slugify = require('slugify');

const {
    educationSchema,
    skillsSchema,
    technicalTermSchema,
    positionSchema
} = require('pp/models/sub-schema');

var Schema = mongoose.Schema;

var userSchema = new Schema({
    facebookUserId: {
        type: String,
        select: false,
        index: {
            unique: true,
            sparse: true
        }
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    slug: {
        type: String,
        lowercase: true,
        default: ''
    },
    emailConfirmToken: {
        type: String,
        select: false
    },
    emailConfirm: {
        type: Boolean,
        default: false
    },
    name: String,
    birthday: Date,
    signupDate: {
        type: Date,
        default: new Date()
    },
    password: {
        type: String,
        select: false
    },
    image: {
        type: String,
        default: 'i/default-user-image.png'
    },
    coverImage: {
        type: String,
        default: ''
    },
    certificates: {
        type: [String],
        default: []
    },
    formattedAddress: String,
    loc: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [Number]
    },
    roles: {
        type: [String],
        default: ['user']
    },
    status: {
        type: String,
        default: 'active' // active, suspend
    },
    address1: String,
    address2: String,
    city: String,
    regionId: String,
    postalCode: String,
    country: String,
    homePhone: String,
    mobilePhone: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    terms: {
        type: [technicalTermSchema],
    },
    overallSkill: {
        type: Number,
        default: 0
    },
    skill: {
        type: [Number],
        default: [25.0, 8.333333333333334]
    },
    ratingCount: {
        type: Number,
        default: 0
    },
    businesses: [{
        type: Schema.Types.ObjectId,
        ref: 'Business',
        default: []
    }],
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
    conflict: [{
        type: Schema.Types.ObjectId,
        ref: 'Conflict',
        default: []
    }],
    resources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    pendingResources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    rateBusinessResources: [{
        type: Schema.Types.ObjectId,
        ref: 'Resource',
        default: []
    }],
    myMassHireResource: [{
        type: Schema.Types.ObjectId,
        ref: 'MassHireResource',
        default: []
    }],
    pendingCompetitions: [{
        type: Schema.Types.ObjectId,
        ref: 'PendingCompetition',
        default: []
    }],
    competitions: [{
        type: Schema.Types.ObjectId,
        ref: 'Competition',
        default: []
    }],
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review',
        default: []
    }],
    positions: {
        type: [positionSchema],
        default: []
    },
    skills: {
        type: [skillsSchema],
        default: []
    },
    education: {
        type: [educationSchema],
        default: []
    },
    termsOfService: {
        type: Boolean,
        default: true,
        set: function() {
            return this.termsOfService;
        }
    },
    stripeAccount: {
        type: Schema.Types.ObjectId,
        ref: 'StripeAccount'
    }
}, {
    toObject: {
        virtuals: true
    },
    toJSON: {
        virtuals: true
    }
});

userSchema.virtual('age').get(function() {
    if (this.birthday) {
        return moment().diff(this.birthday, 'years');
    }
});

userSchema.pre('save', function(next) {
    if (this._id && this.name && !this.slug) {
        this.slug = `/u/${ this._id }/${ slugify(this.name) }`;
    }
    next();
});

userSchema.index({ "loc": "2dsphere" });
userSchema.plugin(deepPopulate);

module.exports = mongoose.model('User', userSchema);
