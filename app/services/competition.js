'use strict';

const stripeAccountService = require('pp/services/stripe');
//const priceService = require('pp/services/prices');
const boostableJobsService = require('pp/services/boost-jobs');
const ratingService = require('pp/services/rating');
const notificationService = require('pp/services/notification');
const mandrill = require('node-mandrill')('qyWPKiR-JFh40H3U4m6O6A');
let crypto = require('crypto');

var plivo = require('plivo');
var p = plivo.RestAPI({
  authId: 'MAN2M2MJQ4YWQWMJGYZW',
  authToken: 'OTg3YjU3OGMzNGViYmRiYTRmYjQ5NWU3YTFhYTk3'
});

const {
    Business,
    Competition,
    Invite,
    User,
    CompetingEmployee,
    PendingCompetition
} = require('pp/models');

exports.addCompetition = function(req, next) {
    if (req.body.competitors.length > 0 && req.body.competitors.length <= 3) {
        req.body.accountType = 'Business';
        req.body.accountHolder = req.body.business;
        // hitting test endpoint
        stripeAccountService.validateStripeAccountRequestAndCheckUserAccess(req).then(function(account) {
            if (account && account.paymentMethod) {
                let amount = 0;
//                if (req.body.tier === '4') {
                    amount = req.body.base + req.body.base * 0.15;
//                } else {
//                    const price = priceService.getPrices('competition');
//                    amount = price[parseInt(req.body.tier, 10)][req.body.competitors.length].price;
//                }
                // charge the customer before we make any changes to the DB
                if (process.env.ON_PRODUCTION === 'false') { // On Development
                    createCompetitionWithDummyData(next);
                } else { // On Production
                    stripeAccountService
                    .createDirectCustomerCharge(account, amount)
                    .then((chargeResponse) => {
                        createCompetition(chargeResponse, next);
                    })
                    .catch(next);
                }
            } else {
                next('You cannot access this Stripe account or no payment method.');
            }
        });
    } else {
        next('We do not support that many competing restaurants yet.');
    }

    // Auxiliar functions

    // Add competition
    function createCompetition(chargeResponse, next) {
        Business.findOne({
            _id: req.body.business,
            usersAdmin: {
                $eq: req.authUserId
            }
        }, function(err, business) {
            if (business && !err) {
                var competition = new Competition({
                    title: req.body.title,
                    competitors: req.body.competitors,
                    startsAt: req.body.startsAt,
                    endsAt: req.body.endsAt,
                    description: req.body.description,
                    business: req.body.business,
                    pendingCompetitors: req.body.competitors.length,
                    charge: chargeResponse.id
                });
                competition.save(function(err) {
                    if (err) console.log(err);
                });
                competition.competitors.forEach(function(competitor) {
                    Business.findByIdAndUpdate(competitor.business, {
                        $push: {
                            competitions: competition._id
                        }
                    }, function(err) {
                        if (err) console.log(err);
                    });
                });
                business.myCompetitions.push(competition._id);
                business.save(function(err) {
                    if (err) console.log(err);
                });
                next(null, competition);
            } else {
                next('Business not found.', business);
            }
        });
     }

     // Create competition with dummy data
     function createCompetitionWithDummyData(next) {
        createCompetition({ id: 1111 }, next); // id: 1111  -dummy data, emulates stripe data provided
     }

};



exports.deleteCompetition = function(req, res, next) {
    Competition.findById(req.body.competitionId, function(err, competition) {
        if (competition && !err) {
            if (!competition.cutOff) {
                req.body.accountType = 'Business';
                req.body.accountHolder = req.body.businessId;
                // hitting test endpoint
                stripeAccountService.validateStripeAccountRequestAndCheckUserAccess(req).then(function(account) {
                    if (account) {
                        // remove the competition
                        Competition.remove({ _id: competition._id }, function(err) {
                            if (err) console.log(err);
                        });

                        // refund the customer for their charge
                        stripeAccountService
                            .refundDirectCustomerCharge(competition.charge)
                            .catch(next);

                        next(err, competition);

                    } else {
                        next('You cannot access this Stripe account.');
                    }
                });
            } else {
                next('The deadline has passed to cancel this competition.');
            }
        } else {
            next('Competition not found.', competition);
        }
    });
};


exports.getCompetition = function(req, next) {
    if (req.authUserId) {
        Competition
            .findOne({
                _id: req.body._id
            })
            .deepPopulate(['competitors.business', 'competitors.business.employees.user', 'competitors.competingEmployees', 'competitors.competingEmployees.user', 'products'], {
                populate: {
                    'competitors.business': {
                        select: 'usersAdmin companyName slug image employees'
                    },
                    'competitors.business.employees.user': {
                        select: 'slug image name'
                    },
                    'competitors.competingEmployees': {
                        select: 'user score business'
                    },
                    'competitors.competingEmployees.user': {
                        select: 'slug image name'
                    },
                    'products': {
                        select: 'name description image reviews rating'
                    }
                }
            })
            .exec(function(err, competition) {
                if (competition && !err) {
                    // convert to editable object
                    competition = competition.toObject();

                    competition.competitors.forEach(function(competitor) {

                        function checkAuthId(id) {
                            return String(id) === String(req.authUserId);
                        }

                        function checkEmployeeAuthId(employee) {
                            return employee.user && String(employee.user._id) === String(req.authUserId);
                        }

                        // check if they are an admin
                        if (competitor.business.usersAdmin.some(checkAuthId)) {
                            competitor.isAdmin = true;
                        }

                        // remove employees for the competitor if they aren't an admin or an employee
                        if (!competitor.isAdmin && !competitor.business.employees.some(checkEmployeeAuthId)) {
                            delete competitor.business.employees;
                            competitor.isAdmin = false;
                        }

                        // delete the admin array for security
                        delete competitor.business.usersAdmin;
                    });
                    next(err, competition);
                } else {
                    return next('Competition doesn\'t exist.', competition);
                }
            });
    } else {
        Competition
            .findOne({
                _id: req.body._id
            })
            .deepPopulate(['competitors.business', 'products'], {
                populate: {
                    'competitors.business': {
                        select: 'companyName slug image'
                    },
                    'products': {
                        select: 'name description image reviews rating'
                    }
                }
            })
            .exec(function(err, competition) {
                if (competition && !err) {
                    next(err, competition);

                } else {
                    return next('Competition doesn\'t exist.', competition);
                }
            });
    }
};


exports.updateCompetitionScore = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        },
        myCompetitions: {
            $eq: req.body.competitionId
        }
    }, function(err, business) {
        if (business && !err) {
            Competition.findOneAndUpdate({
                _id: req.body.competitionId,
                'competitors._id': req.body.competitorId
            }, {
                '$set': {
                    "competitors.$.score": req.body.newScore
                }
            }, function(err) {
                if (err) console.log(err);
            });
            next(null, business);
        } else {
            next('Business not found.', business);
        }
    });
};

exports.updateEmployeeCompetitorScore = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, function(err, business) {
        if (business && !err) {
            CompetingEmployee.findOneAndUpdate({
                _id: req.body.competingEmployeeId,
                business: {
                    $eq: req.body.businessId
                }
            }, {
                '$set': {
                    score: req.body.newScore
                }
            }, function(err) {
                if (err) console.log(err);
            });
            next(err, business);
        } else {
            next('Business not found.', business);
        }
    });
};

exports.acceptCompetition = function(req, res, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        },
        competitions: {
            $eq: req.body.competitionId
        }
    }, function(err, business) {
        if (business && !err) {
            // decline conflicting competitions
            if (req.body.conflictingCompetitions.length > 0) {
                req.body.conflictingCompetitions.forEach(function(competition) {
                    // remove the conflicting competition from the invited business
                    var index = business.competitions.indexOf(req.body.competitionId);
                    if (index >= 0) {
                        business.competitions.splice(index, 1);
                    }
                    // decline the competition
                    Competition.findById(competition._id, function(err, conflictingCompetition) {
                        if (conflictingCompetition && !err) {
                            // get index of competitor
                            var competitorIndex = conflictingCompetition.competitors.findIndex(function(competitor) {
                                return String(competitor.business) === String(req.body.businessId);
                            });
                            // set competitor to declined
                            if (competitorIndex >= 0) {
                                conflictingCompetition.competitors[competitorIndex].status = 'declined';
                            }
                            // decrement number of pendingCompetitors invitees
                            conflictingCompetition.pendingCompetitors--;
                            conflictingCompetition.save(function(err) {
                                if (err) console.log(err);
                            });
                        } else {
                            console.log(err);
                        }
                    });
                });
            }
            // add the competition to each employee's model
            User.update({
                _id: {
                    $in: business.employees.map(o => o.user)
                }
            }, {
                $addToSet: {
                    competitions: req.body.competitionId
                }
            }, {
                multi: true
            }, function(err) {
                if (err) console.error('Error adding employee competitions:', err);
            });
            // accept the competition
            Competition.findById(req.body.competitionId, function(err, competition) {
                if (competition && !err) {
                    // get index of competitor
                    var competitorIndex = competition.competitors.findIndex(function(competitor) {
                        return String(competitor.business) === String(req.body.businessId);
                    });
                    // set competitor to accepted
                    if (competitorIndex >= 0) {
                        competition.competitors[competitorIndex].status = 'accepted';
                    }
                    // decrement number of pendingCompetitors invitees
                    competition.pendingCompetitors--;
                    competition.save(function(err) {
                        if (err) console.log(err);
                    });
                    // Notify business
                    Business.findById(competition.business, function(err, businessManager) {
                        notificationService.notify(notificationService.notifyTypes.acceptCompetitionBusiness,
                            {
                                to: businessManager.email,
                                htmlParams: { competitionTitle: competition.title }
                            });
                    });
                } else {
                    console.log(err);
                }
            });
            next(null, business);
        } else {
            next('Business not found.', business);
        }
    });
};


exports.declineCompetition = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        },
        myCompetitions: {
            $eq: req.body.competitionId
        }
    }, function(err, business) {
        if (business && !err) {
            // remove the competition from the invited business
            var index = business.competitions.indexOf(req.body.competitionId);
            if (index >= 0) {
                business.competitions.splice(index, 1);
            }
            business.save(function(err) {
                if (err) console.log(err);
            });
            // decline the competition
            Competition.findById(req.body.competitionId, function(err, competition) {
                if (competition && !err) {
                    // get index of competitor
                    var competitorIndex = competition.competitors.findIndex(function(competitor) {
                        return String(competitor.business) === String(req.body.businessId);
                    });
                    console.log('competitorIndex: ', competitorIndex);
                    // set competitor to declined
                    if (competitorIndex >= 0) {
                        competition.competitors[competitorIndex].status = 'declined';
                    }
                    // decrement number of pendingCompetitors invitees
                    competition.pendingCompetitors--;
                    var managerBusinessId = competition.business;
                    var competitionTitle = competition.title;
                    competition.save(function(err) {
                        if (err) return console.log(err);
                        // Notify business
                        Business.findById(managerBusinessId, function(err, businessManager) {
                        notificationService.notify(notificationService.notifyTypes.declineCompetitionBusiness,
                            {
                                to: businessManager.email,
                                htmlParams: { competitionTitle }
                            });
                    });
                    });
                } else {
                    console.log(err);
                }
            });
            next(null, business);
        } else {
            next('Business not found.', business);
        }
    });
};


exports.addCompetingEmployees = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        },
        competitions: {
            $eq: req.body.competitionId
        }
    }, function(err, business) {
        if (business && !err) {
            var competingEmployees = req.body.competingEmployees.map(function(employee) {
                if (!employee.score) {
                    delete employee._id;
                    employee = new CompetingEmployee(employee);
                    employee.save(function(err) {
                        if (err) console.log(err);
                    });
                }
                return employee;
            });
            Competition.findOneAndUpdate({
                _id: req.body.competitionId,
                'competitors._id': req.body.competitorId
            }, {
                '$set': {
                    "competitors.$.competingEmployees": competingEmployees
                }
            }, function(err) {
                if (err) console.log(err);
            });
            next(err, competingEmployees);
        } else {
            next(err, business);
        }
    });
};

exports.acceptCompetitionProfile = function(req, next) {
    Competition.findOne({
        _id: req.body.competition._id
    }, function(err, competition) {
        if (err && !competition) {
            console.log(err);
            next(err, null);
        }
        if (competition) {
            let employee = new CompetingEmployee({
                business: req.body.business._id,
                user: req.authUserId
            });
            employee.save(function (err) {
                if (err) {
                    console.log(err);
                    next(err, null);
                }
                competition.competitors.forEach((comp) => {
                if (comp._id == req.body.competitor)
                    comp.competingEmployees.push(employee);
                });
                competition.save(function (err) {
                    if (err) {
                        console.log(err);
                        next(err, null);
                    }
                    User.findOne({_id: req.authUserId}, function(err, user) {
                        if (err) console.log(err);
                        user.pendingCompetitions.splice(user.pendingCompetitions.indexOf(req.body._id), 1);
                        user.competitions.push(req.body.competition._id);
                        PendingCompetition.remove({id: req.body._id});
                        user.save(function (err) {
                            if (err) {
                                next(err, null);
                            } else {
                                next(err, competition);
                            }
                        });
                    });
                });
            });
        }
    });
};

exports.declineCompetitionProfile = function(req, next) {
    User.findOne({_id: req.authUserId}, function(err, user) {
        if (err) console.log(err);
        user.pendingCompetitions.splice(user.pendingCompetitions.indexOf(req.body._id), 1);
        PendingCompetition.remove({id:req.body._id});
        user.save(function (err) {
            if (err) {
                console.log(err);
            }
            next(err, user);
        });
    });
};

exports.addCompetingEmployeesEmail = function(req, emails) {
    let result = [];
    emails.forEach((email) => {
        User.findOne({email: email}, function(err, user) {
            if (!err && user) {
                let pendingCompetition = new PendingCompetition({
                    competition: req.body.competitionId,
                    business: req.body.businessId,
                    competitor: req.body.competitorId
                });
                pendingCompetition.save(function(err) {
                    if (err) console.log(err)
                    user.pendingCompetitions.push(pendingCompetition);
                    user.save(function(err) {
                        if (err) console.log(err);
                    });
                });
            } else {
                crypto.randomBytes(20, function(err, buf) {
                    var token = buf.toString('hex');
                    Invite.findOne({
                        inviteEmail: email,
                        competition: req.body.competitionId
                    }, function(err, existingInvite) {
                        if (existingInvite) {
                            result.push({email: email, success: false});
                        } else {
                            var newInvite = new Invite({
                                user: req.authUserId,
                                inviteToken: token,
                                inviteEmail: email,
                                competition: req.body.competitionId,
                                business: req.body.businessId,
                                competitor: req.body.competitorId
                            });
                            newInvite.save(function(err) {
                                if (err) console.log(err)
                                /*
                                    Replace mandrill in the future.
                                    notificationService.notify(notificationService.notifyTypes.addCompetingEmployee,
                                        {
                                            to: email
                                        });
                                */
                                mandrill('/messages/send', {
                                    "message": {
                                        "text": 'You have been invited to join the Speed Contractor Beta.\n\n' +
                                            'Please click on the following link, or paste this into your browser to register:\n\n' +
                                            'https://www.speedcontractor.com/register/' + token + '\n',
                                        "subject": 'You\'re Invited! - Speed Contractor',
                                        "from_email": "do-not-reply@speedcontractor.com",
                                        "from_name": "Speed Contractor",
                                        "to": [{
                                            "email": email,
                                            "name": "New User",
                                            "type": "to"
                                        }],
                                        "tags": [
                                            "user-invite"
                                        ],
                                        "google_analytics_domains": [
                                            "www.speedcontractor.com"
                                        ],
                                        "google_analytics_campaign": "message.do-not-reply@speedcontractor.com",
                                        "metadata": {
                                            "website": "www.speedcontractor.com"
                                        }
                                    }
                                }, function(err, response) {
                                    //uh oh, there was an error
                                    if (err) {
                                        console.log(JSON.stringify(err));
                                        result.push({email: email, success: false});
                                    }
                                    console.log(response);
                                    result.push({email: email, success: true});
                                });
                            });
                        }
                    });
                });
            }
        });
    });
};

exports.addCompetingEmployeesPhone = function(req, phones) {
    let result = [];
    phones.forEach((phone) => {
        crypto.randomBytes(10, function(err, buf) {
            var token = buf.toString('hex');
            Invite.findOne({
                inviteSMS: phone,
                competition: req.body.competitionId
            }, function(err, existingInvite) {
                if (existingInvite) {
                    result.push({phone: phone, success: false});
                } else {
                    var newInvite = new Invite({
                        user: req.authUserId,
                        inviteToken: token,
                        inviteSMS: phone,
                        competition: req.body.competitionId,
                        business: req.body.businessId,
                        competitor: req.body.competitorId
                    });
                    newInvite.save(function(err) {
                        if (err) console.log(err)
                        var params = {
                            'src': '2087619701',
                            'dst' : phone.replace('+',''),
                            'text' : 'You have been invited to join the Speed Contractor Beta. \n' +
                                'https://www.speedcontractor.com/register/' + token
                        };

                        p.send_message(params, function (status, response) {
                            console.log('Status: ', status);
                            console.log('API Response:\n', response);
                            console.log('Message UUID:\n', response['message_uuid']);
                            console.log('Api ID:\n', response['api_id']);
                        });
                    });
                }
            });
        });
    });
};

exports.finalizeCompetition = function(req, next) {
    Business.findOne({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        },
        myCompetitions: {
            $eq: req.body.competitionId
        }
    }, function(err, business) {
        if (business && !err) {
            Competition.findById(req.body.competitionId)
                .populate({
                    path: 'products',
                    model: 'Product',
                    select: 'type'
                })
                .exec(function(err, competition) {
                    if (competition.ended && !competition.finalized) {
                        // get the boosts from the products in the tasting
                        var boosts = boostableJobsService.getBoosts(competition.products),
                            competingEmployees = [],
                            competitorMap = {};

                        // generate master employee list and compeitor map
                        competition.competitors.forEach(function(competitor) {
                            // if we don't have two employees to compete against eachother,
                            // don't add that restaurants employees
                            if (competitor.competingEmployees.length > 1) {
                                // creating a map with business ID as keys for quick access
                                competitorMap[competitor.business] = {
                                    users: [],
                                    terms: {}
                                };
                                // create one large list of all competing employees so we can do one query
                                competingEmployees = competingEmployees.concat(competitor.competingEmployees);
                            }
                        });

                        CompetingEmployee.find({
                                _id: {
                                    $in: competingEmployees
                                }
                            })
                            .populate('user', '_id skill ratingCount terms')
                            .lean()
                            .exec(function(err, competingEmployees) {
                                // run through the returned list and add the employees back to the corresponding biz
                                competingEmployees.forEach(function(employee) {
                                    competitorMap[employee.business].users.push(employee);
                                });

                                var rank,
                                    competitor,
                                    id;

                                for (id in competitorMap) {
                                    rank = 1;
                                    competitor = competitorMap[id];
                                    competitor.users = competitor.users
                                        // sort them by score decending
                                        .sort(function(a, b) {
                                            return b.score - a.score;
                                        })
                                        // set the rank of the user and each boosted term,
                                        // then map the list item to the user instead of competingEmployee doc
                                        .map(function(employee, index, orig) {
                                            var prevEmployee = orig[index - 1];
                                            if (prevEmployee && prevEmployee.score !== employee.score) {
                                                // drop the rank when we see an employee with a new score
                                                rank++;
                                            }
                                            employee.user.rank = rank;
                                            employee.user.terms.forEach(function(term) {
                                                if (boosts.includes(term.term) || term.term === 'overallSales') {
                                                    term.rank = rank;
                                                    term.user = employee.user._id;
                                                    if (competitor.terms[term.term]) {
                                                        competitor.terms[term.term].push(term);
                                                    } else {
                                                        competitor.terms[term.term] = [term];
                                                    }
                                                }
                                            });
                                            return employee.user;
                                        });

                                    // run trueskill on the users list
                                    ratingService.AdjustPlayers(competitor.users);

                                    // if we have boosts, run trueskill on those terms
                                    boosts.forEach(function(key) {
                                        ratingService.AdjustPlayers(competitor.terms[key]);
                                    });
                                    // run trueskill on overallSales which should always be present
                                    ratingService.AdjustPlayers(competitor.terms['overallSales']);

                                    // this is the shitty part...
                                    // create a map in the form
                                    // {
                                    //   "5892e7dda70d44119a47629c" : {
                                    //      "liquorKnowledge": {
                                    //        ... term stuffs ...
                                    //      }
                                    //   }
                                    // }
                                    // this will allow us quick lookup for adding those terms back
                                    // to the user document so we can update the user in one db call.
                                    // alternatively we could do 4 or less updates for each term + one
                                    // for the users field. this seemed better due to less db queries and
                                    // the fact that most restaurants don't have a ton of employees.
                                    var termMap = {},
                                        key;

                                    for (key in competitor.terms) {
                                        competitor.terms[key].forEach(function(term) {
                                            term.overallSkill = ratingService.calculateOverallSkill(term.skill);
                                            term.ratingCount++;
                                            if (!termMap[term.user]) {
                                                termMap[term.user] = {
                                                    [term.term]: term
                                                };
                                            } else {
                                                termMap[term.user][term.term] = term;
                                            }
                                        });
                                    }

                                    // use the termMap we just created to update the user doc and update
                                    competitor.users.forEach(function(user) {
                                        user.terms = user.terms.map(function(term) {
                                            if (boosts.includes(term.term) || term.term === 'overallSales') {
                                                return termMap[user._id][term.term];
                                            }
                                            return term;
                                        });
                                        user.ratingCount++;
                                        User.findByIdAndUpdate(user._id, {
                                            $set: {
                                                skill: user.skill,
                                                ratingCount: user.ratingCount,
                                                terms: user.terms,
                                                overallSkill: ratingService.calculateOverallSkill(user.skill)
                                            }
                                        }, function(err) {
                                            if (err) {
                                                console.log(err);
                                            }
                                        });
                                    });
                                }
                            });
                    }
                    // finalize the competition (prevents it from showing in feed)
                    competition.finalized = true;
                    competition.save(next);
                });
        } else {
            next(err, business);
        }
    });
};
