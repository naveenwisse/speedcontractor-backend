var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var positionSchema = new Schema({
    name: String,
    questions: [{
        question: String,
        answers: [ String ],
    }],
    terms: [{
        model: String,
        questions: [ Number ]
    }],
    status: {
			type: String,
			default: 'hide' // 'active', 'removed?'
    }
});

module.exports = mongoose.model('Position', positionSchema);

