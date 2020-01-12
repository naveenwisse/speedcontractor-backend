// Run this script with command: mongo plantedPeople script-4-jun-18.js
const positions = db.getCollection('positions').find({});
const bulkP = db.getCollection('positions').initializeUnorderedBulkOp();
positions.forEach(position => {
  bulkP.find( { _id: position._id } ).update( { $set: { status: 'active' } } );
});
bulkP.execute();