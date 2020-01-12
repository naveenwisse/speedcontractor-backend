'use strict';

const {
    Business,
    Product
} = require('pp/models');

exports.addProduct = function(req, next) {
    var newProduct = new Product(req.body);

    Business.findOne({
        _id: req.body.business,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, function(err, business) {
        if (business) {
            business.products.push(newProduct._id);
            business.save(function() {
                newProduct.save(function(err, product) {
                    next(err, product);
                });
            });
        } else {
            next('Business not found.', req.body.business);
        }
    });
};

exports.updateProductImage = function(req, next) {
    Business.findOne({
            _id: req.body.businessId,
            usersAdmin: {
                $eq: req.authUserId
            }
        })
        .exec(function(err, business) {
            if (business && !err) {
                var image = {
                    filename: req.body.filename,
                    path: 'https://s3-us-west-2.amazonaws.com/' + req.body.bucket + '/' + req.body.filename
                };
                Product.findOneAndUpdate({
                    _id: req.body.productId,
                    business: req.body.businessId
                }, {
                    $set: {
                        image: image
                    }
                }, {
                    new: true
                }, function(err, product) {
                    if (product && !err) {
                        next(err, image);
                    } else {
                        next(err, product);
                    }
                });
            } else {
                next(err, business);
            }
        });
};

exports.removeProduct = function(req, res, next) {
    Business.findOneAndUpdate({
        _id: req.body.businessId,
        usersAdmin: {
            $eq: req.authUserId
        }
    }, {
        $pull: {
            products: req.body.productId
        }
    }, function(err, business) {
        if (business && !err) {
            Product.findByIdAndRemove(req.body.productId, function(err, product) {
                if (product && !err) {
                    next(null, business);
                } else {
                    next('Product not found.', product);
                }
            });
        } else {
            next('Business not found.', business);
        }
    });
};
