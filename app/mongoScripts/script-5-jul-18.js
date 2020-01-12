// Run this script with command: mongo plantedPeople script-5-jul-18.js
const positions = db.getCollection('positions').find({});
const terms = db.getCollection('terms').find({}).toArray();
const bulk = db.getCollection('positions').initializeUnorderedBulkOp();
let bulkWork = false;
positions.forEach(position => {
	let positionTerms = position.terms;
	let bulkInsert = false;
	terms.forEach(term => {
		if(!containTerm(position, term)) {
			bulkWork = true; // flag to execute bulk
			bulkInsert = true; // flag to insert operation to bulk
			positionTerms.push({
				model: term.term,
				questions: []
			});
		}
	});
	if (bulkInsert)
		bulk.find( { _id: position._id } ).update( { $set: { terms: positionTerms } } );
});
if (bulkWork)
	bulk.execute();


// Auxiliar functions

function containTerm(position, term) {
	let exist = false;
	position.terms.forEach(positionTerm => {
		if (positionTerm.model === term.term)
			exist = true;
	});
	return exist;
}