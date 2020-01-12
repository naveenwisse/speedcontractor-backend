// Run this script with command: mongo plantedPeople script-6-jul-18.js
const users = db.getCollection('users').find({});
const terms = db.getCollection('terms').find({});
const bulk = db.getCollection('users').initializeUnorderedBulkOp();
let bulkWork = false;
users.forEach(user => {
	const userTerms = user.terms;
	let bulkInsert = false;
	terms.forEach(term => {
		if(!containTerm(user, term)) {
			bulkWork = true; // flag to execute bulk
			bulkInsert = true; // flag to insert operation to bulk
			userTerms.push(term);
		}
	});
	if (bulkInsert)
		bulk.find( { _id: user._id } ).update( { $set: { terms: userTerms } } );
});
if (bulkWork)
	bulk.execute();


// Auxiliar functions

function containTerm(user, term) {
	let exist = false;
	user.terms.forEach(userTerm => {
		if (userTerm.term === term.term)
			exist = true;
	});
	return exist;
}