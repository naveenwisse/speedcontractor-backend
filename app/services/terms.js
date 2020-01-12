const {
    Position,
    Term
} = require('pp/models');

/*
const universalKeys = {
    dependability: 1,
    punctuality: 1,
    attention: 1,
    teamPlayer: 1,
    clientFacing: 1,
    multitasks: 1,
    trustworthy: 1
};
*/

exports.getJobTypes = function(next) {
    Position.find({ status: 'active' }, 'name', (err, jobs) => {
        if (err) next(err, null);
        else {
            const jobsNames = jobs.map(function(job) {
                return job.name;
            });
            next(null, jobsNames);
        }
    });
};

exports.getJobTerms = function(role, next) {
    Position.findOne({ name: role }, 'terms', (err, position) => {
        if (err) next(err, null);
        else {
            const result = [];
            position.terms.forEach((term) => {
                const key = term.model;
                result.push(key);/*
                if (!universalKeys.hasOwnProperty(key)) {
                    result.push(key);
                }
                */
            });
            next(null, result);
        }
    });
};

exports.getJobQuestions = function(role, next) {
    Position.findOne({ name: role }, 'questions', (err, position) => {
        if (err) next(err, null);
        else next(null, position.questions);
    });
};

exports.answersToRatings = function(role, answers, next) {
    Position.findOne({ name: role}, 'terms', (err, position) => {
        if (err) next(err, null);
        else {
            const result = {};
            position.terms.forEach(function(term) {
                var key = term.model,
                    questions = term.questions,
                    sum;
                if (questions.length > 0) {
                    sum = questions.reduce(function(total, index) {
                        return total + parseFloat(answers[index]);
                    }, 0);
                    result[key] = sum / questions.length;
                }
            });
            next(null, result);
        }
    });
};

exports.getDefaultTerms = function(next) {
    Term.find({}, (err, terms) =>{
        if (err) next(err, null);
        else next(null, terms);
    });
};