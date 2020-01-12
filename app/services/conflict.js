const Promise = require('bluebird');
var moment = require('moment');

const {
    Resource,
    Conflict,
    Business,
    User,
    Tasting
} = require('pp/models');

exports.resolveTastingBusiness = function(tasting) {
    return new Promise((resolve, reject) => {
        Tasting.findById(tasting, function(err, rtasting) {
            if (rtasting && !err) {
                rtasting.declined = true;
                rtasting.save(function(err, rrtasting) {
                    if (rrtasting && !err) {
                        resolve();
                    } else {
                        console.log('tasting not saved or error: ', err, rrtasting);
                        reject(err);
                    }
                });
            } else {
                console.log('tasting not found or error: ', err, rtasting);
                reject(err);
            }
        });
    });
}
exports.createAndResolve = function(type, jobId, startTime, endTime, userId = null, accepted = false ) {
    return new Promise((resolve, reject) => {
        detectConflicts(startTime, endTime, userId).then((resolved) => {
            const listConf = resolved.listConf;
            const user = resolved.user;
            const conflict = new Conflict({
                type: type,
                tastings: (type=='Tasting')? [jobId]:[],
                resources: (type=='Resource')? [jobId]:[],
                startTime: startTime,
                endTime: endTime,
                accepted
            });
            conflict.save((err, conf) => {
                if (!conf || err) {
                    reject('conflict not created');
                } else {
                    resolveConflicts(conf, listConf, user).then(() => {
                        resolve(conf._id);
                    }).catch(err => {
                        console.log(err);
                        reject('conflict could not be resolved');
                    })
                }
            });
        })
    });

}

function detectConflicts(startTime, endTime, userId) {
    return new Promise((resolve, reject) => {
        User.findOne({
            _id: userId
        }).then((user) => {
            let listConf = [];
            user.conflict.forEach((conf) => {
                if (!conf.accepted) {
                    let start = moment(conf.startTime);
                    let end = moment(conf.endTime);
                    if (((start.isSame(endTime) || start.isBefore(endTime)) && (end.isSame(startTime) || end.isAfter(startTime)))) {
                        listConf.push(conf);
                    }
                }
            });
            resolve({listConf:listConf, user:user});
        }).catch(err => {
            console.log(err);
            reject('user not found');
        });
    });
}

function resolveConflicts(conflict, listConf, user) {
        let promises = [];
        listConf.forEach((conf) => {
            promises.push(selectType(conf, user));
        })
        return Promise.all(promises);
}

function selectType(conflict, user) {
    Conflict.findOne({
        _id: conflict
    }).then((conf) => {
        const select = {
            'Tasting': resolveTasting,
            'Resource': resolveResource,
        }
        return select[conf.type](conf, user);
    })
}


function resolveTasting(conflict, user) {
    return new Promise((resolve, reject) => {
        Tasting.findOne({_id:conflict.tastings[0]})
        .then((rtast) => {
            const index = rtast.users.indexOf(user._id);
            if (index >= 0) {
                rtast.users.splice(index, 1);
            }
            const indexi = user.tastings.indexOf(conflict.tastings[0]);
            if (indexi >= 0) {
                user.tastings.splice(indexi, 1);
            }
            rtast.save().then(() => {
                acceptConflict(conflict).then(() => {
                    user.save().then(() => {
                        resolve();
                    }).catch(err => {
                        console.log(err);
                        reject('cannot save user');
                    });
                }).catch(err => {
                    console.log(err);
                    reject('cannot save conflict');
                });
            }).catch(err => {
                console.log(err);
                reject('error in save tasting');
            });
        }).catch(err => {
            console.log(err);
            reject('tasting not found');
        })
    });
}

function acceptConflict(conflict) {
    conflict.accepted = true;
    return conflict.save();
}

function resolveResource(conflict, user) {
    return new Promise((resolve, reject) => {
        const resourceQuery = Resource.findById(conflict.resources[0]).populate('invitedUsers event').exec();
        resourceQuery.then((resource) => {
            const businessQuery = Business.findById(resource.business);
            businessQuery.then((business) => {

                resource.filled = null;
                resource.accepted = false;
                resource.unfilled = true;
                // add resource to resources biz and filled user
                let index = business.resources.indexOf(conflict.resources[0]);
                if (index < 0) {
                    console.log('remove resource business');
                    business.resources.splice(index, 1);
                }
                index = user.resources.indexOf(conflict.resources[0]);
                if (index < 0) {
                    console.log('remove resource user');
                    user.resources.splice(index, 1);
                }
                resource.save(function(err, rresource) {
                    if (rresource && !err) {
                        acceptConflict(conflict).then(() => {
                            user.save().then(() => {
                                business.save().then(() => {
                                    resolve();
                                }).catch(err => {
                                    console.log(err);
                                    reject('cannot save business');
                                });
                            }).catch(err => {
                                console.log(err);
                                reject('cannot save user');
                            });
                        }).catch(err => {
                            console.log(err);
                            reject('cannot save conflict');
                        });
                    } else {
                        reject('resource not saved or error: ', rresource);
                    }
                });
            });
        })
        .catch((err) => {
            console.log('Error acceptResource: ', err);
        });
    });
}











