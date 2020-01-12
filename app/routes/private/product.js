'use strict';

const crypto = require('crypto');
const uuid = require('uuid');
const express = require('express');
const moment = require('moment');
const productService = require('pp/services/product');
const aws = require('pp/config/aws');
const validateMiddleware = require('pp/routes/middleware/validate');
const validateBody = validateMiddleware.body;

const router = module.exports = express.Router();

/**
 * @api {post} /api/addProduct
 * @apiDescription Create a product
 * @apiParam {MongoId} business
 * @apiParam {string} description
 * @apiParam {string} name
 * @apiParam {string} type
 */
router.post('/addProduct', validateBody({
    business: {
        isMongoId: true
    },
    description: {
        notEmpty: true
    },
    name: {
        notEmpty: true
    },
    type: {
        notEmpty: true
    }
}), function(req, res) {
    productService.addProduct(req, function(err, product) {
        if (!product) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to add a product.'
            });
        }

        console.log('Product added successfully');
        res.json({
            success: true,
            message: 'Product added successfully',
            productId: product._id
        });

    });
});

/**
 * @api {post} /api/productImageUpload
 * @apiDescription Upload product media
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} productId
 * @apiParam {String} type
 */
router.post('/productImageUpload', validateBody({
    businessId: {
        isMongoId: true
    },
    productId: {
        isMongoId: true
    },
    type: {
        notEmpty: true
    }
}), function(req, res) {
    var s3Url = 'https://' + aws.productBucket + '.s3.amazonaws.com',
        fileName = uuid.v1() + '.png',
        s3Policy = {
            'expiration': moment().add(5, 'm').toDate(),
            'conditions': [{
                    'bucket': aws.productBucket
                },
                ['starts-with', '$key', fileName], {
                    'acl': 'private'
                }, {
                    'success_action_status': '201'
                },
                ['starts-with', '$Content-Type', req.body.type],
                ['content-length-range', 0, 524288000], //min and max
            ]
        },
        stringPolicy = JSON.stringify(s3Policy),
        base64Policy = new Buffer(stringPolicy, 'utf-8').toString('base64'),
        signature = crypto.createHmac('sha1', aws.secret)
        .update(new Buffer(base64Policy, 'utf-8')).digest('base64'),
        credentials = {
            url: s3Url,
            fields: {
                key: fileName,
                AWSAccessKeyId: aws.key,
                acl: 'private',
                policy: base64Policy,
                signature: signature,
                'Content-Type': req.body.type,
                success_action_status: 201
            }
        };

    req.body.bucket = aws.productBucket;
    req.body.filename = fileName;
    productService.updateProductImage(req, function(err, image) {
        if (!image) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'Unable to find that product in the database'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to upload the photo.'
            });
        }

        console.log('product photo updated successfully');
        res.json({
            credentials: credentials,
            image: image
        });

    });
});

/**
 * @api {post} /api/deleteProduct
 * @apiDescription Delete a competition
 * @apiParam {MongoId} businessId
 * @apiParam {MongoId} competitionId
 */
router.post('/removeProduct', validateBody({
    businessId: {
        isMongoId: true
    },
    productId: {
        isMongoId: true
    }
}), function(req, res) {
    productService.removeProduct(req, res, function(err, business) {
        if (!business) {
            console.log(err);
            return res.status(400).send({
                success: false,
                message: 'No business found.'
            });
        }
        if (err) {
            console.log(err);
            return res.status(500).send({
                success: false,
                message: 'An error occured while attempting to get business.'
            });
        }

        console.log('Business retrieved successfully');
        res.json({
            success: true,
            message: 'Business retrieved successfully'
        });

    });
});
