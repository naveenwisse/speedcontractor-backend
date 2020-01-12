'use strict';

const { User, Business, Position, Term } = require('pp/models');
const notificationService = require('pp/services/notification');

const getDefaultTerms = function(next) {
    Term.find({}, (err, terms) =>{
        if (err) next(err, null);
        else next(null, terms);
    });
};

const updateUsersOnAdd = function(term) {
	User.find({}, (err, users) => {
		if (err || users.length === 0) {
			console.log('Err on update users on add', err);
			console.log('Length, ', users.length);
			return;
		}
		else {
			const bulk = User.collection.initializeOrderedBulkOp();
			let i = users.length - 1;
			for (; i >= 0; i--) {
				const update = {
					$push: { terms: term }
				};
				bulk.find({ _id: users[i]._id }).updateOne(update);
			}
			if (users.length > 0) {
				bulk.execute((err) => {
					if (err)
						console.log('ERR on update users on add', err);
					else
						console.log('OK update users on add');
					return;
				});
			}
		}
	});
};

const updatePositionsOnAdd = function(term) {
	Position.find({}, (err, positions) => {
		if (err || positions.length === 0) {
			console.log('Err on update positions on add', err);
			console.log('Length, ', positions.length);
			return;
		}
		else {
			const bulk = Position.collection.initializeOrderedBulkOp();
			let i = positions.length - 1;
			for (; i >= 0; i--) {
				const update = {
					$push: {
						terms: {
							model: term.term,
							questions: []
						}
					}
				};
				bulk.find({ _id: positions[i]._id }).updateOne(update);
			}
			if (positions.length > 0) {
				bulk.execute((err) => {
					if (err)
						console.log('ERR on update positions on add', err);
					else
						console.log('OK update positions on add');
					return;
				});
			}
		}
	});
};

const updateUsersOnRemove = function(term) {
	User.find({}, (err, users) => {
		if (err || users.length === 0) {
			console.log('Err on update users on remove', err);
			console.log('Length, ', users.length);
			return;
		}
		else {
			const bulk = User.collection.initializeOrderedBulkOp();
			let i = users.length - 1;
			for (; i >= 0; i--) {
				const oldTerms = users[i].terms;
				const newTerms = oldTerms.filter((t) => {
					return t.term !== term;
				});

				const update = {
					$set: { terms: newTerms }
				};
				bulk.find({ _id: users[i]._id }).updateOne(update);
			}
			if (users.length > 0) {
				bulk.execute((err) => {
					if (err)
						console.log('ERR on update users on remove', err);
					else
						console.log('OK update users on remove');
					return;
				});
			}
		}
	});
};

const updatePositionsOnRemove = function(term) {
	Position.find({}, (err, positions) => {
		if (err || positions.length === 0) {
			console.log('Err on update positions on remove', err);
			console.log('Length, ', positions.length);
			return;
		}
		else {
			const bulk = Position.collection.initializeOrderedBulkOp();
			let i = positions.length - 1;
			for (; i >= 0; i--) {
				const oldTerms = positions[i].terms;
				const newTerms = oldTerms.filter((t) => {
					return t.model !== term;
				});

				const update = {
					$set: { terms: newTerms }
				};
				bulk.find({ _id: positions[i]._id }).updateOne(update);
			}
			if (positions.length > 0) {
				bulk.execute((err) => {
					if (err)
						console.log('ERR on update positions on remove', err);
					else
						console.log('OK update positions on remove');
					return;
				});
			}
		}
	});
};

const updateUsersOnUpdate = function(term) {
	User.find({}, (err, users) => {
		if (err || users.length === 0) {
			console.log('Err on update users on remove', err);
			console.log('Length, ', users.length);
			return;
		}
		else {
			const bulk = User.collection.initializeOrderedBulkOp();
			let i = users.length - 1;
			for (; i >= 0; i--) {
				const terms = users[i].terms;
				let j = terms.length - 1;
				// Update term
				for (; j >= 0; j--) {
					if (terms[j].term === term.term) {
						terms[j].sanitization = term.sanitization;
						terms[j].category = term.category;
					}
				}

				const update = {
					$set: { terms: terms }
				};
				bulk.find({ _id: users[i]._id }).updateOne(update);
			}
			if (users.length > 0) {
				bulk.execute((err) => {
					if (err)
						console.log('ERR on update users on remove', err);
					else
						console.log('OK update users on remove');
					return;
				});
			}
		}
	});
};

/*
const updatePositionsOnUpdate = function(term) {
	Position.find({}, (err, positions) => {
		if (err || positions.length === 0) {
			console.log('Err on update positions on remove', err);
			console.log('Length, ', positions.length);
			return;
		}
		else {
			const bulk = Position.collection.initializeOrderedBulkOp();
			let i = positions.length - 1;
			for (; i >= 0; i--) {
				const terms = users[i].terms;
				let j = terms.length - 1;
				// Update term
				for (; i >= 0; i--) {
					if (terms[j].model === term.term) {
						terms[j].sanitization = term.sanitization;
						terms[j].category = term.category;
					}
				}

				const update = {
					$set: { terms: terms }
				};
				bulk.find({ _id: positions[i]._id }).updateOne(update);
			}
			if (positions.length > 0) {
				bulk.execute((err) => {
					if (err)
						console.log('ERR on update positions on remove', err);
					else
						console.log('OK update positions on remove');
					return;
				});
			}
		}
	});
};
*/

exports.getAllUsers = function(filter, next) {
	const query = {};
	if (filter.containString)
		query.name = { $regex: '*.' + filter.containString + '.*' };
	User.find(query)
	.limit(filter.limit)
	.skip(filter.limit * filter.page)
	.exec((err, users) => {
		if (err)
			next('Users err', users);
		else {
			User.count((err, count) => {
				if (err)
					next('Users err', users);
				else
					next(err, { users, count });
			});
		}
	});
}
exports.getAllBusinesses = function(filter, next) {
	const query = {};
	if (filter.containString)
		query.name = { $regex: '*.' + filter.containString + '.*' };
	Business.find(query)
	.limit(filter.limit)
	.skip(filter.limit * filter.page)
	.exec((err, businesses) => {
		if (err)
			next('businesses err', businesses);
		else {
			Business.count((err, count) => {
				if (err)
					next('businesses err', businesses);
				else
					next(err, { businesses, count });
			});
		}
	});
}
exports.suspendUser = function(info, next) {
	function notifyUser(user){
		if (user.status === 'suspended'){
			const params = {
				to: user.email,
				htmlParams: { reasons: info.reasons },
			};
			notificationService.notify(notificationService.notifyTypes.accountSuspended, params);
		} else {
			const params = {
				to: user.email,
			};
			notificationService.notify(notificationService.notifyTypes.accountEnabled, params);
		}
	}

	const query = { _id: info.userId };
	const update = info.suspend ? { $set: { status: 'suspended' } } : { $set: { status: 'active' } };
	User.findOneAndUpdate(query, update, { new: true })
	.exec((err, user) => {
		notifyUser(user);
		if (err)
			next('User err', err);
		else {
			const bulk = Business.collection.initializeOrderedBulkOp();
			let i = user.businesses.length - 1;
			for (; i >= 0; i--) {
				const queryBussines = { _id: user.businesses[i] };
				bulk.find(queryBussines).updateOne(update);
			}
			if (user.businesses.length > 0) {
				bulk.execute((err) => {
					if (err)
						next('User err', err);
					else
						next(err, user);
				});
			} else {
				next(err, user);
			}
		}
	});
}
exports.suspendBusinesses = function(info, next) {
	function notifyUser(businesses){
		if (businesses.status === 'suspended'){
			const params = {
				to: businesses.email,
				htmlParams: { reasons: info.reasons },
			};
			notificationService.notify(notificationService.notifyTypes.accountSuspended, params);
		} else {
			const params = {
				to: businesses.email,
			};
			notificationService.notify(notificationService.notifyTypes.accountEnabled, params);
		}
	}

	const query = { _id: info.businessesId };
	const update = info.suspend ? { $set: { status: 'suspended' } } : { $set: { status: 'active' } };
	Business.findOneAndUpdate(query, update, { new: true })
	.exec((err, businesses) => {
		notifyUser(businesses);
		if (err)
			next('Business err', err);
		else {
		
			next(err, businesses);
			
		}
	});
}

exports.getAllPositions = function(next) {
	const query = {};
	Position.find(query)
	.exec((err, positions) => {
		if (err)
			next('Positions err', positions);
		else {
			next(err, positions);
		}
	});
}

exports.getPosition = function(id, next) {
	const query = { _id: id };
	Position.findOne(query)
	.exec((err, position) => {
		if (err)
			next('Position err', position);
		else {
			next(err, position);
		}
	});
}

exports.updatePosition = function(position, next) {
	const query = { _id: position._id };
	Position.findOneAndUpdate(query, position,{ new: true })
	.exec((err, position) => {
		if (err)
			next('Position err', position);
		else {
			next(err, position);
		}
	});
}

exports.createPosition = function(name, next) {
	getDefaultTerms((err, defaultTerms) => {
		if (err) next(err);
		else {
			const terms = defaultTerms.map((t) => {
				return { model: t.term, questions: [] };
			});
			const position = new Position({
				name,
				terms,
				questions: []
			});
			position.save((err) => {
				next(err, position);
			});
		}
	});
}

exports.switchStatusPosition = function(info, next) {
	const query = { _id: info.id };
	const update = info.status === 'active' ? { $set: { status: 'hide' } } : { $set: { status: 'active' } };
	Position.findOneAndUpdate(query, update, { new: true })
	.exec((err, position) => {
		if (err)
			next('Position err', err);
		else
			next(null, position);
	});
}

exports.getAllTerms = function(next) {
	getDefaultTerms((err, terms) => {
		if (err) next(err);
		else {
			next(null, terms);
		}
	});
}

exports.createTerm = function(info, next) {
	function getTermName(name) {
		const str = name;
		return str.match(/[a-zA-Z]+/g).join('');
	}

	const termName = getTermName(info.term);
	const term = new Term({
		term: termName,
		sanitization: info.term,
		category: info.category
	});
	term.save((err) => {
		if(!err) {
			updateUsersOnAdd(term);
			updatePositionsOnAdd(term);
		}
		next(err, term);
	});
}

exports.removeTerm = function(info, next) {
	const id = info.id;
	const term = info.term;
	Term.findByIdAndRemove(id, function(err, termRemoved) {
    if (termRemoved && !err) {
			updateUsersOnRemove(term);
			updatePositionsOnRemove(term);
      next(null, termRemoved);
    } else {
			next('Term not found.', termRemoved);
    }
	});
}

exports.getTerm = function(id, next) {
	const query = { _id: id };
	Term.findOne(query)
	.exec((err, term) => {
		if (err)
			next('Term err', term);
		else {
			next(err, term);
		}
	});
}

exports.updateTerm = function(term, next) {
	const query = { _id: term._id };
	Term.findOneAndUpdate(query, term,{ new: true })
	.exec((err, term) => {
		if (err)
			next('Term err', term);
		else {
			updateUsersOnUpdate(term);
			// updatePositionsOnUpdate(term);
			next(err, term);
		}
	});
}