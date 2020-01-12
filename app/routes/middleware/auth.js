'use strict';

const jwt = require('jsonwebtoken');
const copyTokenSkipKeys = new Set(['iat', 'exp']);

function copyToken(token) {
    const newToken = {};
    for (const key in token) {
        if (!copyTokenSkipKeys.has(key)) {
            newToken[key] = token[key];
        }
    }
    return newToken;
}

function tryVerifyToken(req, cb) {
    var token = req.headers['x-access-token'];
    if (token) {
        jwt.verify(token, process.env.SECRET, function(err, decoded) {
            cb(err, false, decoded);
        });
    } else {
        cb(null, true);
    }
}

function tryRefreshToken(res, token) {
    if (token) {
        const newToken = copyToken(token);
        res.set('x-access-token', jwt.sign(newToken, process.env.SECRET, {
            expiresIn: 3600 // expires in 1 hour
        }));
    }
}

exports.authRequired = function(req, res, next) {
    tryVerifyToken(req, function(err, noToken, decoded) {
        if (err) {
            res.status(401).send({
                success: false,
                message: 'Failed to verify authentication token'
            });
        } else if (noToken) {
            res.status(401).send({
                success: false,
                message: 'Authentication token required'
            });
        } else {
            // Still using the app, refresh the token
            tryRefreshToken(res, decoded);
            // Save to request for use in other routes
            req.decoded = decoded;
            // Short hand access
            req.authUserId = req.decoded._id;
            // Move along now
            next();
        }
    });
};

exports.authOptional = function(req, res, next) {
    tryVerifyToken(req, function(err, noToken, decoded) {
        if (err) {
            res.status(401).send({
                success: false,
                message: 'Failed to verify authentication token'
            });
        } else {
            // Still using the app, refresh the token
            tryRefreshToken(res, decoded);
            // Save to request for use in other routes
            req.decoded = decoded || {};
            // Short hand access
            req.authUserId = req.decoded._id;
            // Move along now
            next();
        }
    });
};
