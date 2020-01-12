// Crazy awesome for app local require calls
// require('../../lib/symlink-app')();

exports.up = function(next) {
  // this
  //   .model('User')
  //   .find({})
  //   .exec(callback);
  // function callback(error, result) {

  //   if (error){
  //     console.error(error);
  //   }

  //   const defaultTerms = require('pp/models/defaults/terms').getDefaultData();

  //   // Assign the sanitization and category for current data;
  //   for (let i = result.length - 1; i >= 0; i--) {
  //     for (let j = result[i].terms.length - 1; j >= 0; j--) {
  //       const term = getTermByName(result[i].terms[j].term);
  //       if (term !== null) {
  //         result[i].terms[j]['sanitization'] = term.sanitization;
  //         result[i].terms[j]['category'] = term.category;
  //       }
  //     }
  //   }

  //   let total = result.length;

  //   saveAll(result); // recursive function to avoid async

  //   function saveAll(result) {
  //     const doc = result.pop();

  //     doc.save(function(err, saved){
  //       if (err) throw err;//handle error

  //       if (--total) saveAll(result);
  //       else {
  //         next();
  //       }
  //     })
  //   }

  //   function getTermByName(name) {
  //     for (var i = defaultTerms.length - 1; i >= 0; i--) {
  //       if (defaultTerms[i].term === name) {
  //         return defaultTerms[i];
  //       }
  //     }
  //     return null;
  //   }

  // }
  // TODO: this migration is complete
  next();
};

exports.down = function(next) {
  // TODO: not down for now for this migration
  next();
};
