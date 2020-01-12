'use strict';

var bcrypt = require('bcryptjs'),
    crypto = require('crypto'),
    request = require('request'),
    https = require('https'),
    async = require('async'),
    q = require('q'),
    moment = require('moment'),
    Hashids = require('hashids'),
    hashids = new Hashids('Speed Contractor Hashids'),
    co = require('co');
const Promise = require('bluebird');
//const mandrill = require('node-mandrill')('qyWPKiR-JFh40H3U4m6O6A');
//var plivo = require('plivo');
// const p = plivo.RestAPI({
//     authId: 'MAN2M2MJQ4YWQWMJGYZW',
//     authToken: 'OTg3YjU3OGMzNGViYmRiYTRmYjQ5NWU3YTFhYTk3'
// });
const {
    Invite,
    Resource,
    Event,
    Business,
    User,
    Tasting,
    Product,
    Review,
    ReviewBusiness,
    Competition,
//    PendingCompetition,
    MassHireResource
} = require('pp/models'),
    stripeAccountService = require('pp/services/stripe'),
    termsService = require('pp/services/terms'),
    ConflictService = require('pp/services/conflict'),
    boostableJobsService = require('pp/services/boost-jobs'),
    ratingService = require('pp/services/rating'),
    notificationService = require('pp/services/notification');

// This function is fully optimized
function verifyFBToken(input_token) {
    var deferred = q.defer();
    https.request({
        host: 'graph.facebook.com',
        path: '/debug_token?input_token=' + input_token + '&access_token=1627077040949992|gZeMi_dAmYQuXVp_cH32f_MRN_U'
    }, function(response) {
        var str = '';
        response.on('data', function(chunk) {
            str += chunk;
        });
        response.on('end', function() {
            deferred.resolve(JSON.parse(str));
        });
    }).end();
    return deferred.promise;
}

// This function is fully optimized
function verifyFBReauth(access_token) {
    var deferred = q.defer();
    https.request({
        host: 'graph.facebook.com',
        path: '/oauth/access_token_info?client_id=1627077040949992|gZeMi_dAmYQuXVp_cH32f_MRN_U&access_token=' + access_token
    }, function(response) {
        var str = '';
        response.on('data', function(chunk) {
            str += chunk;
        });

        response.on('end', function() {
            deferred.resolve(JSON.parse(str));
        });
    }).end();
    return deferred.promise;
}


exports.signup = function(user, next) {
    bcrypt.hash(user.password, 10, function(err, hash) {
        if (err) return next(err);
        user.password = hash;
        termsService.getDefaultTerms((err, terms) => {
            if (err) next(err, null);
            else {
                User.create({
                    name: user.name,
                    email: user.email,
                    password: user.password,
                    birthday: user.birthday,
                    emailConfirmToken: user.emailConfirmToken,
                    loc: {
                        type: 'Point',
                        coordinates: [-47.097515, -79.709616]
                    },
                    terms,
                }, next);
            }
        });
    });
};


exports.addCompetition = function() {//  parameter: user
    // User.findOne({ email: user.email }, function(err, us) {
    //     if (err) {
    //         console.log(err);
    //     } else {
    //         Invite.findOne({
    //             inviteToken: user.token
    //         }, function(err, invite) {
    //             if (err) {
    //                 console.log(err);
    //             } else {
    //                 if (invite && invite.competition) {
    //                     let pendingCompetition = new PendingCompetition({
    //                         competition: invite.competition,
    //                         business: invite.business,
    //                         competitor: invite.competitor
    //                     });
    //                     pendingCompetition.save(function(err) {
    //                         if (err) {
    //                             console.log(err);
    //                         } else {
    //                             us.pendingCompetitions.push(pendingCompetition);
    //                             us.save(function(err) {
    //                                 if (err) console.log(err);
    //                             });
    //                         }
    //                     });
    //                 }
    //             }
    //         });
    //     }
    // });
};


exports.signupFacebook = function(user, next) {
    verifyFBToken(user.token).then(function(tokenData) {
        if (tokenData.data.is_valid) {
            User.create({
                name: user.name,
                email: user.email,
                birthday: user.birthday,
                emailConfirmToken: user.emailConfirmToken,
                facebookUserId: tokenData.data.user_id,
                loc: {
                    type: 'Point',
                    coordinates: [-47.097515, -79.709616]
                }
            }, next);
        } else {
            return next('Authentication failed. User invalid token.' +
                JSON.stringify(tokenData));
        }
    });
};


exports.login = function(req, next) {
    // find the user
    User.findOne({
            email: req.body.email
        }, `
            _id
            slug
            name
            email
            emailConfirm
            birthday
            password
            positions
            businesses
            image
            coverImage
            loc
            roles
        `)
        .populate('businesses', '_id slug companyName image')
        .exec(function(err, user) {
            console.log('login user object', user);
            if (err) {
                next(err);
            } else if (!user) {
                next('Authentication failed. User not found.');
            } else {
                // check if password matches
                bcrypt.compare(req.body.password, user.password, function(err, matches) {
                    if (matches) {
                        // unset for response
                        user.password = undefined;
                        return next(null, user);
                    } else {
                        return next('Authentication failed. Wrong password.');
                    }
                });
            }
        });
};


exports.loginFacebook = function(req, next) {
    verifyFBToken(req.body.token).then(function(tokenData) {
        // find the user
        if (tokenData.data.is_valid) {
            User.findOne({
                    facebookUserId: tokenData.data.user_id
                }, `
                    _id
                    slug
                    name
                    email
                    emailConfirm
                    birthday
                    positions
                    businesses
                    image
                    coverImage
                    loc
                    roles
                `)
                .populate('businesses', '_id slug companyName image')
                .exec(next);
        } else {
            return next('Authentication failed. User invalid token.');
        }
    });
};


exports.registerBusiness = function(req, next) {
    const authUserId = req.authUserId;
    const token = crypto.randomBytes(20).toString('hex');

    Business.create({
        email: req.body.email,
        emailConfirmToken: token,
        companyName: req.body.companyName,
        usersAdmin: [
            authUserId
        ],
        loc: {
            type: 'Point',
            coordinates: [-47.097515, -79.709616]
        }
    }).then(function(business) {

        return User.findOneAndUpdate({
            _id: authUserId
        }, {
            $addToSet: {
                businesses: business._id
            }
        }).then(function() {
            next(null, business);
        });

    }).catch(next);
};


exports.acceptBusiness = function(req, next) {
    Business.findOneAndUpdate({
            _id: req.query.id,
            emailConfirmToken: req.query.token
        }, {
            $set: {
                pending: false
            },
            $unset: {
                emailConfirmToken: ''
            }
        }, {
            fields: 'companyName usersAdmin'
        })
        .populate('usersAdmin', 'email')
        .exec(function(err, business) {
            next(err, business);
        });
};


exports.getProfileAuthenticated = function(req, next) {

    User.findOne({
            _id: req.authUserId,
        }, `
            -signupDate
            -password
            -resetPasswordToken
            -resetPasswordExpires
            -termsOfService
        `)
        .populate([{
            path: 'businesses',
            select: 'companyName slug image status',
        }, {
            path: 'conflict',
            select: 'type events tastings resources startTime endTime accepted',
            populate: [{
                path: 'events',
                select: 'title startsAt endsAt formattedAddress business'
            }, {
                path: 'resources',
                select: 'title accepted business modelType event formattedAddress',
                populate: [
                {
                    path: 'business',
                    select: 'companyName slug image status'
                }, {
                    path: 'event',
                    select: 'title'
                }]
            }, {
                path: 'tastings',
                select: 'title startTime endTime modelType formattedAddress business tastingType',
                populate: [{
                    path: 'business',
                    select: 'companyName slug image status'
                }],
            }]
        }, {
            path: 'resources',
            select: 'startTime endTime title accepted business modelType event formattedAddress',
            populate: [{
                path: 'business',
                select: 'companyName slug image status',
            }, {
                path: 'event',
                select: 'title'
            }],
            match: {
                accepted: {
                    $eq: true
                },
                users: {
                    $in: [req.authUserId]
                }
                // },
                // endTime: {
                //     $gte: new Date().toISOString()
                // }
            }
        }, {
            path: 'pendingCompetitions',
            select: 'competition business competitor',
            populate: [{
                path: 'business',
                select: 'slug image companyName formattedAddress status'
            }, {
                path: 'competition'
            }]
        }, {
            path: 'pendingResources',
            select: `
                title
                startTime
                endTime
                formattedAddress
                business
                compensation
                attire
                busAttire
                additional
                event
            `,
            populate: [{
                path: 'business',
                select: 'companyName slug image status',
            }, {
                path: 'event',
                select: 'title'
            }],
            match: {
                invitedUsers: {
                    $in: [req.authUserId]
                }
            }
        }, {
            path:'rateBusinessResources',
            select: 'business title startTime endTime formattedAddress',
            match: {
                rated2Business: {
                    $eq: false
                }
            },
            populate: [
                {
                    path: 'business',
                    select: 'companyName slug image status'
                }]
        }, {
            path: 'tastings',
            select: 'title startTime endTime formattedAddress business tastingType',
            match: {
                endTime: {
                    $gte: new Date().toISOString()
                }
            },
            populate: {
                path: 'business',
                select: 'companyName slug status'
            }
        }, {
            path: 'competitions',
            populate: [{
                path: 'business',
                select: 'slug image companyName formattedAddress status'
            }, {
                path: 'products',
                select: 'reviews name',
                populate: {
                    path: 'reviews',
                    select: 'user competition tasting'
                }
            }]
        }, {
            path: 'events',
            select: 'title startsAt endsAt formattedAddress business',
            match: {
                endsAt: {
                    $gte: new Date().toISOString()
                }
            },
            populate: {
                path: 'business',
                select: 'companyName slug status'
            }
        }, {
            path: 'myMassHireResource',
            match: { status: 'pending' },
            populate: {
                path: 'resources',
                populate: [{
                    path: 'business',
                    select: 'companyName slug image status'
                }]
            }
        }])
        .lean()
        .exec(function(err, user) {

            if (user) {
                user.reviewProducts = [];
                user.competitions.forEach((comp) => {
                    comp.products.forEach((prd) => {
                        var found = false;
                        for (var i = 0; i < prd.reviews.length; i++) {
                            if (prd.reviews[i].user == req.authUserId
                                && String(prd.reviews[i].competition) === String(comp._id)) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            user.reviewProducts.push({
                                product: prd._id,
                                productName: prd.name,
                                competition: comp._id,
                                competitionName: comp.title,
                                slug: comp.business.slug
                            });
                        }
                    })
                });
                var changed = false,
                    i = 0,
                    now = new Date(),
                    resEndDate;

                // if a resource is part of an event, remove it from the feed
                // console.log("now time = ", now.toISOString(), ", ", now.toDateString());
                // console.log("getProfileAuthenticated ---------- user", user.resources);
                for (; i < user.resources.length; i++) {
                    resEndDate = new Date(user.resources[i].endTime);
                    if ((resEndDate && now > resEndDate) && (!user.resources[i].requiresFinish)) {
                        if (!user.resources[i].unfilled || user.resources[i].accepted) { // Resources is filled, resource empty is removed
                            user.rateBusinessResources.push(user.resources[i]);
                            console.log(user.resources[i]._id);
                            user.resources.splice(i, 1);
                            changed = true;
                        }
                        if (!changed && !user.resources[i].requiresFinish) {
                            console.log(user.resources[i]._id);
                            user.resources.splice(i, 1);
                            changed = true;                            
                        }
                    } else {
                        // matchFound = false;
                        // user.events.forEach(function(event) {
                        //     if (String(event._id) === String(user.resources[i].event)) matchFound = true;
                        // });
                        // if (!matchFound) user.feed.push(user.resources[i]);
                    }
                }

                let pr = user.pendingResources || [];
                for (; i < pr.length; i++) {
                    resEndDate = new Date(user.pendingResources[i].endTime);
                    if (now > resEndDate) {
                        user.pendingResources.splice(i, 1);
                        changed = true;
                    }
                }
                // We don't care about the result, set it and forget it
                if (changed) {
                    User.findOneAndUpdate({
                        _id: user._id
                    }, user, {
                        // The result is discarded so we trim the payload
                        lean: true,
                        select: '_id'
                    }, function(err) {
                        if (err) {
                            console.log('getProfileAuthenticated: Failed to remove users expired ' +
                                'pending resources. UserId[' + user._id + ']');
                        }
                    });
                }
                // Ship it
                Review.find({
                    user: req.authUserId
                }).populate([{
                    path: 'product'
                }]).exec(function(err, reviews) {
                    if (reviews && !err) {
                        user.myReviews = reviews;
                        termsService.getJobTypes((err, jobs) => {
                            if (jobs && !err)
                                next(null, user,jobs)
                            else
                                next(err);
                        });
                    } else {
                        next(err);
                    }
                });
            } else {
                return next('User doesn\'t exist.', user);
            }
        });
};

exports.getBusinessReviews = function(req, next) {
    if(req.body.businessId == 0){
        Business.find({

        })
        .exec(function(err, businesss) {
            next(err, businesss);
        });
    }
    else{
        Business.findOne({
            _id: req.body.businessId,
        })
        .exec(function(err, business) {
            if (business && !err) {
                // if (req.body.optionalArray && req.body.optionalArray.length > 0)
                // {
                    ReviewBusiness.find({
                            business: req.body.businessId,
                        })
                        .populate('resource', 'title')
                        .exec(function(err, reviews) {
                            next(err, reviews);
                        });
            } else {
                next(err, business);
            }
        });
    }
};

exports.getProfilePublic = function(req, next) {
    User.findOne({
            _id: req.body._id
        }, `
            name
            image
            slug
            coverImage
            city
            ratingCount
            overallSkill
            skills
            education
            positions
        `).lean()
        .exec(next);
};


exports.getBusinessAuthenticated = function(req, next) {
    Business
        .findOne({
            _id: req.body._id
        })
        .deepPopulate([
            'usersAdmin',
            'events.resources',
            'pendingResources.filled',
            'resources.filled',
            'rateResources.filled',
            'pendingTastings.business',
            'myTastings.businessVenue',
            'tastings.business',
            'employees.user',
            'myCompetitions',
            'competitions.business',
            'employees.user',
            'competitors.business',
            'conflict',
            'products',
            'myMassHireResource.resources'
        ], {
            populate: {
                'usersAdmin': {
                    select: 'name slug'
                },
                'events': {
                    match: {
                        endsAt: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'pendingTastings': {
                    select: '-code',
                    match: {
                        endTime: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'myCompetitions': {
                    match: {
                        finalized: {
                            $eq: false
                        }
                    }
                },
                'myTastings': {
                    select: '-code',
                    match: {
                        endTime: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'myTastings.businessVenue': {
                    select: 'companyName image formattedAddress'
                },
                'tastings': {
                    select: '-code',
                    match: {
                        endTime: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'competitions': {
                    match: {
                        finalized: {
                            $eq: false
                        }
                    }
                },
                'tastings.business': {
                    select: 'image slug companyName formattedAddress'
                },
                'competitions.business': {
                    select: 'slug image companyName formattedAddress'
                },
                'pendingResources.business': {
                    select: 'companyName slug'
                },
                'resources.business': {
                    select: 'companyName slug'
                },
                'pendingResources.filled': {
                    select: '-password -termsOfService -emailConfirm'
                },
                'resources.filled': {
                    select: '-password -termsOfService -emailConfirm'
                },
                'rateResources': {
                    select: 'filled title startTime endTime formattedAddress accepted',
                    match: {
                        rated: {
                            $eq: false
                        }
                    }
                },
                'rateResources.filled': {
                    select: 'name image'
                },
                'employees.user': {
                    select: 'name slug image'
                },
                'reviews':{
                    select: ''
                }

            }
        })
        .exec(function(err, business) {
            if (!business) {
                return next('Business doesn\'t exist.', business);
            } else if (business.pending) {
                next(err, { businessPending: true });
            } else {
                business = business.toObject();
                var changed = false,
                    i = 0,
                    now = new Date(),
                    resEndDate,
                    matchFound = false;

                business.feed = [].concat(business.events);
                business.feed = business.feed.concat(business.myTastings);
                business.feed = business.feed.concat(business.myCompetitions);

                // if a resource is part of an event, remove it from the feed
                for (; i < business.resources.length; i++) {
                    resEndDate = new Date(business.resources[i].endTime);
                    if ((resEndDate && now > resEndDate) && (!business.resources[i].requiresFinish)) {
                        if (!business.resources[i].unfilled || business.resources[i].accepted) { // Resources is filled, resource empty is removed
                            business.rateResources.push(business.resources[i]);
                            console.log(business.resources[i]._id);
                            business.resources.splice(i, 1);
                            changed = true;
                        }
                        if (!changed && !business.resources[i].requiresFinish) {
                            console.log(business.resources[i]._id);
                            business.resources.splice(i, 1);
                            changed = true;                            
                        }
                    } else {
                        matchFound = false;
                        business.events.forEach(function(event) {
                            if (String(event._id) === String(business.resources[i].event)) matchFound = true;
                        });
                        if (!matchFound) business.feed.push(business.resources[i]);
                    }
                }

                // if a resource is part of an event, remove it from the feed
                for (i = 0; i < business.pendingResources.length; i++) {
                    resEndDate = new Date(business.pendingResources[i].endTime);
                    if (resEndDate && now > resEndDate && !business.pendingResources[i].requiresFinish) {
                        console.log(business.pendingResources[i]._id);
                        if (business.pendingResources[i].accepted)
                            business.rateResources.push(business.pendingResources[i]._id);
                        business.pendingResources.splice(i, 1);
                        changed = true;
                    }
                    /*if (now > resEndDate) {
                        business.pendingResources.splice(i, 1);
                        changed = true;
                    } */else {
                        matchFound = false;
                        business.events.forEach(function(event) {
                            if (String(event._id) === String(business.pendingResources[i].event)) matchFound = true;
                        });
                        if (!matchFound) business.feed.push(business.pendingResources[i]);
                    }
                }

                // if a this business is hosting its own tasting, don't show it in the feed
                for (i = 0; i < business.pendingTastings.length; i++) {
                    resEndDate = new Date(business.pendingTastings[i].endTime);
                    if (now > resEndDate) {
                        business.pendingTastings.splice(i, 1);
                        changed = true;
                    }
                }

                // We don't care about the result, set it and forget it
                if (changed) {
                    Business.findOneAndUpdate({
                        _id: business._id
                    }, business, {
                        // The result is discarded so we trim the payload
                        lean: true,
                        select: '_id'
                    }, function(err) {
                        if (err) {
                            console.log('getBusiness: Failed to remove business\'s expired ' +
                                'pending resources or tastings. BusinessId[' + business._id + ']');
                        }
                    });
                }

                business.isUser = true;
                business.feed = business.feed.filter(Boolean);
                business.pendingCompetitions = business.competitions.filter(function(competition) {
                    return competition.competitors.some(function(competitor) {
                        return String(competitor.business) === String(business._id) && competitor.status === 'pending';
                    });
                });
                business.pendingFilledResources = business.pendingResources.filter(function(resource) {
                    return resource.filled;
                });

                // Ship it
                next(err, business);

            }
        });
};

exports.getBusinessPublic = function(req, next) {
    Business.findOne({
            _id: req.body._id
        }, `
            companyName
            slug
            name
            image
            coverImage
            description
            phone
            formattedAddress
            email
            events
            resources
            pendingResources
            myTastings
            myCompetitions
            address1
            address2
            city
            regionId
            postalCode
            country
        `)
        .deepPopulate(['events.resources', 'myTastings.businessVenue', 'myCompetitions', 'resources.business', 'pendingResources.business'], {
            populate: {
                'events': {
                    match: {
                        endsAt: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'events.resources': {
                    select: '-filled',
                },
                'myTastings': {
                    select: '-code',
                    match: {
                        endTime: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'myTastings.businessVenue': {
                    select: 'companyName slug image formattedAddress'
                },
                'myCompetitions': {
                    match: {
                        endsAt: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'resources': {
                    select: '-filled',
                    match: {
                        endTime: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'resources.business': {
                    select: 'companyName slug'
                },
                'pendingResources': {
                    select: '-filled',
                    match: {
                        endTime: {
                            $gte: new Date().toISOString()
                        }
                    }
                },
                'pendingResources.business': {
                    select: 'companyName slug'
                }
            }
        })
        .lean()
        .exec(function(err, business) {
            if (!business) {
                next('Business doesn\'t exist.', business);
            } else if (business.pending) {
                next(err, null);
            } else {
                var i = 0,
                    matchFound = false;

                business.feed = [].concat(business.events);
                business.feed = business.feed.concat(business.myTastings);
                business.feed = business.feed.concat(business.myCompetitions);
                // if a resource is part of an event, remove it from the feed
                for (; i < business.resources.length; i++) {
                    matchFound = false;
                    business.events.forEach(function(event) {
                        if (String(event._id) === String(business.resources[i].event)) matchFound = true;
                    });
                    if (!matchFound) business.feed.push(business.resources[i]);
                }
                // if a resource is part of an event, remove it from the feed
                for (i = 0; i < business.pendingResources.length; i++) {
                    matchFound = false;
                    business.events.forEach(function(event) {
                        if (String(event._id) === String(business.pendingResources[i].event)) matchFound = true;
                    });
                    if (!matchFound) business.feed.push(business.pendingResources[i]);
                }
                // Ship it
                next(err, business);
            }
        });
};

exports.checkIfAuthUserIsBusinessAdmin = function(req, next) {
    const authUserId = req.authUserId;
    if (!authUserId) {
        next(null, false);
    } else {
        Business
            .findOne({
                _id: req.body._id,
                usersAdmin: {
                    $eq: req.authUserId
                }
            })
            .select('_id')
            .lean()
            .exec(function(err, business) {
                next(null, !!business);
            });
    }
};


exports.getFeed = function(req, next) {
    var now = new Date(),
        and = [{
            loc: {
                $near: {
                    $maxDistance: 50000,
                    $geometry: {
                        type: 'Point',
                        coordinates: [
                            req.body.lon,
                            req.body.lat
                        ]
                    }
                }
            }
        }, {
            endTime: {
                $gte: now.toISOString()
            }
        }, {
            _id: {
                // todo: Long term, we will _not_ want to have the client
                // pass in a list of resource to kick out of the feed.
                // we need to find a way to do this server side
                $nin: req.body.resources.map(function(obj) {
                    return obj._id;
                })
            }
        }, {
            // todo: Also don't want the client request providing this
            // data. See comment above about the _id resources check
            title: {
                $in: req.body.positions
            }
        }, {
            users: {
                $ne: req.authUserId
            }
        }, {
            accepted: {
                $eq: true
            }
        }, {
            'business.status': 'active'
        }];
    // Kicks out resources that may overap with things
    // we already have going on
    req.body.resources.forEach(function(resource) {
        var resourceMoment = moment(resource.endTime);
        if (resourceMoment.isSame(now) || resourceMoment.isAfter(now)) {
            and.push({
                $or: [{
                    startTime: {
                        $gt: resource.endTime
                    }
                }, {
                    endTime: {
                        $lt: resource.startTime
                    }
                }]
            });
        }
    });
    const resourceQuery = Resource
        .find({
            $and: and
        })
        .sort({
            endTime: -1
        })
        .limit(10)
        .populate({
            path: 'business',
            model: 'Business',
            select: 'companyName slug image city regionId status'
        })
        .populate({
            path: 'event',
            model: 'Event',
            select: 'title description'
        })
        .lean();
    const tastingQuery = Tasting
        .find({
            $or: [{
                tastingType: 'PUBLIC',
                levelArray: {
                    $in: req.body.positions
                }
            }, {
                tastingType: 'STAFF',
                business: {
                    $in: req.body.businessEmployeer
                }
            }],
            loc: {
                $near: {
                    $maxDistance: 50000,
                    $geometry: {
                        type: 'Point',
                        coordinates: [
                            req.body.lon,
                            req.body.lat
                        ]
                    },
                }
            },
            endTime: {
                $gte: new Date(now.toISOString()),
            },
            users: {
                $ne: req.authUserId
            },
            accepted: {
                $eq: true
            },
            atCapacity: {
                $eq: false
            }
        })
        .sort({
            endTime: -1
        })
        .limit(10)
        .populate({
            path: 'business',
            model: 'Business',
            select: 'companyName slug image formattedAddress status'
        })
        .populate({
            path: 'businessVenue',
            model: 'Business',
            select: 'companyName slug image formattedAddress status'
        })
        .lean();
    Promise.all([
        resourceQuery,
        tastingQuery
    ]).then(function([resources = [], tastings = []]) {
        tastings = tastings.filter(function(obj) {
            return obj.business.status === 'active' && obj.businessVenue.status === 'active';
        })
        next(null, [...resources, ...tastings]);
    }, next);
};


exports.applyResource = function(req, next) {
    Resource.findOneAndUpdate({
        _id: req.body.resourceId,
        users: {
            $ne: req.authUserId
        }
    }, {
        $addToSet: {
            users: req.authUserId
        }
    }, {
        fields: '_id business',
        lean: true
    }).then(function(resource) {
        if (resource) {
            Business.findById(resource.business, (err, business) => {
                if (business) {
                    // notify business
                    notificationService.notify(notificationService.notifyTypes.applyResourceBusiness,
                        {
                            to: business.email
                        });
                } else {
                    console.log('Err: business not found to notify.')
                }
            })
            next(null, resource);
        } else {
            next('User already applied.', resource);
        }
    }, next);
};

exports.applyResourceJob = function(req, next) { // falta dar true al accepted del resource
    Resource.findOneAndUpdate({
        _id: req.body.resourceId,
        users: {
            $ne: req.authUserId
        }
    }, {
        $addToSet: {
            users: req.authUserId
        },
        accepted: true,
        unfilled: false,
        filled: req.authUserId
    }, {
        fields: '_id business',
        lean: true
    }).then(function(resource) {
        if (resource) {
            Business.findById(resource.business, (err, business) => {
                if (business) {
                    const index = business.pendingResources.indexOf(resource.business);
                    business.pendingResources.splice(index, 1);
                    business.resources.push(resource._id);
                    business.save();
                    // notify business
                    notificationService.notify(notificationService.notifyTypes.applyResourceBusiness,
                        {
                            to: business.email
                        });
                } else {
                    console.log('Err: business not found to notify.')
                }
            })
            ConflictService.createAndResolve('Resource', req.body.resourceId, req.body.startTime, req.body.endTime, req.authUserId, true)
            .then((conflictId) => {
                User.findOneAndUpdate({
                    '_id': req.authUserId
                }, {
                    $push: {
                        conflict: conflictId,
                        resources: resource._id
                    }
                })
                .then(() => {
                    next(null, resource);                    
                })
                .catch(() => {
                    next('Err associating conflict to user', conflictId);
                });
            })
            .catch(() => {
                next('Err creating conflict to user', req.body.resourceId);
            });
        } else {
            next('User already applied.', resource);
        }
    }, next);
};

exports.attendTasting = function() {//req, next
    // const tastingId = req.body.tastingId;
    // const userId = req.authUserId;
    // Tasting.findOne({
    //         _id: tastingId,
    //         users: {
    //             $ne: userId
    //         }
    //     })
    //     .select('users capacity atCapacity code title business')
    //     .exec(function(err, tasting) {
    //         if (tasting && !err) {
    //             if (tasting.atCapacity) {
    //                 next('This tasting is at capacity.', tasting);
    //             } else {
    //                 // Push user onto tasting's users collection
    //                 tasting.users.push(userId);
    //                 if (tasting.users.length === tasting.capacity) tasting.atCapacity = true;
    //                 tasting.save();
    //                 Tasting.findOne({
    //                     _id: tasting._id
    //                 }).then((rtas) => {
    //                     // Push tasting onto user's tastings collection
    //                     User.findOneAndUpdate({
    //                         _id: userId
    //                     }, {
    //                         // we can $push rather than $addToSet since we are already checking
    //                         // to make sure tastingId is not in the users model when we findOne()
    //                         $push: {
    //                             tastings: tastingId
    //                         }
    //                     }, {
    //                         fields: '_id',
    //                         lean: true
    //                     }).exec(function(err, user) {
    //                         if (err || !user) {
    //                             console.log('aca');
    //                             console.log(err, user);
    //                         } else {
    //                             ConflictService.createAndResolve('Tasting', tastingId, rtas.startTime, rtas.endTime, req.authUserId)
    //                             .then((conflictId) => {
    //                                 User.findOneAndUpdate({
    //                                     '_id': req.authUserId
    //                                 }, {
    //                                     $push: {
    //                                         conflict: conflictId
    //                                     }
    //                                 }).then(() => {
    //                                     const find = User.findOne({
    //                                         _id: userId
    //                                     }).exec();
    //                                     find.then((us) => {
    //                                         if (us.mobilePhone) {
    //                                             let params = {
    //                                                 'src': '2087619701',
    //                                                 'dst' : us.mobilePhone.replace('+',''),
    //                                                 'text' : 'Assistance in the Speed Contractor Beta.' +
    //                                                     'Confirmed the attendance to "'+ tasting.title +'", here you have the code to do the check-in: ' + tasting.code
    //                                             };

    //                                             p.send_message(params, function (status, response) {
    //                                                 console.log('Status: ', status);
    //                                                 console.log('API Response:\n', response);
    //                                                 console.log('Message UUID:\n', response['message_uuid']);
    //                                                 console.log('Api ID:\n', response['api_id']);
    //                                             });
    //                                         } else {
    //                                             /*
    //                                                 notificationService.notify(notificationService.notifyTypes.attendTastingUser,
    //                                                     {
    //                                                         to: us.email,
    //                                                         htmlParams: {
    //                                                             tastingTitle: tasting.title,
    //                                                             tastingCode: tasting.code
    //                                                             }
    //                                                     });
    //                                              */
    //                                             mandrill('/messages/send', {
    //                                                 "message": {
    //                                                     "text": 'Assistance in the Speed Contractor Beta.\n\n' +
    //                                                         'Confirmed the attendance to "'+ tasting.title +'", here you have the code to do the check-in: ' + tasting.code,
    //                                                     "subject": 'Speed Contractor',
    //                                                     "from_email": "do-not-reply@speedcontractor.com",
    //                                                     "from_name": "Speed Contractor",
    //                                                     "to": [{
    //                                                         "email": us.email,
    //                                                         "name": "New User",
    //                                                         "type": "to"
    //                                                     }],
    //                                                     "tags": [
    //                                                         "user-invite"
    //                                                     ],
    //                                                     "google_analytics_domains": [
    //                                                         "www.speedcontractor.com"
    //                                                     ],
    //                                                     "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
    //                                                     "metadata": {
    //                                                         "website": "www.speedcontractor.com"
    //                                                     }
    //                                                 }
    //                                             }, function(err, response) {
    //                                                 //uh oh, there was an error
    //                                                 if (err) {
    //                                                     console.log(JSON.stringify(err));
    //                                                 } else {
    //                                                     console.log(response);
    //                                                 }
    //                                             });
    //                                         }
    //                                     });
    //                                     next(null, tasting);
    //                                 }).catch(rerr => {
    //                                     next(rerr);
    //                                 })
    //                             }).catch(er => {
    //                                 next(er);
    //                             });
    //                         }
    //                     });
    //                 }).catch(errr => {
    //                     next(errr);
    //                 });
    //             }
    //         } else {
    //             next('Already added to list or tasting not found.', tasting);
    //         }
    //     });
};


exports.checkInTasting = function(req, next) {
    const userId = req.authUserId;

    process.stdout.write(`trying latlong lookup, location is: lat:${req.body.lat}, long:${req.body.lon}`);

    const findQuery = Tasting.findOneAndUpdate({
            _id: req.body.tastingId,
            code: req.body.code,
            users: {
                $eq: userId
            },
            loc: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [
                            req.body.lon,
                            req.body.lat,
                        ],
                    },
                    $maxDistance: 3000,
                }
            }
        }, {
            $addToSet: {
                checkedIn: userId
            }
        })
        .select('products')
        .populate({
            path: 'products',
            model: 'Product',
            select: 'type'
        }).exec();
    findQuery.then((tasting) => {
        if (tasting) {
            // only run boost code if tasting has products
            var boosts = boostableJobsService.getBoosts(tasting.products);
            // if we have things to boost
            if (boosts.length) {
                User.findById(userId).exec(function(err, user) {

                    const defaultLoss = {
                        skill: [25.0, 8.333333333333334],
                        rank: 2
                    };

                    var tempCompetitor;
                    user.terms.forEach(function(term) {
                        if (boosts.includes(term.term) || term.term === 'overallSales') {
                            tempCompetitor = Object.assign({}, defaultLoss);
                            term.rank = 1;
                            ratingService.AdjustPlayers([term, tempCompetitor]);
                            term.overallSkill = ratingService.calculateOverallSkill(term.skill);
                        }
                    });

                    tempCompetitor = Object.assign({}, defaultLoss);
                    user.rank = 1;
                    ratingService.AdjustPlayers([user, tempCompetitor]);
                    user.overallSkill = ratingService.calculateOverallSkill(user.skill);

                    // save the user
                    user.save();
                });
            }
            next(null, tasting);
        } else {
            console.log('No tasting');
            next("No tasting");
        }
    }).catch((err) => {
        console.log('Error: ', err);
        next(err, null);
    });

};


function checkingUser(userId, code, tasting) {
    return new Promise(function(resolve, reject) {
        const query = Tasting.findOneAndUpdate({
                _id: tasting,
                code: code,
                users: {
                    $eq: userId
                }
            }, {
                $addToSet: {
                    checkedIn: userId
                }
            })
            .select('products')
            .populate({
                path: 'products',
                model: 'Product',
                select: 'type'
            })
            .exec();

        query.then((tasting) => {
                // only run boost code if tasting has products
                var boosts = boostableJobsService.getBoosts(tasting.products);
                // if we have things to boost
                if (boosts.length) {
                    User.findById(userId).exec(function(err, user) {

                        const defaultLoss = {
                            skill: [25.0, 8.333333333333334],
                            rank: 2
                        };

                        var tempCompetitor;
                        user.terms.forEach(function(term) {
                            if (boosts.includes(term.term) || term.term === 'overallSales') {
                                tempCompetitor = Object.assign({}, defaultLoss);
                                term.rank = 1;
                                ratingService.AdjustPlayers([term, tempCompetitor]);
                                term.overallSkill = ratingService.calculateOverallSkill(term.skill);
                            }
                        });

                        tempCompetitor = Object.assign({}, defaultLoss);
                        user.rank = 1;
                        ratingService.AdjustPlayers([user, tempCompetitor]);
                        user.overallSkill = ratingService.calculateOverallSkill(user.skill);

                        // save the user
                        user.save(() => {
                            resolve(err, tasting);
                        });
                    });
                } else {
                    resolve(null, tasting);
                }
            })
            .catch((err) => {
                reject(err);
            });
    });
}


exports.addCheckIns = function(req, next) {
    const users = req.body.checkIns;
    const code = req.body.code;
    const tasting = req.body.tastingId;
    const promisesAll = [];
    users.forEach((userId) => {
        promisesAll.push(checkingUser(userId, code, tasting));
    });
    Promise.all(promisesAll).then((result) => {
        next(null, result);
    }).catch((err) => {
        console.log('error: ', err);
        next(err);
    })
};


exports.getEvent = function() {//req, next
    // Event
    //     .findOne({
    //         _id: req.body._id
    //     })
    //     .deepPopulate(['resources.filled', 'resources.users', 'resources.invitedUsers', 'business'], {
    //         populate: {
    //             'resources.filled': {
    //                 select: 'name slug'
    //             },
    //             'resources.users': {
    //                 select: 'name image overallSkill'
    //             },
    //             'resources.invitedUsers': {
    //                 select: 'name image overallSkill'
    //             },
    //             'business': {
    //                 select: 'companyName slug'
    //             }
    //         }
    //     })
    //     .exec(function(err, event) {
    //         if (!event) {
    //             return next('Event doesn\'t exist.', event);
    //         }
    //         next(err, event);
    //     });
};


exports.getTasting = function() {//req, next
    // Tasting
    //     .findOne({
    //         _id: req.body._id
    //     })
    //     .deepPopulate(['business', 'businessVenue', 'products', 'users', 'checkedIn'], {
    //         populate: {
    //             'business': {
    //                 select: 'companyName slug usersAdmin'
    //             },
    //             'businessVenue': {
    //                 select: 'companyName slug'
    //             },
    //             'products': {
    //                 select: 'name description image reviews rating'
    //             },
    //             'users': {
    //                 select: 'slug name image'
    //             },
    //             'checkedIn': {
    //                 select: 'slug name image'
    //             }
    //         }
    //     })
    //     .exec(function(err, tasting) {
    //         if (tasting && !err) {
    //             tasting = tasting.toObject();
    //             if (req.decoded) {
    //                 var isAdmin = tasting.business.usersAdmin.some(function(id) {
    //                     return req.authUserId === String(id);
    //                 });
    //                 if (!isAdmin) {
    //                     delete tasting.code;
    //                 }
    //             } else {
    //                 delete tasting.code;
    //             }
    //             delete tasting.business.usersAdmin;
    //             next(err, tasting);
    //         } else {
    //             return next('Tasting doesn\'t exist.', tasting);
    //         }
    //     });
};


exports.getResource = function(req, next) {
    Resource
        .findOne({
            _id: req.body.resourceId
        })
        .populate({
            path: 'filled',
            model: 'User',
            select: '-password -termsOfService -emailConfirm'
        })
        .populate({
            path: 'users',
            model: 'User',
            select: '-password -termsOfService -emailConfirm'
        })
        .exec(function(err, resource) {
            if (!resource) {
                return next('Resource doesn\'t exist.', resource);
            }
            next(err, resource);
        });
};

exports.getRatingResource = function(req, next) {
    if( req.body.rateType == "toUser" )
        Resource
            .findOne({
                _id: req.body.resourceId
            })
            .select('_id filled title')
            .populate({
                path: 'filled',
                model: 'User',
                select: '_id name'
            })
            .exec(function(err, resource) {
                if (!resource) {
                    return next('Resource doesn\'t exist.', resource);
                }
                // next(err, resource, termsService.getJobQuestions(resource.title));
                termsService.getJobQuestions(resource.title, (err, jobQuestions) => {
                    if (err) next(err, null);
                    else next(null, resource, jobQuestions);
                });
            });
    else
        Resource
            .findOne({
                _id: req.body.resourceId
            })
            .select('_id business title')
            .populate({
                path: 'business',
                model: 'Business',
                select: '_id companyName'
            })
            .exec(function(err, resource) {
                if (!resource) {
                    return next('Resource doesn\'t exist.', resource);
                }
                // next(err, resource, termsService.getJobQuestions(resource.title));
                // termsService.getJobQuestions(resource.title, (err, jobQuestions) => {
                //     if (err) next(err, null);
                if (err) next(err, null);
                else next(null, resource);
                // });
            });
};


exports.deleteEvent = function() {//req, next
    // Event.findByIdAndRemove(req.body.eventId, function(err, event) {
    //     if (event && !err) {
    //         if (!event.cutOff) {
    //             Business.findOne({
    //                 _id: req.body.businessId,
    //                 usersAdmin: {
    //                     $eq: req.authUserId
    //                 }
    //             }, function(err, business) {
    //                 if (business && !err) {
    //                     async.eachSeries(req.body.resources, function(iResource, done) {
    //                         // remove resource from business
    //                         var index = business.resources.indexOf(iResource._id);
    //                         if (index >= 0) {
    //                             console.log('resource in business rateResources: ');
    //                             business.resources.splice(index, 1);
    //                         }
    //                         index = business.pendingResources.indexOf(iResource._id);
    //                         if (index >= 0) {
    //                             console.log('resource in business pendingResources');
    //                             business.pendingResources.splice(index, 1);
    //                         }
    //                         index = business.events.indexOf(req.body.eventId);
    //                         if (index >= 0) {
    //                             console.log('event in business events');
    //                             business.events.splice(index, 1);
    //                         }
    //                         // remove resource and event from user
    //                         console.log('resource found');
    //                         Resource.findOneAndRemove({
    //                             '_id': iResource._id
    //                         }, function(err, resource) {
    //                             if (resource && !err) {
    //                                 console.log('resource removed');
    //                                 console.log(resource);
    //                                 resource.invitedUsers.forEach(userid=>{
    //                                     //if (!resObj.unfilled)
    //                                     {
                                            
    //                                         console.log('resource is filled and has changed');
    //                                         console.log('invitedUser id:', userid);
    //                                         User.findById(userid, function(err, user) {
    //                                             if (user && !err) {
    //                                                 console.log('found old user without error');
    //                                                 var index = user.resources.indexOf(iResource._id);
    //                                                 if (index >= 0) {
    //                                                     console.log('resource in user resources array');
    //                                                     user.resources.splice(index, 1);
    //                                                 }
    //                                                 index = user.pendingResources.indexOf(iResource._id);
    //                                                 if (index >= 0) {
    //                                                     console.log('resource in user pendingResources array');
    //                                                     user.pendingResources.splice(index, 1);
    //                                                 }
    //                                                 index = user.events.indexOf(req.body.eventId);
    //                                                 if (index >= 0) {
    //                                                     console.log('event in user events array');
    //                                                     user.events.splice(index, 1);
    //                                                 }
                                                    
    //                                                 user.save(function(err, user) {
    //                                                     if (user && !err) {
    //                                                         console.log('old user saved and notified');
    //                                                         notificationService.notify(notificationService.notifyTypes.deleteEventResource,
    //                                                         {
    //                                                             to: user.email
    //                                                         });
    //                                                         done();
    //                                                     } else {
    //                                                         console.log('error saving old user: ', err, user);
    //                                                         done(err);
    //                                                     }
    //                                                 });
    //                                             } else {
    //                                                 console.log('no old user or error: ', err, user);
    //                                                 done(err);
    //                                             }
    //                                         });
    //                                     }
    //                                     //  else {
    //                                     //     console.log('resource not filled');
    //                                     //     Resource.findOneAndRemove({ _id: iResource._id}).exec();
    //                                     //     done();
    //                                     // }
    //                                 });
    //                             } else {
    //                                 console.log('resource not removed or error: ', err, resource);
    //                             }
    //                         });
    //                     }, function(err) {
    //                         // handle any errors;
    //                         if (err) {
    //                             next('something failed during the async save process');
    //                         } else {
    //                             // remove event from business
    //                             var index = business.events.indexOf(req.body.eventId);
    //                             if (index >= 0) {
    //                                 console.log('event in business events: ');
    //                                 business.events.splice(index, 1);
    //                             }
    //                             // save business
    //                             business.save(function(err, rbusiness) {
    //                                 if (rbusiness && !err) {
    //                                     console.log('business saved');
    //                                     next(err, rbusiness);
    //                                 } else {
    //                                     console.log('business not saved or error: ', err, rbusiness);
    //                                     next(err, rbusiness);
    //                                 }
    //                             });
    //                         }
    //                     });
    //                 } else {
    //                     next('Business not found.', business);
    //                 }
    //             });
    //         } else {
    //             next('The deadline has passed, you can no longer delete this event', null);
    //         }
    //     } else {
    //         next('Event not found.', event);
    //     }
    // });
};

exports.addResources = function(req, next) {
    req.body.accountType = 'Business';
    req.body.accountHolder = req.body.businessId;

    stripeAccountService.validateStripeAccountRequestAndCheckUserAccess(req)
        .then(searchEventById)
        .then(searchBusiness)
        .then(iterateResources)
        .catch((err) => {
            console.log('Error: ', err);
            next(err);
        });

    /* Functions */
    function searchEventById() {
        const eventId = req.body.eventId;
        const promise = Event.findById(eventId).exec();
        return promise;
    }

    function searchBusiness(event) {
        const promise = new Promise((resolve, reject) => {
            const query = Business.findOne({ _id: req.body.businessId, usersAdmin: { $eq: req.authUserId } }).exec();
            query.then((business) => {
                resolve({ business: business, event: event });
            }).catch((err) => {
                reject(err);
            });
        });
        return promise;
    }

    function iterateResources(result) {
        const business = result.business;
        const event = result.event;
        console.log('Event resources: ', event.resources);
        console.log('business resources: ', business.resources);
        let eventResources = event.resources || [];

        function seriesDone(err) {
            // handle any errors;
            if (err) {
                next('something failed during the async save process: ' + err.toString());
            } else {
                business.save(function(err, business) {
                    if (business && !err) {
                        event.resources = eventResources;
                        event.save(function(err, event) {
                            if (event && !err) {
                                console.log('event saved');
                                event.deepPopulate(['resources.filled', 'resources.users', 'business'], {
                                    populate: {
                                        'resources.filled': {
                                            select: 'name slug'
                                        },
                                        'resources.users': {
                                            select: 'name slug'
                                        },
                                        'business': {
                                            select: 'companyName slug'
                                        }
                                    }
                                }, function(err, event) {
                                    if (event && !err) {
                                        console.log('sending updated event');
                                        next(err, event);
                                    } else {
                                        next('event deep populate failed: ', err, event);
                                    }
                                });
                            } else {
                                next('event not saved or error: ', err, event);
                            }
                        });
                    } else {
                        next('business not saved or error: ', err, business);
                    }
                });
            }
        }

        function removeResourceForUser(resource, invitedUsers = null) {
            let listOfUsers = resource.invitedUsers;
            if (resource.filled
                && listOfUsers.findIndex((item) => { return String(item._id) === String(resource.filled._id) || String(item) === String(resource.filled._id)}) === -1)
                listOfUsers.push(resource.filled);

            if (invitedUsers !== null)
                listOfUsers = invitedUsers;

            let promises = [];

            while (listOfUsers.length > 0) {
                promises.push(new Promise((resolve, reject) => {
                    const user = User.findById(listOfUsers.pop()).exec();
                    user.then((user) => {
                        let index = user.resources.indexOf(resource._id);
                        if (index >= 0) {
                            console.log('resource in user resources array');
                            user.resources.splice(index, 1);
                        }
                        index = user.pendingResources.indexOf(resource._id);
                        if (index >= 0) {
                            console.log('resource in user pendingResources array');
                            user.pendingResources.splice(index, 1);
                        }

                        user.save(function(err, user) {
                            if (user && !err) {
                                console.log('old user saved');
                                resolve(user);
                            } else {
                                console.log('error saving old user: ', err, user);
                                reject(err);
                            }
                        });
                    }).catch((err) => {
                        console.log('Error: ', err);
                    })
                }));
            }
            return Promise.all(promises);
        }

        function removeResourceForEvent(resource) {
            for (var i = event.resources.length - 1; i >= 0; i--) {
                const evtId = (event.resources[i]) ? ((event.resources[i]._id) ? event.resources[i]._id : event.resources[i]) : null;
                if (evtId === null) {
                    event.resources.splice(i, 1);
                } else {
                    if (String(evtId) === String(resource._id)) {
                        event.resources.splice(i, 1);
                        break;
                    }
                }
            }
        }

        function processQuery(resource, done) {
            let listOfUsers = resource.invitedUsers || [];
            if (resource.filled
                && listOfUsers.findIndex((item) => { return String(item._id) === String(resource.filled._id) || String(item) === String(resource.filled._id)}) === -1)
                listOfUsers.push(resource.filled);

            // remove the old users that are not in the new invited users
            let users_to_remove = [];
            for (var i = resource.invitedUsers.length - 1; i >= 0; i--) {
                const currentInvitedUser = resource.invitedUsers[i];
                let exist = false;
                for (var j = listOfUsers.length - 1; j >= 0; j--) {
                    const newInvitedUser = listOfUsers[j];
                    if (newInvitedUser === currentInvitedUser) {
                        exist = true;
                        break;
                    }
                }
                if (!exist) {
                    users_to_remove.push(currentInvitedUser);
                }
                else {
                    var userId = currentInvitedUser._id || currentInvitedUser;
                    User.findById(userId, (err, user) => {
                        notificationService.notify(notificationService.notifyTypes.addResourceUserAdded,
                            {
                                to: user.email,
                                htmlParams: { eventTitle: event.title }
                            });
                    });
                }
            }

            removeResourceForUser(resource, users_to_remove).then(() => {
                let promises = [];
                let i = listOfUsers.length;
                while (i > 0) {
                    i--;
                    promises.push(new Promise((resolve, reject) => {
                        const user = User.findById(listOfUsers[i]).exec();
                        user.then((user) => {
                            let index = user.resources.indexOf(resource._id);
                            if (index < 0) { // if the user has not the resource, we need to push it
                                user.resources.push(resource);
                            }
                            index = user.pendingResources.indexOf(resource._id);
                            if (index < 0) { // if the user has not the resource, we need to push it
                                user.pendingResources.push(resource);
                            }
                            // This code causes a bug, if we create a new event and add a shift that is accepted by user A,
                            // then edit the shifts to add a new position that we assign to user B,
                            // the event is deleted from the user.events array of user A.
                            /*if (resource.event) {
                                index = user.events.indexOf(resource.event);
                                if (index >= 0) {
                                    console.log('event found in old user events');
                                    user.events.splice(index, 1);
                                }
                            }*/
                            user.save(function(err, user) {
                                if (user && !err) {
                                    console.log('old user saved');
                                    resolve(user);
                                } else {
                                    console.log('error saving old user: ', err, user);
                                    reject(user);
                                }
                            });
                        }).catch((err) => {
                            console.log('Error: ', err);
                        });
                    }));
                }
                Promise.all(promises).then(() => {
                    let curr = resource;
                    // curr.accepted = false;
                    Resource.findOneAndUpdate({
                        _id: curr._id
                    }, curr, function(err, resource) {
                        if (resource && !err) {
                            console.log('resource updated');
                            const index = event.resources.indexOf(curr._id);
                            if (index < 0) {
                                event.resources.push(curr._id);
                            }
                            done();
                        } else {
                            console.log('error updating resource: ', err, resource);
                            done(err);
                        }
                    });
                }).catch((err) => {
                    console.log('Error promise: ', err);
                    done(err);
                });
            }).catch((err) => {
                console.log('Error promises: ', err);
            });
        }

        function addOrEditResourceForUser(resource, done) {
            let listOfUsers = resource.invitedUsers || [];
            if (resource.filled
            && listOfUsers.findIndex((item) => { return String(item._id) === String(resource.filled._id) || String(item) === String(resource.filled._id)}) === -1)
                listOfUsers.push(resource.filled);

            console.log('List of users: ', listOfUsers);

            if (!resource._id) {
                let newResource = new Resource(resource);
                if (business.resources.indexOf(newResource._id) < 0 && business.pendingResources.indexOf(newResource._id) < 0) {
                    console.log('resource not in business arrays, so add it.');
                    business.pendingResources.push(newResource._id);
                } else {
                    console.log('resource already in business arrays.');
                }
                newResource.save((err, result) => {
                    if (err) {
                        console.log('Error: ', err);
                        done();
                    } else {
                        processQuery(result, done);
                    }
                });
            } else {
                processQuery(resource, done);
            }
        }

        function deleteResource(iResource, done) {
            console.log('delete the resource');
            let index = business.resources.indexOf(iResource._id);

            if (index >= 0) {
                console.log('resource in business rateResources: ');
                business.resources.splice(index, 1);
            }

            index = business.pendingResources.indexOf(iResource._id);
            if (index >= 0) {
                console.log('resource in business pendingResources');
                business.pendingResources.splice(index, 1);
            }

            const query = Resource.findById(iResource._id)
                .populate('filled', 'email')
                .exec();

            query.then((resource) => {
                if (!resource.unfilled) {
                    // Notify old user of removal
                    console.log('Notify user removed');
                    notificationService.notify(notificationService.notifyTypes.addResourceUserRemoved,
                        {
                            to: resource.filled.email,
                            htmlParams: { eventTitle: event.title }
                        });
                }
                removeResourceForUser(resource).then(() => {
                    removeResourceForEvent(resource);
                    done();
                }).catch((err) => {
                    console.log('Error promises: ', err);
                    done();
                });

            }).catch((err) => {
                console.log('Error in query: ', err);
                done(err);
            });
        }

        function eachSerie(iResource, done) {
            if (iResource.delete) {
                deleteResource(iResource, done);
            } else {
                //console.log('create or update the resource: ', iResource);
                if (iResource !== null || iResource._id) {
                    addOrEditResourceForUser(iResource, done);
                } else {
                    done();
                }
            }
        }
        return async.eachSeries(req.body.resources, eachSerie, seriesDone);
    }
};


exports.addResource = function(req, next) {

    function searchBusiness() {
        const promise = new Promise((resolve, reject) => {
            const query = Business.findOne({ _id: req.body.businessId, usersAdmin: { $eq: req.authUserId } }).exec();
            query.then((business) => {
                resolve(business);
            }).catch((err) => {
                reject(err);
            });
        });
        return promise;
    }

    function searchUser(user) {
        const promise = new Promise((resolve, reject) => {
            const userQuery = User.findById(user._id).exec();
            userQuery.then((user) => {
                resolve(user);
            }).catch((err) => {
                reject(err);
            });
        });
        return promise;
    }
    function getMassHireResource(massid, status, businessid, title) {
        return new Promise((resolve, reject) => {
            if(massid){
                MassHireResource.findById(massid, function(err, massHR) {
                    if (err) reject(err);
                    resolve(massHR);
                });
            }
            else{
                resolve( new MassHireResource({
                    free: status,
                    business: businessid,
                    title: title
                }));
            }
        });
    }

    if (req.body.resource.geoLocation) {
        req.body.accountType = 'Business';
        req.body.accountHolder = req.body.businessId;
        let promises = [];
        stripeAccountService.validateStripeAccountRequestAndCheckUserAccess(req)
        .then(searchBusiness)
        .then((business) => {
            // Create mass hire and set free true or false depends of business
            const massHireResource = getMassHireResource(req.body.massid, business.jobFree.status, req.body.businessId, req.body.resource.title);
            // new MassHireResource({
            //     free: business.jobFree.status,
            //     business: req.body.businessId,
            //     title: req.body.resource.title
            // });
            // Create each resource from job list
            let group = 0;
            req.body.resource.jobsList.forEach(element => {
                for (var i = 0; i < element.quantity; i++) {
                    var resource = new Resource(element);
                    resource.group = group
                    resource.title = element.title;
                    resource.loc = req.body.resource.geoLocation;
                    resource.formattedAddress = req.body.resource.location;
                    resource.massHireResource = massHireResource._id;
                    // Add each resource to masshire resources list (& vice versa)
                    massHireResource.resources.push(resource);
                    promises.push(resource.save(function(err, resource) {
                        console.log("resource save:  err:", err);
                        if (resource && !err) {
                            business.pendingResources.push(resource._id);
                            return resource;
                        }
                        throw err;
                    }));
                }
                group++;
            });
            promises.push(massHireResource.save());
            console.log('Promises length: ', promises.length);
            // Save all resources and massHireResource
            // Exist a relation between resource and massHire
            Promise.all(promises).then(values => {
              console.log('Values length: ', values.length);
              business.myMassHireResource.push(massHireResource._id);
              if (massHireResource.free) { // Set free job as false after used it
                business.jobFree.status = false;
                business.jobFree.job = massHireResource._id;
                business.used = new Date();
              }
              // Update business with pending resources and massHireResource pushed on list
              business.save(function(err, businessUpdated) {
                    console.log('err', err);
                    if (businessUpdated && !err) {
                        // Send invitations to invited users
                        promises = [];
                        if (req.body.resource.invitedUsers && req.body.resource.invitedUsers.length > 0) {
                            const promises = req.body.resource.invitedUsers.map((invitedId) => {
                                return searchUser(invitedId)
                                .then((user) => {
                                    // Update massHireList
                                    user.myMassHireResource.push(massHireResource._id);
                                    return user.save();
                                });
                            });
                            Promise.all(promises)
                            .then((result) => {
                                next(null, result);
                            })
                            .catch((promiseErr) => {
                                next('Promises promiseErr', promiseErr);
                            });
                        } else {
                            next(null, businessUpdated);
                        }
                    } else {
                        next(err, 'err');
                    }
                })
            })
            .catch(reason => {
                console.log('Error saving resources');
                console.log(reason);
                next(reason, 'err');
            });
        })
        .catch((err) => {
            console.log('Error addResource - validate stripe account: ', err);
            next(err);
        });
    } else {
        next('No geoLocation.');
    }
};

exports.editResource = function(req, res, next) {
    Resource.findById(req.body._id, function(err, resource) {
        if (resource && !err) {
            async.waterfall([
                function(done) {
                    if ((!resource.unfilled && req.body.unfilled) || (!resource.unfilled && !req.body.unfilled && resource.filled !== req.body.filled._id)) {
                        // remove old user
                        User.findById(resource.filled, function(err, user) {
                            if (user && !err) {
                                console.log('found old user without error');
                                var index = user.resources.indexOf(resource._id);
                                if (index >= 0) {
                                    console.log('resource found in old user resources');
                                    user.resources.splice(index, 1);
                                } else {
                                    console.log('resource not found in old user resources');
                                }
                                index = user.pendingResources.indexOf(resource._id);
                                if (index >= 0) {
                                    console.log('resource found in old user pendingResources');
                                    user.pendingResources.splice(index, 1);
                                } else {
                                    console.log('resource not found in old user pendingResources');
                                }
                                user.save(function(err, user) {
                                    if (user && !err) {
                                        // Notify old user
                                        notificationService.notify(notificationService.notifyTypes.editResource,
                                        {
                                            to: user.email,
                                            htmlParams: {
                                                comment: req.body.comment,
                                            },
                                        });
                                        done(err);
                                    } else {
                                        next('failed to save old user', user);
                                    }
                                });
                            } else {
                                next('failed to retrieve old user', user);
                            }
                        });
                    } else {
                        done(null);
                    }
                },
                function(done) {
                    if ((!resource.unfilled && !req.body.unfilled && resource.filled !== req.body.filled._id) || (resource.unfilled && !req.body.unfilled)) {
                        // add new user
                        User.findById(req.body.filled._id, function(err, user) {
                            if (user && !err) {
                                console.log('found new user without error');
                                if (user.resources.indexOf(resource._id) < 0 && user.pendingResources.indexOf(resource._id) < 0) {
                                    console.log('resource not in user arrays, so add it.');
                                    user.pendingResources.push(resource._id);
                                    user.save(function(err, user) {
                                        if (user && !err) {
                                            // Notify old user
                                            notificationService.notify(notificationService.notifyTypes.editResource,
                                            {
                                                to: user.email,
                                                htmlParams: {
                                                    comment: req.body.comment,
                                                },
                                            });
                                            done(err);
                                        } else {
                                            next('failed to save new user', user);
                                        }
                                    });
                                } else {
                                    done(null);
                                }
                            } else {
                                next('failed to retrieve new user', user);
                            }
                        });
                    } else {
                        done(null);
                    }
                },
                function() {
                    Resource.findOneAndUpdate({
                        _id: req.body._id
                    }, req.body, {
                        safe: true,
                        runValidators: false
                    }, function(err, resource) {
                        if (resource && !err) {
                            next(err, resource);
                        } else {
                            next('failed to retrieve resource', resource);
                        }
                    });
                }
            ], function(err) {
                console.log(err);
                return res.status(500).send({
                    success: false,
                    message: 'Failed to edit resource.'
                });
            });
        } else {
            next('failed to retrieve resource', resource);
        }
    });
};

exports.finishResource = function(req, res, next) {
    Resource.update({
        _id: { $in: req.body.ids }
    }, {
        $set: { requiresFinish: false }
    }, 
    { 'multi': true })
    .then(function(res) {
        next(null, res)
    })
    .catch(function(err) {
        next(err);
    });
}

exports.deleteResource = function(req, res, next) {
    Resource.findByIdAndRemove(req.body.resource._id, function(err, resource) {
        if (resource && !err) {
            if (!resource.cutOff) {
                Business.findOne({
                    _id: req.body.businessId,
                    usersAdmin: {
                        $eq: req.authUserId
                    }
                }, function(err, business) {
                    if (business && !err) {
                        async.waterfall([
                            function(done) {
                                if (!req.body.resource.unfilled) {
                                    console.log('resource is filled');
                                    User.findById(req.body.resource.filled._id, function(err, user) {
                                        if (user && !err) {
                                            console.log('found new user');
                                            var index = user.pendingResources.indexOf(req.body.resource._id);
                                            if (index >= 0) {
                                                console.log('resource in user pendingResources');
                                                user.pendingResources.splice(index, 1);
                                            }
                                            index = user.resources.indexOf(req.body.resource._id);
                                            if (index >= 0) {
                                                console.log('resource in user resources');
                                                user.resources.splice(index, 1);
                                            }
                                            user.save(function(err, ruser) {
                                                if (ruser && !err) {
                                                    // TODO: notify user
                                                    console.log('new user saved');
                                                    done();
                                                } else {
                                                    next('user not saved found. ', business);
                                                }
                                            });
                                        } else {
                                            next('User not found. ', business);
                                        }
                                    });
                                } else {
                                    console.log('resource is unfilled');
                                    done();
                                }
                            },
                            function() {
                                var index = business.pendingResources.indexOf(req.body.resource._id);
                                if (index >= 0) {
                                    console.log('resource in business pendingResources');
                                    business.pendingResources.splice(index, 1);
                                }
                                index = business.resources.indexOf(req.body.resource._id);
                                if (index >= 0) {
                                    console.log('resource in business resources');
                                    business.resources.splice(index, 1);
                                }
                                business.save(function(err, rbusiness) {
                                    if (rbusiness && !err) {
                                        next(err, rbusiness);
                                    } else {
                                        next('business not saved.', rbusiness);
                                    }
                                });
                            }
                        ], function(err) {
                            console.log(err);
                            return res.status(500).send({
                                success: false,
                                message: 'Failed to delete tasting.'
                            });
                        });
                    } else {
                        next('Business not found.', business);
                    }
                });
            } else {
                next('The deadline has passed, you can no longer delete this event', null);
            }
        } else {
            next('Resource not found.', resource);
        }
    });
};

const processNestedQueries = (resource, business, event, user) => {

    function processMandatoryQuery(resolve, reject) {
        resource.save(function(err, resource) {
            if (resource && !err) {
                business.save(function(err, rbusiness) {
                    if (rbusiness && !err) {
                        console.log('business saved');
                        user.save(function(err, usr) {
                            if (usr && !err) {
                                console.log('user updated');
                                resolve(rbusiness);
                            } else {
                                reject(err);
                            }
                        });
                    } else {
                        reject(err);
                    }
                });
            } else {
                reject(err);
            }
        });
    }

    return new Promise((resolve, reject) => {
        if (event) {
            event.save(function(err, evt) {
                if (evt && !err) {
                    processMandatoryQuery(resolve, reject);
                }
            });
        } else {
            processMandatoryQuery(resolve, reject);
        }
    });

}

exports.acceptResource = function(req, next) {
    const resourceQuery = Resource.findById(req.body.resourceId).populate('invitedUsers event').exec();
    resourceQuery.then((resource) => {
            const businessQuery = Business.findById(resource.business);
            businessQuery.then((business) => {
                if (resource.unfilled) {
                    // Check if the user is an invited user
                    let invitedUser = null;
                    for (let i = resource.invitedUsers.length - 1; i >= 0; i--) {
                        if (String(resource.invitedUsers[i]._id) === req.authUserId) {
                            invitedUser = resource.invitedUsers[i];
                            break;
                        }
                    }

                    if (invitedUser) {
                        resource.filled = invitedUser._id;
                        resource.users.push(invitedUser._id);
                        resource.accepted = true;
                        resource.unfilled = false;

                        // remove resource from pendingResources biz
                        let index = business.pendingResources.indexOf(req.body.resourceId);
                        if (index >= 0) {
                            console.log('resource in business pendingResources');
                            business.pendingResources.splice(index, 1);
                        }
                        // add resource to resources biz and filled user
                        index = business.resources.indexOf(req.body.resourceId);
                        if (index < 0) {
                            console.log('resource added to business rateResources');
                            business.resources.push(req.body.resourceId);
                        }
                        index = invitedUser.resources.indexOf(req.body.resourceId);
                        if (index < 0) {
                            console.log('resource added to user resources');
                            invitedUser.resources.push(req.body.resourceId);
                        }
                        index = invitedUser.pendingResources.indexOf(req.body.resourceId);
                        if (index >= 0) {
                            console.log('pending resource removed to user pendingResources');
                            invitedUser.pendingResources.splice(index, 1);
                        }

                        let event = null;

                        if (resource.event) {
                            event = resource.event;
                            console.log('This is an event');
                            if (invitedUser.events) {
                                console.log('User already has events');
                                invitedUser.events.push(event);
                            } else {
                                console.log('This is the users first event');
                                invitedUser.events = [event];
                            }
                            if (event.users) {
                                console.log('user added to existing events.users');
                                event.users.push(invitedUser._id);
                            } else {
                                console.log('user added to new events.users');
                                event.users = [invitedUser._id];
                            }
                        }

                        processNestedQueries(resource, business, event, invitedUser).then(() => {
                            //remove resource from pendingResource to all invitedUsers
                            let promises = [];
                            let i = resource.invitedUsers.length;

                            while (i > 0) {
                                i--;
                                promises.push(new Promise((resolve, reject) => {
                                    const user = User.findById(resource.invitedUsers[i]).exec();
                                    user.then((user) => {
                                        if (String(user._id) !== String(invitedUser._id)) {
                                            let index = user.resources.indexOf(resource._id);
                                            if (index >= 0) {
                                                user.resources.splice(index, 1);
                                            }
                                            index = user.pendingResources.indexOf(resource._id);
                                            if (index >= 0) {
                                                user.pendingResources.splice(index, 1);
                                            }
                                            Resource.find({
                                                massHireResource: resource.massHireResource,
                                                group: resource.group,
                                                accepted: false
                                            })
                                            .then((res) => {
                                                if (res && res.length > 0) {
                                                    user.pendingResources.push(res[0]._id);
                                                }
                                                res[0].invitedUsers.push(user._id);
                                                res[0].save();
                                                user.save(function(err, user) {
                                                    if (user && !err) {
                                                        // TODO: notify old user of removal
                                                        resolve(user);
                                                    } else {
                                                        console.log('error saving old user: ', err, user);
                                                        reject(user);
                                                    }
                                                });
                                            })
                                            .catch((err) => {
                                                console.log('error finding resources: ', err);
                                                reject(err);
                                            });
                                        } else {
                                            resolve(user);
                                        }
                                    }).catch((err) => {
                                        console.log('Error: ', err);
                                        reject(user);
                                    });
                                }));
                            }
                            console.log('Promise.all--------3');
                            Promise.all(promises).then(() => {
                                // next(null, invitedUser);
                                ConflictService.createAndResolve('Resource', resource._id, resource.startTime, resource.endTime, req.authUserId)
                                .then((conflictId) => {
                                    User.findOneAndUpdate({
                                        '_id': req.authUserId
                                    }, {
                                        $push: {
                                            conflict: conflictId
                                        }
                                    }).then(() => {
                                        console.log('Promise.all ----then');
                                        //console.log(business);
                                         /*
                                            * params: {
                                            *  toUser: 'email@email.com'
                                            *  toBusiness: 'email@email.com'
                                            *  employee: 'Joe blow',
                                            *  position: 'Bartender',
                                            *  phone: '(xxx) xxx-xxxx0',
                                            *  email: 'email@email.com'
                                            * }
                                            */
                                        var params1 = {
                                            toUser: invitedUser.email,
                                            toBusiness: business.email,
                                            htmlParams:{
                                                employee: invitedUser.name,
                                                position: resource.title,
                                                phone: invitedUser.mobilePhone,
                                                email: invitedUser.email
                                            }
                                        };
                                        
                                        notificationService.notify(notificationService.notifyTypes.acceptedResource, params1);
                                        next(null, invitedUser);
                                        
                                    }).catch(err => {
                                        next(err);
                                    })
                                }).catch(er => {
                                    next(er);
                                });
                            }).catch((err) => {
                                console.log('Error promise: ', err);
                                next('Error in promise: ', err);
                            });
                        }).catch((err) => {
                            next('Error in update: ', err);
                        });

                    } else {
                        next('User was not selected for this resource.', resource);
                    }
                } else {
                    if (req.authUserId === String(resource.filled)) {
                        console.log('User just accepted the resource');
                        next('User just accepted the resource.', resource);
                        
                    } else {
                        next('User doesn\'t match the resources filled user.', resource);
                    }

                }
            });
        })
        .catch((err) => {
            console.log('Error acceptResource: ', err);
        });
};


exports.declineResource = function(req, next) {
    Resource.findById(req.body.resourceId, function(err, resource) {
        if (resource && !err) {
            User.findById(req.authUserId, function(err, user) {
                if (user && !err) {
                    var index = user.resources.indexOf(resource._id);
                    if (index >= 0) {
                        console.log('resource in user resources array');
                        user.resources.splice(index, 1);
                    }
                    index = user.pendingResources.indexOf(resource._id);
                    if (index >= 0) {
                        console.log('resource in user pendingResources array');
                        user.pendingResources.splice(index, 1);
                    }
                    user.save(function(err, ruser) {
                        if (ruser && !err) {
                            if (!resource.declinedInvitedUsers)
                                resource.declinedInvitedUsers = [];
                            resource.declinedInvitedUsers.push(user);
                            resource.save(function(err, resource) {
                                if (resource && !err) {
                                    next(err, ruser);
                                } else {
                                    next('resource not saved or error: ', resource);
                                }
                            });
                        } else {
                            next('user not saved or error: ', ruser);
                        }
                    });
                } else {
                    next('User not found.', resource);
                }
            });
        } else {
            next('Resource not found. ', resource);
        }
    });
};


exports.addTasting = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, function(err, business) {
        if (business && !err) {
            Business.findById(req.body.tasting.businessVenue._id, function(err, businessVenue) {
                if (businessVenue && !err) {
                    var tasting = new Tasting(req.body.tasting);
                    tasting.code = hashids.encodeHex(tasting._id);

                    tasting.save(function(err, rtasting) {
                        if (rtasting && !err) {
                            var index = business.myTastings.indexOf(rtasting._id),
                                index2 = 0;
                            if (index < 0) {
                                console.log('tasting not in business myTastings array');
                                business.myTastings.push(rtasting._id);
                            }
                            if (String(business._id) === String(businessVenue._id)) {
                                console.log('business owns the tasting and the venue.');
                                index = business.pendingTastings.indexOf(rtasting._id);
                                index2 = business.tastings.indexOf(rtasting._id);
                                if (index < 0 && index2 < 0) {
                                    console.log('tasting not in business pendingTastings or tastings arrays');
                                    business.pendingTastings.push(rtasting._id);
                                }
                            }
                            business.save(function(err, rbusiness) {
                                if (rbusiness && !err) {
                                    console.log('business saved.');
                                    if (String(business._id) !== String(businessVenue._id)) {
                                        index = businessVenue.pendingTastings.indexOf(rtasting._id);
                                        index2 = businessVenue.tastings.indexOf(rtasting._id);
                                        if (index < 0 && index2 < 0) {
                                            console.log('tasting not in businessVenue pendingTastings or tastings arrays');
                                            businessVenue.pendingTastings.push(rtasting._id);
                                        }
                                        businessVenue.save(function(err, rbusinessVenue) {
                                            if (rbusinessVenue && !err) {
                                                next(err, rbusinessVenue);
                                            } else {
                                                next(err, rbusiness);
                                            }
                                        });
                                    } else {
                                        next(err, businessVenue);
                                    }
                                } else {
                                    next(err, rbusiness);
                                }
                            });
                        } else {
                            next('Tasting not created', rtasting);
                        }
                    });
                } else {
                    next('Business Venue not found.', businessVenue);
                }
            });
        } else {
            next('Business not found.', business);
        }
    });
};


exports.deleteTasting = function(req, res, next) {
    Tasting.findByIdAndRemove(req.body.tasting._id, function(err, tasting) {
        if (tasting && !err) {
            Business.findOne({
                _id: req.body.businessId,
                usersAdmin: {
                    $eq: req.authUserId
                }
            }, function(err, business) {
                if (business && !err) {
                    console.log('resource is filled');
                    Business.findById(req.body.tasting.businessVenue, function(err, businessVenue) {
                        if (businessVenue && !err) {
                            console.log('found new user');
                            async.waterfall([
                                function(done) {
                                    const comparison = req.body.tasting.tastingType === 'ADMINS' || req.body.tasting.tastingType === 'MANAGERS' || req.body.tasting.tastingType === 'STAFF';
                                    if (comparison) {
                                        async.eachSeries(businessVenue.usersAdmin, function(iAdmin, subdone) {
                                            User.findById(iAdmin, function(err, ruser) {
                                                if (ruser && !err) {
                                                    var index = ruser.tastings.indexOf(req.body.tasting._id);
                                                    if (index >= 0) {
                                                        console.log('tasting in user tasting array');
                                                        ruser.tastings.splice(index, 1);
                                                    }
                                                    ruser.save(function(err, rruser) {
                                                        if (rruser && !err) {
                                                            subdone();
                                                        } else {
                                                            console.log('user not saved or error: ', err, rruser);
                                                            subdone(err);
                                                        }
                                                    });
                                                } else {
                                                    console.log('user not found or error: ', err, ruser);
                                                    subdone(err);
                                                }
                                            });
                                        }, function(err) {
                                            // handle any errors;
                                            if (err) {
                                                next('something failed during the async save process');
                                            } else {
                                                // remove tasting from tasting biz
                                                done();
                                            }
                                        });
                                    } else {
                                        done();
                                    }
                                },
                                function() {
                                    var index = business.myTastings.indexOf(req.body.tasting._id);
                                    if (index >= 0) {
                                        console.log('tasting in business myTastings');
                                        business.myTastings.splice(index, 1);
                                    }
                                    if (String(business._id) === String(businessVenue._id)) {
                                        index = business.pendingTastings.indexOf(req.body.tasting._id);
                                        if (index >= 0) {
                                            console.log('tasting in business pendingTastings');
                                            business.pendingTastings.splice(index, 1);
                                        }
                                        index = business.tastings.indexOf(req.body.tasting._id);
                                        if (index >= 0) {
                                            console.log('tasting in business tastings');
                                            business.tastings.splice(index, 1);
                                        }
                                    }
                                    business.save(function(err, rbusiness) {
                                        if (rbusiness && !err) {
                                            // Notify business
                                            notificationService.notify(notificationService.notifyTypes.deleteTastingManagerBusiness,
                                                {
                                                    to: business.email
                                                });
                                            console.log('business saved');
                                            if (String(business._id) !== String(businessVenue._id)) {
                                                var index = businessVenue.pendingTastings.indexOf(req.body.tasting._id);
                                                if (index >= 0) {
                                                    console.log('tasting in businessVenue pendingTastings');
                                                    businessVenue.pendingTastings.splice(index, 1);
                                                }
                                                index = businessVenue.tastings.indexOf(req.body.tasting._id);
                                                if (index >= 0) {
                                                    console.log('tasting in businessVenue tastings');
                                                    businessVenue.tastings.splice(index, 1);
                                                }
                                                businessVenue.save(function(err, rbusinessVenue) {
                                                    notificationService.notify(notificationService.notifyTypes.deleteTastingHostBusiness,
                                                        {
                                                            to: businessVenue.email
                                                        });
                                                    if (rbusinessVenue && !err) {
                                                        next(err, rbusiness);
                                                    } else {
                                                        console.log('businessVenue failed to save');
                                                        next(err, rbusinessVenue);
                                                    }
                                                });
                                            } else {
                                                next(err, rbusiness);
                                            }
                                        } else {
                                            next('business not saved found. ', rbusiness);
                                        }
                                    });
                                }
                            ], function(err) {
                                console.log(err);
                                return res.status(500).send({
                                    success: false,
                                    message: 'Failed to accept tasting.'
                                });
                            });
                        } else {
                            next('Business Venue not found. ', businessVenue);
                        }
                    });
                } else {
                    next('Business not found.', business);
                }
            });
        } else {
            next('Tasting not found.', tasting);
        }
    });
};


exports.rescheduleTasting = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, function(err, business) {
        if (business && !err) {
            Tasting.findById(req.body.tastingId, function(err, tasting) {
                if (tasting && !err) {
                    tasting.reschedule = req.body.times;
                    tasting.rescheduleText = req.body.rescheduleText;
                    tasting.save(function(err, rtasting) {
                        if (rtasting && !err) {
                            /*
                            var index = business.pendingTastings.indexOf(rtasting._id);
                            if (index >= 0) {
                                console.log('tasting in business myTastings array');
                                business.pendingTastings.splice(index, 1);
                            }
                            business.save(function(err, rbusiness) {
                                next(err, rbusiness);
                            });
                            */
                            next(err, business);
                        } else {
                            next(err, rtasting);
                        }
                    });
                } else {
                    next('Tasting not found.', tasting);
                }
            });
        } else {
            next('Business not found.', business);
        }
    });
};


exports.acceptReschedule = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, function(err, business) {
        if (business && !err) {
            Tasting.findById(req.body.tastingId, function(err, tasting) {
                if (tasting && !err) {
                    Business.findById(tasting.businessVenue, function(err, businessVenue) {
                        if (businessVenue && !err) {
                            tasting.reschedule = [];
                            tasting.rescheduleText = '';
                            tasting.startTime = req.body.newTime.startTime;
                            tasting.endTime = req.body.newTime.endTime;
                            tasting.save(function(err, rtasting) {
                                if (rtasting && !err) {
                                    var index = businessVenue.pendingTastings.indexOf(rtasting._id);
                                    if (index < 0) {
                                        console.log('tasting not in business myTastings array');
                                        businessVenue.pendingTastings.push(rtasting._id);
                                    }
                                    businessVenue.save(function(err, rbusiness) {
                                        next(err, rbusiness);
                                    });
                                } else {
                                    next(err, rtasting);
                                }
                            });
                        } else {
                            next('Business Venue not found.', businessVenue);
                        }
                    });
                } else {
                    next('Tasting not found.', tasting);
                }
            });
        } else {
            next('Business not found.', business);
        }
    });
};

exports.acceptTasting = function(req, res, next) {
    Tasting.findById(req.body.tastingId, function(err, tasting) {
        if (tasting && !err) {
            Business.findById(tasting.businessVenue, function(err, businessVenue) {
                if (businessVenue && !err) {
                    async.waterfall([
                        function(done) {
                            if (req.body.conflictingTastings && req.body.conflictingTastings.length > 0) {
                                async.eachSeries(req.body.conflictingTastings, function(iTasting, subdone) {
                                    // remove conflicting resources and notify
                                    ConflictService.resolveTastingBusiness(iTasting).then(() => {
                                        subdone();
                                    }).catch((err) => {
                                        console.log('something failed during the async save process: ', err, iTasting);
                                        subdone(err);
                                    })
                                    // Tasting.findById(iTasting, function(err, rtasting) {
                                    //     if (rtasting && !err) {
                                    //         rtasting.declined = true;
                                    //         rtasting.save(function(err, rrtasting) {
                                    //             if (rrtasting && !err) {
                                    //                 subdone();
                                    //             } else {
                                    //                 console.log('tasting not saved or error: ', err, rrtasting);
                                    //                 subdone(err);
                                    //             }
                                    //         });
                                    //     } else {
                                    //         console.log('tasting not found or error: ', err, rtasting);
                                    //         subdone(err);
                                    //     }
                                    // });
                                }, function(err) {
                                    // handle any errors;
                                    if (err) {
                                        next('something failed during the async save process');
                                    } else {
                                        // remove resource from pendingResources biz and user
                                        done();
                                    }
                                });
                            } else {
                                done();
                            }
                        },
                        function(done) {
                            const comparison = tasting.tastingType === 'ADMINS' || tasting.tastingType === 'MANAGERS' || tasting.tastingType === 'STAFF';
                            if (comparison) {
                                async.eachSeries(businessVenue.usersAdmin, function(iAdmin, done) {
                                    User.findById(iAdmin, function(err, ruser) {
                                        if (ruser && !err) {
                                            var index = ruser.tastings.indexOf(tasting._id);
                                            if (index < 0) {
                                                console.log('tasting not in user tasting array');
                                                ruser.tastings.push(tasting._id);
                                            }
                                            ruser.save(function(err, rruser) {
                                                if (rruser && !err) {
                                                    done();
                                                } else {
                                                    console.log('user not saved or error: ', err, rruser);
                                                    done(err);
                                                }
                                            });
                                        } else {
                                            console.log('user not found or error: ', err, ruser);
                                            done(err);
                                        }
                                    });
                                }, function(err) {
                                    // handle any errors;
                                    if (err) {
                                        next('something failed during the async save process');
                                    } else {
                                        // remove resource from pendingResources biz and user
                                        done();
                                    }
                                });
                            } else {
                                done();
                            }
                        },
                        function() {
                            var index = businessVenue.pendingTastings.indexOf(req.body.tastingId);
                            if (index >= 0) {
                                console.log('tasting in business pending tastings');
                                businessVenue.pendingTastings.splice(index, 1);
                            }
                            // add resource to resources biz and user
                            index = businessVenue.tastings.indexOf(req.body.tastingId);
                            if (index < 0) {
                                console.log('tasting added to business tastings');
                                businessVenue.tastings.push(req.body.tastingId);
                            }
                            console.log('saving business and tasting.');
                            tasting.accepted = true;
                            tasting.declined = false;
                            tasting.save(function(err, rtasting) {
                                if (rtasting && !err) {
                                    businessVenue.save(function(err, rbusinessVenue) {
                                        if (rbusinessVenue && !err) {
                                            // send notifications to both business
                                            notificationService.notify(notificationService.notifyTypes.acceptTastingHostBusiness,
                                                {
                                                    to: businessVenue.email,
                                                    htmlParams: { tastingTitle: tasting.title }
                                                });
                                            Business.findById(tasting.business, function(err, businessManager) {
                                                notificationService.notify(notificationService.notifyTypes.acceptTastingManagerBusiness,
                                                    {
                                                        to: businessManager.email,
                                                        htmlParams: { tastingTitle: tasting.title },
                                                    });
                                            });
                                            next(err, rbusinessVenue);
                                        } else {
                                            next('Business venue not saved or error: ', rbusinessVenue);
                                        }
                                    });
                                } else {
                                    next('tasting not saved or error: ', rtasting);
                                }
                            });
                        }
                    ], function(err) {
                        console.log(err);
                        return res.status(500).send({
                            success: false,
                            message: 'Failed to accept tasting.'
                        });
                    });
                } else {
                    next('Business venue not found.', businessVenue);
                }
            });
        } else {
            next('Tasting not found. ', tasting);
        }
    });
};


exports.declineTasting = function(req, next) {
    Tasting.findById(req.body.tastingId, function(err, tasting) {
        if (tasting && !err) {
            Business.findById(tasting.businessVenue, function(err, businessVenue) {
                if (businessVenue && !err) {
                    var index = businessVenue.tastings.indexOf(tasting._id);
                    if (index >= 0) {
                        businessVenue.tastings.splice(index, 1);
                    }
                    index = businessVenue.pendingTastings.indexOf(tasting._id);
                    if (index >= 0) {
                        businessVenue.pendingTastings.splice(index, 1);
                    }
                    businessVenue.save(function(err, rbusinessVenue) {
                        if (rbusinessVenue && !err) {
                            tasting.declined = true;
                            tasting.accepted = false;
                            tasting.save(function(err, rtasting) {
                                if (rtasting && !err) {
                                    next(err, rbusinessVenue);
                                } else {
                                    next('tasting not saved or error: ', rtasting);
                                }
                            });
                        } else {
                            next('business venue not saved or error: ', rbusinessVenue);
                        }
                    });
                } else {
                    next('Business venue not found.', tasting.businessVenue);
                }
            });
        } else {
            next('Tasting not found. ', tasting);
        }
    });
};


exports.getUserCalendar = function(req, next) {

    const resourcesPromise = Resource
        .find({
            filled: req.authUserId,
            endTime: {
                $gte: new Date().toISOString()
            }
        })
        .select('-users')
        .populate('business', 'companyName slug image');


    const tastingsPromise = Tasting.find({
            users: {
                $eq: req.authUserId
            },
            endTime: {
                $gte: new Date().toISOString()
            }
        })
        .select('title description type startTime endTime business formattedAddress loc modelType level')
        .populate('business', 'companyName slug image');

    Promise.all([
        resourcesPromise,
        tastingsPromise
    ]).then(function([resources, tastings]) {
        var events = resources.concat(tastings);
        next(null, events);
    }, function onRejected(err) {
        next(err);
    });

};


exports.getBusinessCalendar = function(req, next) {

    const resourcesPromise = Resource
        .find({
            business: req.body.businessId,
            endTime: {
                $gte: new Date().toISOString()
            }
        })
        .select('-users')
        .populate('business', 'companyName slug image');

    const tastingsPromise = Tasting.find({
            business: req.body.businessId,
            endTime: {
                $gte: new Date().toISOString()
            }
        })
        .select('title description type startTime endTime business formattedAddress loc modelType level')
        .populate('business', 'companyName slug image');

    Promise.all([
        resourcesPromise,
        tastingsPromise
    ]).then(function([resources, tastings]) {
        var events = resources.concat(tastings);
        next(null, events);
    }, function onRejected(err) {
        next(err);
    });

};


exports.getUserEvents = function(req, next) {
    User
        .findById(req.authUserId)
        .populate({
            path: 'events',
            model: 'Event',
            populate: {
                path: 'resources',
                model: 'Resource',
                match: {
                    filled: {
                        $eq: req.authUserId
                    }
                }
            }
        })
        .exec(function(err, user) {
            if (!user) {
                return next('No events found.', user);
            } else if (user) {
                next(err, user);
            }
        });

};


exports.forgot = function(req, next) {
    User.findOneAndUpdate({
        email: req.body.email
    }, {
        resetPasswordToken: req.body.token,
        resetPasswordExpires: Date.now() + 3600000
    }, {
        safe: true,
        runValidators: false
    }, function(err, user) {
        next(err, user);
    });
};

exports.sendInvite = function(req, next) {
    Invite.findOne({
        inviteEmail: req.body.email
    }, function(err, existingInvite) {
        if (existingInvite) {
            next(err, existingInvite);
        } else {
            var newInvite = new Invite({
                user: req.authUserId,
                inviteToken: req.body.token,
                inviteEmail: req.body.email
            });
            newInvite.save(function(err, invite) {
                next(err, invite);
            });
        }
    });
};

// TODO: optimize duplicate code, check first, then make DB update
exports.updateImage = function(req, next) {
    if (req.body.imageType === 'profile') {
        if (req.body.profileType === 'profile') {
            User.findOneAndUpdate({
                _id: req.authUserId
            }, {
                image: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/profile/profile/' + req.body.encodedFilename + '?ver=' + Date.now()
            }, {
                new: true
            }, function(err, user) {
                next(err, user);
            });

        } else if (req.body.profileType === 'business') {
            Business.findOneAndUpdate({
                _id: req.body._id,
                usersAdmin: {
                    $eq: req.authUserId
                }
            }, {
                image: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/business/profile/' + req.body.encodedFilename + '?ver=' + Date.now()
            }, {
                new: true
            }, function(err, business) {
                next(err, business);
            });
        } else {
            next('no profile type provided', null);
        }
    } else if (req.body.imageType === 'cover') {
        if (req.body.profileType === 'profile') {
            User.findOneAndUpdate({
                _id: req.authUserId
            }, {
                coverImage: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/profile/cover/' + req.body.encodedFilename + '?ver=' + Date.now()
            }, {
                new: true
            }, function(err, user) {
                next(err, user);
            });

        } else if (req.body.profileType === 'business') {
            Business.findOneAndUpdate({
                _id: req.body._id,
                usersAdmin: {
                    $eq: req.authUserId
                }
            }, {
                coverImage: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/business/cover/' + req.body.encodedFilename + '?ver=' + Date.now()
            }, {
                new: true
            }, function(err, business) {
                next(err, business);
            });
        } else {
            next('no profile type provided', null);
        }
    } else if (req.body.imageType === 'certificate') {
        if (req.body.profileType === 'profile') {
            User.findOneAndUpdate({
                _id: req.authUserId
            }, {
                $push: { certificates:  'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/profile/certificate/' + req.body.encodedFilename + '?ver=' + Date.now() }
            }, {
                new: true,
                upsert: true
            }, function(err, user) {
                next(err, user);
            });
        } else {
           next('no profile type provided', null);
        }
    } else if (req.body.imageType === 'gallery') {
        if (req.body.profileType === 'gallery') {
            const newPhoto = {
                source: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/gallery/' + req.body.businessId + '/' + req.body.encodedFilename + '?ver=' + Date.now(),
                title: req.body.imageTitle,
                comment: req.body.imageComment,
                itemType: req.body.itemType,
                category: req.body.category
            };
            console.log("newGalleryPhoto", newPhoto);
            Business.findOneAndUpdate({
                _id: req.body.businessId
            }, {
                $push: { galleryPhotoVideos: newPhoto }
            }, {
                new: true,
                upsert: true
            }, function(err, business) {
                next(err, business);
            });
        } else {
           next('no profile type provided', null);
        }
    } else {
        next('no image type provided', null);
    }
};

exports.updateVideoGallery = function(req, next) {
    const newVideo = {
        source: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/gallery-video/' + req.body.businessId + '/' + req.body.encodedFilename + '?ver=' + Date.now(),
        title: req.body.videoTitle,
        comment: req.body.videoComment,
        itemType: req.body.itemType,
        category: req.body.category
    };
    Business.findOneAndUpdate({
        _id: req.body.businessId
    }, {
        $push: { galleryPhotoVideos: newVideo }
    }, {
        new: true,
        upsert: true
    }, function(err, user) {
        next(err, user);
    });
};

// TODO: optimize duplicate code, check first, then make DB update
exports.deleteImage = function(req, next) {
    if (req.body.imageType === 'profile') {
        if (req.body.profileType === 'profile') {
            User.findOneAndUpdate({
                _id: req.authUserId
            }, {
                image: 'i/default-user-image.png'
            }, {
                new: true
            }, function(err, user) {
                next(err, user);
            });

        } else if (req.body.profileType === 'business') {
            Business.findOneAndUpdate({
                _id: req.body._id,
                usersAdmin: {
                    $eq: req.authUserId
                }
            }, {
                image: 'i/default-user-image.png'
            }, {
                new: true
            }, function(err, business) {
                next(err, business);
            });
        } else {
            next('no profile type provided', null);
        }
    } else if (req.body.imageType === 'cover') {
        if (req.body.profileType === 'profile') {
            User.findOneAndUpdate({
                _id: req.authUserId
            }, {
                coverImage: ''
            }, {
                new: true
            }, function(err, user) {
                next(err, user);
            });

        } else if (req.body.profileType === 'business') {
            Business.findOneAndUpdate({
                _id: req.body._id,
                usersAdmin: {
                    $eq: req.authUserId
                }
            }, {
                coverImage: ''
            }, {
                new: true
            }, function(err, business) {
                next(err, business);
            });
        } else {
            next('no profile type provided', null);
        }
    } else if (req.body.imageType === 'certificate') {
        if (req.body.profileType === 'profile') {
            User.findOneAndUpdate({
                _id: req.body._id
            }, {
                $pull: { certificates: req.body.imageUrl }
            }, function(err, user) {
                next(err, user);
            });
        } else {
            next('no profile type provided', null);
        }

    } else {
        next('no image type provided', null);
    }
};


exports.updateTastingImage = function(req, next) {
    Business.findOne({
            _id: req.body.businessId,
            usersAdmin: {
                $eq: req.authUserId
            }
        })
        .exec(function(err, business) {
            if (business && !err) {
                var tastingImage = {
                    filename: req.body.filename,
                    path: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/' + req.body.filename,
                    caption: req.body.caption || ''
                };
                Tasting.findOneAndUpdate({
                    _id: req.body.tastingId,
                    business: req.body.businessId
                }, {
                    $push: {
                        images: tastingImage
                    }
                }, {
                    safe: true,
                    runValidators: false,
                    new: true
                }, function(err, tasting) {
                    if (tasting && !err) {
                        next(err, tastingImage);
                    } else {
                        next(err, tasting);
                    }
                });
            } else {
                next(err, business);
            }
        });
};


exports.deleteTastingImage = function(req, next) {
    Business.findOne({
            _id: req.body.businessId,
            usersAdmin: {
                $eq: req.authUserId
            }
        })
        .exec(function(err, business) {
            if (business && !err) {
                Tasting.findOneAndUpdate({
                    _id: req.body.tastingId,
                    business: req.body.businessId
                }, {
                    "$pull": {
                        images: {
                            filename: req.body.filename
                        }
                    }
                }, {
                    safe: true,
                    runValidators: false,
                    new: true
                }, function(err, tasting) {
                    next(err, tasting);
                });
            } else {
                next(err, business);
            }
        });
};

exports.addEventProducts = function(req, next) {
    Business.findOne({
            _id: req.body.businessId,
            usersAdmin: {
                $eq: req.authUserId
            }
        })
        .exec(function(err, business) {
            if (business && !err) {
                if (req.body.tastingId) {
                    Tasting.findOneAndUpdate({
                        _id: req.body.tastingId
                    }, {
                        $set: {
                            products: req.body.products
                        }
                    }, {
                        new: true
                    }, function(err, tasting) {
                        // Notify users
                        tasting.users.forEach(function(userId) {
                            User.findOne({_id: userId}).then(user => {
                                notificationService.notify(notificationService.notifyTypes.addEventProduct,
                                {
                                    to: user.email,
                                    htmlParams: {
                                        comment: req.body.comment,
                                    },
                                });
                            })
                        });

                        next(err, tasting);
                    });
                } else if (req.body.competitionId) {
                    Competition.findOneAndUpdate({
                        _id: req.body.competitionId
                    }, {
                        $set: {
                            products: req.body.products
                        }
                    }, {
                        new: true
                    }, function(err, competition) {
                        next(err, competition);
                    });
                } else {
                    next('no model specified.');
                }
            } else {
                next(err, business);
            }
        });
};

exports.addProductReview = function(req, next) {
    if (req.body.rating >= 1 && req.body.rating <= 10) {
        var newReview = new Review({
            rating: req.body.rating,
            review: req.body.review,
            notes: req.body.notes,
            user: req.authUserId,
            product: req.body.productId,
            tasting: req.body.tastingId,
            competition: req.body.competitionId
        });
        if (req.body.tastingId) {
            Tasting.findOne({
                    _id: req.body.tastingId,
                    checkedIn: {
                        $eq: req.authUserId
                    }
                })
                .exec(function(err, tasting) {
                    if (tasting && !err) {
                        Review.findOne({
                            product: req.body.productId,
                            user: req.authUserId,
                            tasting: req.body.tastingId
                        }).exec(function(err, review) {
                            if (review) {
                                next('You have already reviewed this product.');
                            } else {
                                newReview.save(function(err, review) {
                                    if (err || !review)
                                        console.log(err, review);
                                    else {
                                        User.findOneAndUpdate({
                                            _id: req.authUserId,
                                        }, {
                                            "$push": {
                                                reviews: review._id
                                            }
                                        }, function(err) {
                                            if (err) console.log(err);
                                        });
                                    }
                                });
                                tasting.reviews.push(newReview._id);
                                tasting.save(function(err, tasting) {
                                    if (err || !tasting) console.log(err, tasting);
                                });
                                Product.findOne({
                                    _id: req.body.productId
                                }).exec(function(err, product) {
                                    product.reviews.push(newReview._id);
                                    product.total = product.total + req.body.rating;
                                    product.ratingCount++;
                                    product.rating = product.total / product.ratingCount;
                                    product.save(function(err, product) {
                                        if (err || !product) console.log(err, product);
                                    });
                                });
                                next(err, tasting);
                            }
                        });
                    } else {
                        next('Tasting not found or you haven\'t checked in.');
                    }
                });
        } else if (req.body.competitionId) {
            Review.findOne({
                product: req.body.productId,
                user: req.authUserId,
                competition: req.body.competitionId
            }).exec(function(err, review) {
                if (review) {
                    next('You have already reviewed this product.');
                } else {
                    Competition.findOne({
                            _id: req.body.competitionId
                        })
                        .exec(function(err, competition) {
                            newReview.save(function(err, review) {
                                if (err || !review)
                                    console.log(err, review);
                                else {
                                    User.findOneAndUpdate({
                                        _id: req.authUserId,
                                    }, {
                                        "$push": {
                                            reviews: review._id
                                        }
                                    }, function(err) {
                                        if (err) console.log(err);
                                    });
                                }
                            });
                            competition.reviews.push(newReview._id);
                            competition.save(function(err, competition) {
                                if (err || !competition) console.log(err, competition);
                            });
                            Product.findOne({
                                _id: req.body.productId
                            }).exec(function(err, product) {
                                product.reviews.push(newReview._id);
                                product.total = product.total + req.body.rating;
                                product.ratingCount++;
                                product.rating = product.total / product.ratingCount;
                                product.save(function(err, product) {
                                    if (err || !product) console.log(err, product);
                                });
                            });
                            next(err, competition);
                        });
                }
            });
        }
    } else {
        next('Invalid rating.');
    }
};

exports.getProductReviews = function(req, next) {
    Business.findOne({
            _id: req.body.businessId,
            usersAdmin: {
                $eq: req.authUserId
            }
        })
        .exec(function(err, business) {
            if (business && !err) {
                if (req.body.optionalArray && req.body.optionalArray.length > 0) {
                    Review.find({
                            _id: {
                                $in: req.body.optionalArray
                            },
                            product: req.body.productId,
                            $and: [{
                                $or: [{
                                    competition: req.body.eventId
                                }, {
                                    tasting: req.body.eventId
                                }]
                            }]
                        })
                        .populate('user', 'name image')
                        .exec(function(err, reviews) {
                            next(err, reviews);
                        });
                } else {
                    const query = { product: req.body.productId };
                    if (req.body.eventId) {
                        query.$and = [{
                            $or: [{
                                competition: req.body.eventId
                            }, {
                                tasting: req.body.eventId
                            }]
                        }];
                    }
                    Review.find(query)
                    .populate('user', 'name image')
                    .exec(function(err, reviews) {
                        next(err, reviews);
                    });
                }
            } else {
                next(err, business);
            }
        });
};

exports.reset = function(req, next) {
    bcrypt.hash(req.body.password, 10, function(err, hash) {
        User.findOneAndUpdate({
            resetPasswordToken: req.body.token,
            resetPasswordExpires: {
                $gt: Date.now()
            }
        }, {
            password: hash,
            resetPasswordToken: undefined,
            resetPasswordExpires: undefined
        }, {
            safe: true,
            runValidators: false
        }, function(err, user) {
            next(err, user);
        });
    });
};


exports.confirmEmail = function(req, next) {
    User.findOneAndUpdate({
        emailConfirmToken: req.body.token
    }, {
        $set: {
            emailConfirm: true
        },
        $unset: {
            emailConfirmToken: ''
        }
    }, {
        lean: true,
        select: '_id email name'
    }, function(err, user) {
        next(err, user);
    });
};


exports.getBusinesses = function(req, next) {
    Business
        .find({
            companyName: {
                $regex: '.*' + req.body.companyName + '.*',
                $options: 'i'
            },
            formattedAddress: {
                $exists: true
            }
        })
        .sort({
            companyName: 1
        })
        .select('companyName slug formattedAddress loc image')
        .limit(15)
        .exec(next);
};


exports.getUsers = function(req, next) {
    User
        .find({
            name: {
                $regex: '.*' + req.body.name + '.*',
                $options: 'i'
            }
        })
        .sort('name')
        .select('name image')
        .limit(500)
        .exec(function(err, users) {
            if (!users) {
                return next('No users found.', users);
            } else if (users) {
                next(err, users);
            }
        });

};


exports.getResourceUsers = function(req, next) {
    User.find({
            status: 'active',
            loc: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [req.body.lon, req.body.lat]
                    },
                    $maxDistance: 50000
                }
            },

            /*
            stripeAccount: {
                $exists: true
            }
            */
        })
        .sort('-overallSkill')
        .select('name image overallSkill positions resources events tastings reviews conflict')
        .populate({
            path: 'resources',
            select: 'title startTime endTime users'
        })
        .populate({
            path: 'events',
            select: 'title startsAt endsAt'
        })
        .populate({
            path: 'tastings',
            select: 'startTime endTime title business',
            populate: {
                path: 'business',
                select: 'companyName'
            }
        })
        .populate({
            path: 'reviews',
            select: 'review rating product',
            populate: {
                path: 'product',
                select: 'type name'
            }
        })
        .populate({
            path: 'conflict',
            select: 'accepted startTime endTime',
        })
        .limit(500)
        .exec(function(err, users) {
            if (!users) {
                return next('No users found.', users);
            } else if (users) {
          
                next(err, users);
            }
        });
};


exports.addEvent = function(req, next) {
    var newEvent = new Event(req.body);
    newEvent.loc = req.body.geoLocation;

    req.body.accountType = 'Business';
    req.body.accountHolder = req.body.business;

    stripeAccountService.validateStripeAccountRequestAndCheckUserAccess(req).then(
        function(account) {
            if (account && account.paymentMethod) {
                Business.findOne({
                    _id: req.body.business,
                    usersAdmin: {
                        $eq: req.authUserId
                    }
                }, function(err, business) {
                    if (business) {
                        business.events.push(newEvent._id);
                        business.save(function() {
                            newEvent.save(function(err, event) {
                                next(err, event);
                            });
                        });
                    } else {
                        next('Business not found.');
                    }
                });
            } else {
                next('You cannot access this Stripe account or no payment method.');
            }
        });
};

exports.editEvent = function(req, next) {
    Business.findOne({
        _id: req.body.business,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, function(err, business) {
        if (business && !err) {
            Event.findOneAndUpdate({
                _id: req.body.eventId
            }, {
                '$set': {
                    "title": req.body.title,
                    "description": req.body.description,
                    "loc": req.body.loc,
                    "formattedAddress": req.body.formattedAddress,
                    "startsAt":  req.body.startsAt,
                    "endsAt": req.body.endsAt
                }
            }, function(err, event) {
                if (err)
                    console.log(err);
                else {
                    // Notify users/resources
                    for (var i = event.resources.length - 1; i >= 0; i--) {
                        Resource.findOne({'_id': event.resources[i]})
                        .populate('filled', 'email')
                        .exec(function(err, resource) {
                            if (!resource.unfilled) {
                                notificationService.notify(notificationService.notifyTypes.editEventResource,
                                {
                                    to: resource.filled.email,
                                    htmlParams: {
                                        comment: req.body.comment,
                                    },
                                });
                            }
                        });
                    }
                }
            });
            next(null, business);
        } else {
            next('Business not found.', business);
        }
    });
};

// optimized
exports.addRating = function(req, next) {
    req.body.accountType = 'Business';
    req.body.accountHolder = req.body.businessId;

    const notify = function([user, resource, business]) {
        notificationService.notify(notificationService.notifyTypes.addRatingUser,
            {
                to: user.email,
                htmlParams: { businessName: business.companyName }
            });
        next(null, user, resource, business);
    };
    const failNotify = function(err) {
        next(err);
    };

    stripeAccountService.validateStripeAccountRequestAndCheckUserAccess(req).then(
        function(account) {
            if (account && account.paymentMethod) {
                const authUserId = req.authUserId;
                const {
                    businessId,
                    resourceId,
                    userId
                } = req.body;

                // User that did said job
                const userPromise = User.findOne({
                    _id: userId
                }, `
                    _id
                    skill
                    ratingCount
                    terms
                    stripeAccount
                `).populate('stripeAccount');

                // Position that was filled and is about to be rated
                const resourcePromise = Resource.findOne({
                    _id: resourceId
                }, `
                    _id
                    title
                    startTime
                    endTime
                `);

                // Business that's rating the user
                const businessPromise = Business.findOne({
                    _id: businessId,
                    usersAdmin: {
                        $eq: authUserId
                    },
                    rateResources: {
                        $eq: resourceId
                    }
                }, `
                    _id
                    recentUserJobScores
                `);

                Promise.all([
                    userPromise,
                    resourcePromise,
                    businessPromise
                ]).then(co.wrap(function([user, resource, business]) {
                    // Sanity check
                    if (!user) {
                        return next(`Cannot find user [${ userId }]`);
                    } else if (!resource) {
                        return next(`Cannot find resource [${ resourceId }]`);
                    } else if (!business) {
                        return next(`Cannot find business [${ businessId }]`);
                    }

                    // convert the ratings array into actual scores
                    /*
                    const ratings = termsService.answersToRatings(resource.title, req.body.ratings);

                    const commonTerms = termsService.getJobTerms(resource.title);
                    */
                    const coAfterGetData = co.wrap(function* (ratings, commonTerms) {
                        try {
                            // Construct user job score
                            // note: this does not add it to the collection,
                            // we'll do that in a bit
                            const jobScore = business.recentUserJobScores.create({
                                user: user._id,
                                jobType: resource.title,
                                score: ratingService.calculateScore(ratings),
                                ratings: ratings
                            });
                            // Get previous job score matching the job we're about to rate
                            const competitorJobScore = Array.from(business.recentUserJobScores)
                                .find(jobScore => jobScore.jobType === resource.title);

                            // If there was a previous job of this type then we've got some ranking to do

                            if (competitorJobScore) {

                                // yo. see `co` for why this works https://github.com/tj/co

                                const competitorUser =
                                    yield User.findById(competitorJobScore.user, `
                                    _id
                                    rank
                                    skill
                                    ratingCount
                                    terms
                                `);

                                // Trueskill for user by score
                                ratingService.adjustPlayerSkillByScore({
                                    // User
                                    model: user,
                                    score: jobScore.score
                                }, {
                                    // Competitor
                                    model: competitorUser,
                                    score: competitorJobScore.score
                                });
                                // Trueskill for terms by rating

                                ratingService.adjustPlayerSkillByTerms({
                                    // User
                                    terms: user.terms,
                                    ratings: ratings
                                }, {
                                    // Competitor
                                    terms: competitorUser.terms,
                                    ratings: competitorJobScore.ratings
                                }, commonTerms);
                                // if a user is competing against themselves, they don't both win and lose
                                if (String(user._id) !== String(competitorUser._id)) {
                                    // Don't need to stick around for this, just log it
                                    competitorUser.save(err => err && console.log('Failed to save competitorUser:', err));
                                }

                            }

                            // Overwrite existing job score.
                            // Will be persisted when business is saved
                            if (competitorJobScore) {
                                Object.assign(competitorJobScore, jobScore);
                            } else {
                                // Job score needs to be created
                                business.recentUserJobScores.push(jobScore);
                            }

                            var hours = moment(resource.endTime).diff(resource.startTime, 'hours', true),
                                fee = Math.round(5 * 100),
                                amount = Math.round(((3.35 * hours) * 100)) + fee;

                            let chargeResponse = {};
                            // Pay the user
                            try {
                                chargeResponse = yield stripeAccountService.createDirectCustomerChargeWithFee(account, user.stripeAccount.account, amount, fee);
                            } catch (e) {
                                if (process.env.ON_PRODUCTION === 'true') {
                                    next(e);
                                } else {
                                    console.log(e);
                                    console.log('WARNING: check .env file, current enviroment is not production.')
                                    // just development env
                                    resource.rated = true;
                                    resource.charge = null;
                                    return Promise.all([
                                        user.save(),
                                        resource.save(),
                                        business.save()
                                    ]).then(notify)
                                    .catch(failNotify);
                                }
                            }

                            // Flag resource as rated
                            resource.rated = true;
                            resource.charge = chargeResponse.id;

                            return Promise.all([
                                user.save(),
                                resource.save(),
                                business.save()
                            ]).then(notify)
                            .catch(failNotify);
                        } catch (e) {
                            next(e);
                        }
                    });

                    return termsService.answersToRatings(resource.title, req.body.ratings, (err, ratings) => {
                        if (err) return next(err);
                        else return termsService.getJobTerms(resource.title, (err, commonTerms) => {
                            if (err) return next(err);
                            else {
                                return coAfterGetData(ratings, commonTerms);
                            }
                        });
                    });
                })).catch(function onRejected(err) {
                    next(err);
                });
            } else {
                next('You cannot access this Stripe account or no payment method.');
            }
        });
};
// optimized
exports.addRating2Business = function(req, next) {

    if (req.body.rating_money >= 1 && req.body.rating_money <= 10 && req.body.rating_prof >= 1 && req.body.rating_prof <= 10 && req.body.rating_over >= 1 && req.body.rating_over <= 10) 
    {

        if (req.body.resourceId) {
            ReviewBusiness.findOne({
                resource: req.body.resourceId,
                user: req.authUserId,
            }).exec(function(err, review) {
                if (review) {
                    next('You have already reviewed this job.');
                } else {
                    Resource.findOne({
                            _id: req.body.resourceId
                        })
                        .exec(function(err, resource) {
                            var newReview = new ReviewBusiness({
                                rating_money: req.body.rating_money,
                                rating_prof: req.body.rating_prof,
                                rating_over: req.body.rating_over,
                                review: req.body.review,
                                notes: req.body.notes,
                                user: req.authUserId,
                                business: resource.business,
                                resource: req.body.resourceId
                            });
                            newReview.save(function(err, review) {
                                if (err || !review)
                                    console.log(err, review);
                                // else {
                                //     User.findOneAndUpdate({
                                //         _id: req.authUserId,
                                //     }, {
                                //         "$push": {
                                //             reviews: review._id
                                //         }
                                //     }, function(err) {
                                //         if (err) console.log(err);
                                //     });
                                // }
                                Business.findOne({
                                    _id: resource.business
                                }).exec(function(err, business) {
                                    if(business){
                                        business.reviews.push(newReview._id);
                                        business.total_money += req.body.rating_money;
                                        business.total_prof += req.body.rating_prof;
                                        business.total_over += req.body.rating_over;
                                        business.ratingCount++;
                                        business.rating_money = business.total_money / business.ratingCount;
                                        business.rating_prof = business.total_prof / business.ratingCount;
                                        business.rating_over = business.total_over / business.ratingCount;
                                        business.save(function(err, product) {
                                            if (err || !product) console.log(err, product);
                                        });
                                    }
                                });
                            });
                            resource.rated2Business = true;
                            resource.save();
                            // competition.reviews.push(newReview._id);
                            // competition.save(function(err, competition) {
                            //     if (err || !competition) console.log(err, competition);
                            // });
                            
                            next(err, resource);
                        });
                }
            });
        }
    } else {
        next('Invalid Business Review.');
    }

    // req.body.accountType = 'User';
    // req.body.accountHolder = req.body.userId;

    // const notify = function([user, resource, business]) {
    //     notificationService.notify(notificationService.notifyTypes.addRatingBusiness,
    //         {
    //             to: user.email,
    //             htmlParams: { businessName: business.companyName }
    //         });
    //     next(null, user, resource, business);
    // };
    // const failNotify = function(err) {
    //     next(err);
    // };

    // const authUserId = req.authUserId;
    // const {
    //     businessId,
    //     resourceId,
    //     userId
    // } = req.body;

    // // User that did said job
    // const userPromise = User.findOne({
    //     _id: userId
    // }, `
    //     _id
    // `);

    // // Position that was filled and is about to be rated
    // const resourcePromise = Resource.findOne({
    //     _id: resourceId
    // }, `
    //     _id
    //     title
    //     startTime
    //     endTime
    // `);

    // // Business that's rating the user
    // const businessPromise = Business.findOne({
    //     _id: businessId,
    // }, `
    //     _id
    //     recentUserJobScores
    // `);

    // Promise.all([
    //     userPromise,
    //     resourcePromise,
    //     businessPromise
    // ]).then(co.wrap(function([user, resource, business]) {
    //     // Sanity check
    //     if (!user) {
    //         return next(`Cannot find user [${ userId }]`);
    //     } else if (!resource) {
    //         return next(`Cannot find resource [${ resourceId }]`);
    //     } else if (!business) {
    //         return next(`Cannot find business [${ businessId }]`);
    //     }

    //     // convert the ratings array into actual scores
    //     /*
    //     const ratings = termsService.answersToRatings(resource.title, req.body.ratings);

    //     const commonTerms = termsService.getJobTerms(resource.title);
    //     */
    //     const coAfterGetData = co.wrap(function* (ratings, commonTerms) {
    //         try {
    //             // Construct user job score
    //             // note: this does not add it to the collection,
    //             // we'll do that in a bit
    //             const jobScore = business.recentUserJobScores.create({
    //                 user: user._id,
    //                 jobType: resource.title,
    //                 score: ratingService.calculateScore(ratings),
    //                 ratings: ratings
    //             });
    //             // Get previous job score matching the job we're about to rate
    //             const competitorJobScore = Array.from(business.recentUserJobScores)
    //                 .find(jobScore => jobScore.jobType === resource.title);

    //             // If there was a previous job of this type then we've got some ranking to do

    //             if (competitorJobScore) {

    //                 // yo. see `co` for why this works https://github.com/tj/co

    //                 const competitorUser =
    //                     yield User.findById(competitorJobScore.user, `
    //                     _id
    //                     rank
    //                     skill
    //                     ratingCount
    //                     terms
    //                 `);

    //                 // Trueskill for user by score

    //                 ratingService.adjustPlayerSkillByScore({
    //                     // User
    //                     model: user,
    //                     score: jobScore.score
    //                 }, {
    //                     // Competitor
    //                     model: competitorUser,
    //                     score: competitorJobScore.score
    //                 });
    //                 // Trueskill for terms by rating

    //                 ratingService.adjustPlayerSkillByTerms({
    //                     // User
    //                     terms: user.terms,
    //                     ratings: ratings
    //                 }, {
    //                     // Competitor
    //                     terms: competitorUser.terms,
    //                     ratings: competitorJobScore.ratings
    //                 }, commonTerms);
    //                 // if a user is competing against themselves, they don't both win and lose
    //                 if (String(user._id) !== String(competitorUser._id)) {
    //                     // Don't need to stick around for this, just log it
    //                     competitorUser.save(err => err && console.log('Failed to save competitorUser:', err));
    //                 }

    //             }

    //             // Overwrite existing job score.
    //             // Will be persisted when business is saved
    //             if (competitorJobScore) {
    //                 Object.assign(competitorJobScore, jobScore);
    //             } else {
    //                 // Job score needs to be created
    //                 business.recentUserJobScores.push(jobScore);
    //             }

    //             // Flag resource as rated
    //             resource.rated2Business = true;

    //             return Promise.all([
    //                 user.save(),
    //                 resource.save(),
    //                 business.save()
    //             ]).then(notify)
    //             .catch(failNotify);
    //         } catch (e) {
    //             next(e);
    //         }
    //     });

    //     return termsService.answersToRatings(resource.title, req.body.ratings, (err, ratings) => {
    //         if (err) return next(err);
    //         else return termsService.getJobTerms(resource.title, (err, commonTerms) => {
    //             if (err) return next(err);
    //             else {
    //                 return coAfterGetData(ratings, commonTerms);
    //             }
    //         });
    //     });
    // })).catch(function onRejected(err) {
    //     next(err);
    // });
};
exports.addExperience = function(req, next) {
    User.findById(req.authUserId, function(err, user) {
        if (user && !err) {
            const userData = {
                from: req.body.from,
                to: req.body.to,
                title: req.body.title,
                employer: req.body.employer
            };

            if (req.body.business && req.body.to === 'Current') {

                userData.business = req.body.business;

                const businessData = {
                    pending: true,
                    user: user._id
                };

                Business.findOneAndUpdate({
                    _id: req.body.business,
                    'employees.user': {
                        $ne: user._id
                    }
                }, {
                    "$push": {
                        employees: businessData
                    }
                }, function(err) {
                    if (err) console.log(err);
                });

            }

            user.positions.push(userData);
            user.save(function(err) {
                if (err) console.log(err);
            });
            next(null, user);
        } else if (user) {
            next('No users found.', user);
        }
    });
};


exports.removeExperience = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        "$pull": {
            positions: {
                _id: req.body._id
            }
        }
    }, function(err, user) {
        next(err, user);
    });
};

exports.acceptEmployee = function(req, next) {
    const {
        businessId,
        employeeId,
        userId
    } = req.body;

    Business.findOne({
        _id: businessId,
        usersAdmin: {
            $eq: req.authUserId
        },
        'employees._id': employeeId
    }, function(err, business) {

        business.employees.forEach(function(employee, index) {
            if (String(employee._id) === String(employeeId)) {
                business.employees[index].pending = false;
            }
        });

        business.save(function(err) {
            if (err) console.log(err);
        });

        if (business.tastings.length || business.competitions.length) {
            // emplyee user
            const userPromise = User.findOne({
                _id: userId
            }, `
                _id
                tastings
                competitions
            `);

            // Position that was filled and is about to be rated
            const competitionsPromise = Competition.find({
                _id: {
                    $in: business.competitions
                },
                endsAt: {
                    $gte: new Date().toISOString()
                }
            }, `
                _id
            `);

            // Position that was filled and is about to be rated
            const tastingsPromise = Tasting.find({
                _id: {
                    $in: business.tastings
                },
                endsAt: {
                    $gte: new Date().toISOString()
                }
            }, `
                _id
            `);

            // get each one
            Promise.all([
                userPromise,
                competitionsPromise,
                tastingsPromise
            ]).then(co.wrap(function*([user, competitions, tastings]) {

                // Sanity check
                if (!user) {
                    return next(`Cannot find user [${ userId }]`);
                }

                // concat tastings and competitions
                tastings.forEach(function(tasting) {
                    if (!user.tastings.some(function(id) {
                            return String(tasting._id) === String(id);
                        })) {
                        user.tastings.push(tasting._id);
                    }
                });
                competitions.forEach(function(competition) {
                    if (!user.competitions.some(function(id) {
                            return String(competition._id) === String(id);
                        })) {
                        user.competitions.push(competition._id);
                    }
                });

                // Save all the user
                return yield [user.save()];
            })).then(function() {
                console.log('Added current competitions and tastings to new employee');
            }, function onRejected(err) {
                console.log(err);
            });

        }

        // don't need to wait for the user stuff
        next(err, business);
    });

};


exports.declineEmployee = function(req, next) {
    Business.findOneAndUpdate({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, {
        $pull: {
            employees: {
                _id: req.body.employeeId
            }
        }
    }, function(err, user) {
        next(err, user);
    });
};


exports.addEducation = function(req, next) {
    var newEducation = req.body;
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        "$push": {
            education: newEducation
        }
    }, {
        safe: true,
        runValidators: false
    }, function(err, user) {
        next(err, user);
    });
};


exports.updateEducation = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId,
        'education._id': req.body._id
    }, {
        $set: {
            "education.$": req.body
        }
    }, {
        safe: true,
        runValidators: false
    }, function(err, user) {
        next(err, user);
    })
};


exports.removeEducation = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        "$pull": {
            education: {
                _id: req.body._id
            }
        }
    }, {
        safe: true,
        runValidators: false
    }, function(err, user) {
        next(err, user);
    });
};


exports.addSkill = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        $push: {
            skills: req.body
        }
    }, {
        lean: true,
        select: '_id'
    }, function(err, user) {
        next(err, user);
    });
};


exports.updateSkill = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId,
        'skills._id': req.body._id
    }, {
        $set: {
            'skills.$': req.body
        }
    }, {
        lean: true,
        select: '_id'
    }, function(err, user) {
        next(err, user);
    });
};


exports.removeSkill = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        $pull: {
            skills: {
                _id: req.body._id
            }
        }
    }, {
        lean: true,
        select: '_id'
    }, function(err, user) {
        next(err, user);
    });
};


exports.updateName = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        name: req.body.name
    }, {
        safe: true,
        runValidators: false
    }, function(err, user) {
        next(err, user);
    })
};

// TODO: This endpoint is fully optimized, but could be deprecated
exports.updateOccupation = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        occupation: req.body.occupation
    }, {
        safe: true,
        runValidators: false
    }, function(err, user) {
        next(err, user);
    })
};

exports.updatePhone = function(req, next) {
    User.findOneAndUpdate({
        _id: req.authUserId
    }, {
        mobilePhone: req.body.mobilePhone
    }, {
        safe: true,
        runValidators: false
    }, function(err, user) {
        next(err, user);
    })
};


exports.updateAddress = function(req, next) {
    //make request to google for lat and long
    var addressParam, options;
    if (req.body.address2) {
        addressParam = req.body.address1 + ' ' + req.body.address2 + ', ' + req.body.city + ', ' + req.body.regionId + ' ' + req.body.postalCode;
    } else {
        addressParam = req.body.address1 + ', ' + req.body.city + ', ' + req.body.regionId + ' ' + req.body.postalCode;
    }

    addressParam = addressParam.split(' ').join('+');

    if (process.env.PROXIMO_URL) {
        options = {
            proxy: process.env.PROXIMO_URL,
            url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + addressParam + '&key=' + process.env.GOOGLE_API_KEY,
            headers: {
                "Host": "maps.googleapis.com",
                "Referer": "api.speedcontractor.com"
            }
        };
    } else {
        options = {
            url: 'https://maps.googleapis.com/maps/api/geocode/json?address=' + addressParam + '&key=' + process.env.GOOGLE_API_KEY,
            headers: {
                "Host": "maps.googleapis.com",
                "Referer": "api.speedcontractor.com"
            }
        };
    }

    console.log(options.url);

    function callback(error, response, body) {
        console.log('body: ', body);
        if (!error && response.statusCode === 200) {

            body = JSON.parse(body);
            process.stdout.write(`\n\n@@@ google location api hit, result is ${JSON.stringify(body)},\n request was ${JSON.stringify(req.body, null, 2)}\n\n`);
            // we need to wrap the entire thing is this because google sends a
            // failure response back over a 200
            if (body && body.results.length > 0) {
                var locationData = {
                    type: 'Point',
                    coordinates: [body.results[0].geometry.location.lng, body.results[0].geometry.location.lat]
                };


                if (req.body.profileType === 'profile') {
                    User.findOneAndUpdate({
                        _id: req.authUserId
                    }, {
                        address1: req.body.address1,
                        address2: req.body.address2,
                        city: req.body.city,
                        regionId: req.body.regionId,
                        postalCode: req.body.postalCode,
                        country: 'US',
                        formattedAddress: body.results[0].formatted_address,
                        loc: locationData
                    }, {
                        safe: true
                    }, function(err, user) {
                        // notify user
                        notificationService.notify(notificationService.notifyTypes.updateAddressUser,
                            {
                                to: user.email
                            });
                        next(err, user);
                    })
                } else if (req.body.profileType === 'business') {
                    process.stdout.write(`\n\n$$ business address request submitted $$\n\n authUserId is ${req.authUserId}\n\n`);
                    Business.findOneAndUpdate({
                        _id: req.body.businessId,
                        usersAdmin: {
                            $eq: req.authUserId
                        }
                    }, {
                        address1: req.body.address1,
                        address2: req.body.address2,
                        city: req.body.city,
                        regionId: req.body.regionId,
                        postalCode: req.body.postalCode,
                        country: 'US',
                        formattedAddress: body.results[0].formatted_address,
                        loc: locationData
                    }, {
                        safe: true
                    }, function(err, business) {
                        // notify user
                        notificationService.notify(notificationService.notifyTypes.updateAddressBusiness,
                            {
                                to: business.email
                            });
                        next(err, business);
                    });
                } else {
                    next('profileType was not provided', null);
                }
            } else {
                next('Request failed', null);
            }
        } else {
            next('Request failed', null);
        }
    }
    request(options, callback);
};


exports.addAdministrator = function(req, next) {
    // find the user
    User.findById(req.authUserId, ['password'])
        .exec(function(err, user) {
            if (err) return next(err);

            if (!user) {
                return next('Authentication failed. User not found.', user);
            } else if (user) {
                // check if password matches
                bcrypt.compare(req.body.password, user.password, function(err, res) {
                    // if user is found and password is right
                    // create a token
                    if (res === true) {
                        Business.update({
                            _id: req.body.businessId,
                            usersAdmin: {
                                $eq: req.authUserId
                            }
                        }, {
                            $addToSet: {
                                usersAdmin: req.body.admin
                            }
                        }, function(err, rbusiness) {
                            if (rbusiness && !err) {
                                User.update({
                                    _id: req.body.admin
                                }, {
                                    $addToSet: {
                                        businesses: req.body.businessId
                                    }
                                }, function(err, ruser) {
                                    if (ruser && !err) {
                                        next(err, rbusiness);
                                    } else {
                                        next('Unable to save user.', ruser);
                                    }
                                });
                            } else {
                                next('Unable to save business.', rbusiness);
                            }
                        });
                    } else {
                        next('Authentication failed. Wrong password.', user);
                    }
                });
            }
        });
};


exports.addFBAdministrator = function(req, next) {
    verifyFBReauth(req.body.token).then(function(accessData) {
        if (accessData.auth_type && accessData.auth_type === 'reauthenticate') {
            // find the user
            User.findById(req.authUserId)
                .exec(function(err, user) {
                    if (user && !err) {
                        Business.update({
                            _id: req.body.businessId,
                            usersAdmin: {
                                $eq: req.authUserId
                            }
                        }, {
                            $addToSet: {
                                usersAdmin: req.body.admin
                            }
                        }, function(err, rbusiness) {
                            if (rbusiness && !err) {
                                User.update({
                                    _id: req.body.admin
                                }, {
                                    $addToSet: {
                                        businesses: req.body.businessId
                                    }
                                }, function(err, ruser) {
                                    if (ruser && !err) {
                                        next(err, rbusiness);
                                    } else {
                                        next('Unable to save user.', ruser);
                                    }
                                });
                            } else {
                                next('Unable to save business.', rbusiness);
                            }
                        });
                    } else {
                        return next('Authentication failed. User not found.', user);
                    }
                });
        } else {
            next('User canceled the dialog.', null);
        }
    });
};


exports.removeAdministrator = function(req, next) {
    // find the user
    User.findById(req.authUserId, ['password'])
        .exec(function(err, user) {
            if (err) return next(err);

            if (!user) {
                return next('Authentication failed. User not found.', user);
            } else if (user) {
                // check if password matches
                bcrypt.compare(req.body.password, user.password, function(err, res) {
                    // if user is found and password is right
                    // create a token
                    if (res === true) {
                        Business.update({
                            _id: req.body.businessId,
                            usersAdmin: {
                                $eq: req.authUserId
                            }
                        }, {
                            $pull: {
                                usersAdmin: req.body.admin
                            }
                        }, function(err, rbusiness) {
                            if (rbusiness && !err) {
                                User.update({
                                    _id: req.body.admin
                                }, {
                                    $pull: {
                                        businesses: req.body.businessId
                                    }
                                }, function(err, ruser) {
                                    if (ruser && !err) {
                                        next(err, rbusiness);
                                    } else {
                                        next('Unable to save user.', ruser);
                                    }
                                });
                            } else {
                                next('Unable to save business.', rbusiness);
                            }
                        });
                    } else {
                        next('Authentication failed. Wrong password.', user);
                    }
                });
            }
        });
};


exports.removeFBAdministrator = function(req, next) {
    verifyFBReauth(req.body.token).then(function(accessData) {
        if (accessData.auth_type && accessData.auth_type === 'reauthenticate') {
            // find the user
            User.findById(req.authUserId)
                .exec(function(err, user) {
                    if (user && !err) {
                        Business.update({
                            _id: req.body.businessId,
                            usersAdmin: {
                                $eq: req.authUserId
                            }
                        }, {
                            $pull: {
                                usersAdmin: req.body.admin
                            }
                        }, function(err, rbusiness) {
                            if (rbusiness && !err) {
                                User.update({
                                    _id: req.body.admin
                                }, {
                                    $pull: {
                                        businesses: req.body.businessId
                                    }
                                }, function(err, ruser) {
                                    if (ruser && !err) {
                                        next(err, rbusiness);
                                    } else {
                                        next('Unable to save user.', ruser);
                                    }
                                });
                            } else {
                                next('Unable to save business.', rbusiness);
                            }
                        });
                    } else {
                        return next('Authentication failed. User not found.', user);
                    }
                });
        } else {
            next('User canceled the dialog.', null);
        }
    });
};


exports.getConfirmResendUser = function(id, next) {
    User.findById(id, 'name email emailConfirmToken', { lean: true }, next);
};


exports.findInvite = function(token, next) {
    Invite.findOne({
        inviteToken: token
    }, function(err, invite) {
        next(err, invite);
    });
};

exports.getFullGallery = function(id, next) {
    Business.findById(id, 'galleryPhotoVideos', next);
}

exports.removePhotoGallery = function(id, photo, next) {
    Business.update({ _id: id }, {
        $pull: {
            galleryPhotoVideos: { _id: photo._id }
        }
    }, next);
}

exports.removeVideoGallery = function(id, video, next) {
    Business.update({ _id: id }, {
        $pull: {
            galleryPhotoVideos: { _id: video._id }
        }
    }, next);
}

exports.updateEmail = function(currentEmail, newEmail, next) {
    User.update({ email: currentEmail }, {
        $set: {
            email: newEmail
        }
    }, next);
}

exports.getMapMarkers = function(next) {
    const now = new Date();
    Resource.find({
        endTime: {
            $gte: now.toISOString()
        }
    }) 
    .populate('business', 'companyName _id city')
    .exec(next);
}
exports.getAllByCoords = function(coords, next) {
    const long = parseFloat(coords.long);
    const lat = parseFloat(coords.lat);
    const now = new Date();
    Resource.find({
        endTime: {
            $gte: now.toISOString()
        },
        unfilled: true,
        "loc.coordinates": [lat, long],
        users: { $exists: true, $eq: [] }
    })
    .sort({
        title: 1,
        "business.companyName": 1,
        endTime: 1
    })
    .populate('business', 'companyName _id')
    .populate('massHireResource')
    .exec(next);
}

exports.requestJobInvitation = function(jobId, userId, next) {
    Resource.findOne({ _id: jobId }, function(err, resource) {
        if (err) {
            console.log(err);
            next(err)
        } else {
            if (resource.invitationRequest.indexOf(userId) >= 0) {
                next({ msg: 'Request invitation previously sent.'});
            } else { // Push
                resource.invitationRequest.push(userId);
                resource.save(function(err) {
                    if (err) {
                        console.log(err);
                        next(err);
                    } else {
                        next(null, resource);
                    }
                });
            }
        }
    })
}

exports.jobByMassHire = function(massHireResource, group, next) {
    Resource.find({ massHireResource, group })
    .populate('business', 'companyName _id')
    .populate('invitationRequest', 'name _id')
    .exec(function(err, resources) {
        if (err) {
            console.log(err);
            next(err)
        } else {
            next(null, resources);
        }
    });
}

exports.sendInvitationJob = function(u, r, next){
    /*
    user.pendingResources --> resource id
    resource.invitedUsers --> user id
    NOTIFY
    */
    User.findOne({ _id: u._id }, function(err, user) {
        if (err) {
            next(err);
        } else {
            console.log('user', user._id);
            Resource.findOne({ _id: r._id}, function(error, resource) {
                if (error) {
                    next(err);
                } else {
                    console.log('resource', resource._id);
                    // Update resource
                    resource.invitedUsers.push(user._id);
                    // Update user
                    user.pendingResources.push(resource._id);
                    // Return something
                    const promises = [resource.save(), user.save()];
                    Promise.all(promises)
                    .then((res) => {
                        next(null, res);
                    })
                    .catch((promiseErr) => {
                        next(promiseErr);
                    });
                }
            });
        }
    });

}