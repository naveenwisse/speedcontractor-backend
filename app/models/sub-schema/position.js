var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var positionSchema = new Schema({
    title: String,
    from: String,
    to: String,
    employer: String,
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    }
});

module.exports = positionSchema;
