'use strict';

// get environment variables from .env
require('dotenv').config({
    silent: true
});

// Crazy awesome for app local require calls
require('./lib/symlink-app')();

// Notify on console if is not production enviroment
if (process.env.ON_PRODUCTION === 'false') {
    console.log('WARNING: this is development environment, check .env file.');
}

if (process.env.NEW_RELIC_LICENSE_KEY) {
    if(process.env.ON_LOCALHOST === false)
        require('newrelic');
}

var express = require('express'),
    morgan = require('morgan'),
    ssl = require('express-ssl'),
    cors = require('cors'),
    bodyParser = require('body-parser'),
    compression = require('compression'),
    validator = require('express-validator'),
    mongoose = require('mongoose'),
    helmet = require('helmet'),
    Raven = require('raven');

// Boom
const app = express();
// Must configure Raven before doing anything else with it
Raven.config('https://3a7360458227400586aa1ad81598f69e:fb3ae8c496124246b4115ae33da3163f@sentry.io/235511').install();

///////////////
// API Config
///////////////

// TODO: determine whether or not this
// conflicts with express-ssl's default setting
// for 'trust proxy'
// https://github.com/jclem/express-ssl
// https://github.com/jclem/express-ssl/blob/master/index.js#L22-L24
// default is `false`
app.enable('trust proxy');

// Disable etags until we decide whether or not
// we want to use them. Don't waste that CPU time
app.disable('etag');

// The request handler must be the first middleware on the app
app.use(Raven.requestHandler());
// The error handler must be before any other error middleware
app.use(Raven.errorHandler());

// Logger
app.use(morgan('dev'));

// Require SSL
app.use(ssl({
    disallow: function(req, res) {
        return res.status(403).send({
            message: 'This endpoint can only be called with via https'
        });
    }
}));

// Security headers
app.use(helmet());

// Allow cross site resource sharing with these trusted URLs
const whitelist = new Set([
    'https://www.speedcontractor.com',
    'https://stage.speedcontractor.com',
    'http://www.speedcontractor.com',
    'http://www.speedcontractor.com:9009',
    'http://localhost:9009',
    'http://localhost',
    `${process.env.CLIENT_SERVER}`
]);

// Enable CORS
app.use(cors({
    // Some legacy browsers (IE11, various SmartTVs) choke on 204
    optionsSuccessStatus: 200,
    // Let the access token be read
    exposedHeaders: 'x-access-token',
    origin: function(origin, callback) {
        callback(null, whitelist.has(origin));
    }
}));

// Compression ftw
app.use(compression());

// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// Parse application/json
app.use(bodyParser.json());

// Use validator (boss)
app.use(validator({
    customValidators: {
        isArray: function(value) {
            return Array.isArray(value);
        },
        isRating: function(value) {
            return (value >= 1 && value <= 10);
        },
        isTerms: function(list) {
            for (var key in list) {
                var term = list[key];
                if (term < 1 || term > 10) return false;
            }
            return true;
        },
        isPassword: function(password) {
            const passRe = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d$@!%*#?&-_]{4,14}$/;
            return password && passRe.test(password);
        }
    }
}));

////////////
// ROUTES
////////////

require('pp/routes')(app);

// Default error handling
// note: `next` is unused but required, as this middleware
// is recongnized as a * error handler based on the number of
// arguments the function expects ( in this case, 4 )
// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        error: err.message
    });
});

////////////////////
// Mongo & Server
////////////////////

// Set mongoose Promise implementation
// http://mongoosejs.com/docs/promises.html
mongoose.Promise = require('q').Promise;

// Connect to mongo
mongoose.connect(process.env.MONGODB_URI);

// Log mongo connection error, abort starting up server
mongoose
    .connection
    .once('error', function(err) {
        console.error('mongodb connection error:', err);
    });

// Start app when mongo connection is opened
mongoose
    .connection
    .once('open', function() {
        console.info('Successfully connected to mongodb');
        const port = process.env.PORT || 8080;
        app.listen(port, function() {
            console.log('Express API is listening on port: %s', port);
        });
    });
