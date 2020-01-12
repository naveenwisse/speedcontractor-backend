var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var inviteSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    inviteEmail: String,
    inviteSMS: String,
    business: {
        type: Schema.Types.ObjectId,
        ref: 'Business'
    },
    competition: {
        type: Schema.Types.ObjectId,
        ref: 'Competition'
    },
    competitor: String,
    inviteToken: String
});

module.exports = mongoose.model('Invite', inviteSchema);

