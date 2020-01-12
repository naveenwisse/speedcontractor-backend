var trueskill = require("trueskill");

 function incrementRatingCounts(model1, model2) {
    model1.ratingCount++;
    // Don't increment count of second model if it
    // has the same identity ( per id ) as model one
    if (model1.id !== model2.id) {
        model2.ratingCount++;
    }
}

exports.AdjustPlayers = trueskill.AdjustPlayers;

exports.calculateOverallSkill = function(skill) {
    return (skill[0] - (3 * skill[1]));
};

exports.calculateScore = function(terms) {
    const keys = Object.keys(terms);
    return keys.reduce((n, k) => n + terms[k], 0) / keys.length;
};

exports.adjustPlayerSkillByScore = function(p1, p2) {
    // Player one score and model to adjust
    const p1score = p1.score;
    const p1model = p1.model;

    // Player two score and model to adjust
    const p2score = p2.score;
    const p2model = p2.model;


    // Player one wins
    if (p1score > p2score) {
        p1model.rank = 1;
        p2model.rank = 2;
    } else if (p1score < p2score) {
        // Player two wins
        p1model.rank = 2;
        p2model.rank = 1;
    } else {
        // Draw
        p1model.rank = 1;
        p2model.rank = 1;
    }

    incrementRatingCounts(p1model, p2model);

    p1model.overallSkill = exports.calculateOverallSkill(p1model.skill);
    p2model.overallSkill = exports.calculateOverallSkill(p2model.skill);
    // Calculate models new skill
    trueskill.AdjustPlayers([p1model, p2model]);
};

exports.adjustPlayerSkillByTerms = function(p1, p2, commonTerms) {
    // Player one terms and associated ratings
    const p1terms = p1.terms;
    const p1ratings = p1.ratings;

    // Competitor terms and associated ratings
    const p2terms = p2.terms;
    const p2ratings = p2.ratings;

    Array.from(p1terms).forEach(p1term => {
        // meh.. the term key
        const termKey = p1term.term;
        if (commonTerms.indexOf(termKey) !== -1) {

            // Player one's technical rating for the term
            const p1rating = parseFloat(p1ratings[termKey]) || 0;

            // Player two's technical rating for the term
            const p2rating = parseFloat(p2ratings[termKey]) || 0;

            // Player two's corresponding technical term
            const p2term = Array.from(p2terms).find(term => term.term === termKey);

            // Player one wins
            if (p1rating > p2rating) {
                p1term.rank = 1;
                p2term.rank = 2;
            } else if (p1rating < p2rating) {
                // Player two wins
                p1term.rank = 2;
                p2term.rank = 1;
            } else {
                // Draw
                p1term.rank = 1;
                p2term.rank = 1;
            }

            incrementRatingCounts(p1term, p2term);

            p1term.overallSkill = exports.calculateOverallSkill(p1term.skill);
            p2term.overallSkill = exports.calculateOverallSkill(p2term.skill);

            // Calculate terms new skill
            trueskill.AdjustPlayers([p1term, p2term]);
        }
    });
};
