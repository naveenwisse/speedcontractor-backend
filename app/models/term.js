var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var termSchema = new Schema({
    term: String,
    skill: {
      type: [ Number ],
      default: [25.0, 8.333333333333334],
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    sanitization: String,
    category: String,
    overallSkill: {
      type: Number,
      default: 0,
    },
});

module.exports = mongoose.model('Term', termSchema);

