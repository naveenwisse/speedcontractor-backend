'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const stripeAccountSchema = new Schema({

    createDate: {
        type: Date,
        default: Date.now
    },

    accountType: {
        type: String,
        required: true,
        enum: [
            'User',
            'Business'
        ]
    },

    accountCreator: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },

    accountHolder: {
        type: Schema.Types.ObjectId,
        refPath: 'accountType'
    },

    auth: {
        type: Schema.Types.Mixed,
        // Contains public and private keys
        select: false
        // {
        //     scope
        //     stripe_user_id
        //     stripe_publishable_key
        //     token_type
        //     refresh_token
        //     livemode
        //     access_token
        // }
    },

    // https://stripe.com/docs/api#account_object
    account: {
        id: String,
        transfers_enabled: Boolean,
        timezone: String,
        support_phone: String,
        support_email: String,
        statement_descriptor: String,
        email: String,
        display_name: String,
        details_submitted: Boolean,
        default_currency: String,
        country: String,
        charges_enabled: Boolean,
        business_url: String,
        business_name: String,
        business_logo: String,
    },

    // https://stripe.com/docs/api#card_object
    paymentMethod: {
        // ID of card
        id: String,
        // Card brand. Can be:
        // Visa, American Express, MasterCard, Discover, JCB, Diners Club, or Unknown.
        brand: String,
        // Last 4 digits of card number
        last4: String,
        // Card expiration month
        exp_month: Number,
        // Card expiration year
        exp_year: Number,
        // Card funding type.
        // Can be credit, debit, prepaid, or unknown
        funding: String,
        // Address fields
        address_city: String,
        address_country: String,
        address_line1: String,
        address_line2: String,
        address_state: String,
        address_zip: String,
        // Two-letter ISO code representing the country of the card.
        country: String,
        // If a CVC was provided, results of the check:
        // pass, fail, unavailable, or unchecked
        cvc_check: String,
        // Cardholder name ( probably gonna be an email )
        name: String
    },

    // https://stripe.com/docs/api#customer_object
    customerObject: {
        // ID of Customer
        id: String,
        // The currency the customer can be charged in.
        // For recurring billing purposes.
        currency: String,
        // ID of the default source attached to this customer.
        default_source: String,
        // Email for customer
        email: String,
        // `false` when in test mode, `true` otherwise
        livemode: Boolean
    }

});

stripeAccountSchema.index({
    accountType: 1,
    accountHolder: 1
}, {
    unique: true
});

module.exports = mongoose.model('StripeAccount', stripeAccountSchema);
