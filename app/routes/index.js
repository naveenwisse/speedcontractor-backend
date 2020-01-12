'use strict';

module.exports = function routes(app) {
    app.use(require('pp/routes/public-routes'));
    app.use(require('pp/routes/public'));
    app.use(require('pp/routes/private'));
    app.use(require('pp/routes/admin'));
};
