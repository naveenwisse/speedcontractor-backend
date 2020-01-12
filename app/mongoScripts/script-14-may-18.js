// Run this script with command: mongo plantedPeople script-14-may-18.js
const users = db.getCollection('users').find({});
const bulk = db.getCollection('users').initializeUnorderedBulkOp();
users.forEach(user => {
  bulk.find( { _id: user._id } ).update( { $set: { status: 'active' } } );
});
bulk.execute();

const businesses = db.getCollection('businesses').find({});
const bulkB = db.getCollection('businesses').initializeUnorderedBulkOp();
businesses.forEach(bussiness => {
  bulkB.find( { _id: bussiness._id } ).update( { $set: { status: 'active' } } );
});
bulkB.execute();