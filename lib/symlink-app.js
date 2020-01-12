'use strict';

const fs = require('fs');

module.exports = function() {
    try {
        fs.lstatSync(`${process.cwd()}/node_modules/pp`);
    } catch (err) {
        fs.symlinkSync('../app', './node_modules/pp', process.env.ON_LOCALHOST==='true' ? 'junction':'dir');
    }
};
