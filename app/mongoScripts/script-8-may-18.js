// Run this script with command: mongo plantedPeople script-8-may-18.js
const users = db.getCollection('users').find({});
const bulk = db.getCollection('users').initializeUnorderedBulkOp();
users.forEach(user => {
  bulk.find( { _id: user._id } ).update( { $set: { roles: ['user'] } } );
});
bulk.execute();