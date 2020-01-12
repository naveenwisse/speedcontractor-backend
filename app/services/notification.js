'use strict';

var nodemailer = require('nodemailer');
var mandrillTransport = require('nodemailer-mandrill-transport');
var consolidate = require('consolidate');
// Download the helper library from https://www.twilio.com/docs/node/install
// Your Account Sid and Auth Token from twilio.com/console
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM;

const twilio = require('twilio')(accountSid, authToken);
const { User } = require('pp/models');

var transport = nodemailer.createTransport(mandrillTransport({
  auth: {
    apiKey: 'qyWPKiR-JFh40H3U4m6O6A'
  }
}));

var notifyTypes = {
  test: 'TEST',
  acceptedResource: "ACCEPTED_RESOURCE",    //user has been accepted to a job/event
  acceptTastingHostBusiness: 'ACCEPT_TASTING_HOST_BUSINESS', // /acceptTasting
  acceptTastingManagerBusiness: 'ACCEPT_TASTING_MANAGER_BUSINESS', // /acceptTasting
  deleteTastingManagerBusiness: 'DELETE_TASTING_MANAGER_BUSINESS', // /deleteTasting
  deleteTastingHostBusiness: 'DELETE_TASTING_HOST_BUSINESS', // /deleteTasting
  addEventProduct: 'ADD_EVENT_PRODUCT', // /addEventProducts
  addCompetingEmployee: 'ADD_COMPETING_EMPLOYEE', // /addCompetingEmployees
  acceptCompetitionBusiness: 'ACCEPT_COMPETITION_BUSINESS', // /acceptCompetition
  declineCompetitionBusiness: 'DECLINE_COMPETITION_BUSINESS', // /declineCompetition
  addResourceUserAdded: 'ADD_RESOURCE_USER_ADDED', // /addResource
  addResourceUserRemoved: 'ADD_RESOURCE_USER_REMOVED', // /addResource
  addRatingUser: 'ADD_RATING_USER', // /addRating,
  addRatingBusiness: 'ADD_RATING_BUSINESS', // /addRating2Business
  attendTastingUser: 'ATTEND_TASTING_BUSINESS', // /attendTasting
  applyResourceBusiness: 'APPLY_RESOURCE_BUSINESS', // /applyResource
  updateAddressBusiness: 'UPDATE_ADDRESS_BUSINESS', // /updateAddress
  updateAddressUser: 'UPDATE_ADDRESS_USER', // /updateAddress
  editEventResource: 'EDIT_EVENT_RESOURCE', // /editEvent
  editResource: 'EDIT_RESOURCE', // /editResource
  deleteEventResource: 'DELETE_EVENT_RESOURCE', // /deleteEvent
  accountEnabled: 'NOTIFY_ACCOUNT_ENABLED', // /admin/suspend
  accountSuspended: 'NOTIFY_ACCOUNT_SUSPENDED', // /admin/suspend
};

exports.notifyTypes = notifyTypes;


/*
 * Main function to send notifications
 * If you want add more events to notify, then you must add a new notify type and
 * extend with new case in notify function with according implementation.
 */
exports.notify = function(type, params) {
  if (process.env.SENDING_EMAILS_ON === 'true') {
    switch(type) {
      case notifyTypes.test:
        notifyTest(params);
        break;

      case notifyTypes.acceptedResource:   //User has Accepted Job/Event successfully
        notifyAcceptedResource(params);
        break;

      case notifyTypes.acceptTastingHostBusiness:
        notifyAcceptTastingHostBusiness(params);
        break;
      case notifyTypes.acceptTastingManagerBusiness:
        notifyAcceptTastingManagerBusiness(params);
        break;
      case notifyTypes.deleteTastingHostBusiness:
        notifyDeleteTastingHostBusiness(params);
        break;
      case notifyTypes.addEventProduct:
        notifyAddEventProduct(params);
        break;
      case notifyTypes.deleteTastingManagerBusiness:
        notifyDeleteTastingManagerBusiness(params);
        break;
      case notifyTypes.addCompetingEmployee:
        notifyAddCompetingEmployee(params);
        break;
      case notifyTypes.acceptCompetitionBusiness:
        notifyAcceptCompetitionBusiness(params);
        break;
      case notifyTypes.declineCompetitionBusiness:
        notifyDeclineCompetitionBusiness(params);
        break;
      case notifyTypes.addResourceUserAdded:
        notifyAddResourceUserAdded(params);
        break;
      case notifyTypes.addResourceUserRemoved:
        notifyAddResourceUserRemoved(params);
        break;
      case notifyTypes.addRatingUser:
        notifyAddRatingUser(params);
        break;
      case notifyTypes.addRatingBusiness:
        notifyAddRatingBusiness(params);
        break;
      case notifyTypes.attendTastingUser:
        notifyAttendTastingUser(params);
        break;
      case notifyTypes.applyResourceBusiness:
        notifyApplyResourceBusiness(params);
        break;
      case notifyTypes.updateAddressBusiness:
        notifyUpdateAddressBusiness(params);
        break;
      case notifyTypes.updateAddressUser:
        notifyUpdateAddressUser(params);
        break;
      case notifyTypes.editEventResource:
        notifyEditEventResource(params);
        break;
      case notifyTypes.editResource:
        notifyEditResource(params);
        break;
      case notifyTypes.deleteEventResource:
        notifyDeleteEventResource(params);
        break;
      case notifyTypes.accountEnabled:
        notifyAccountEnabled(params);
        break;
      case notifyTypes.accountSuspended:
        notifyAccountSuspended(params);
        break;
      default:
        console.log('Sending Emails System: type not found.');
    }
  } else {
    console.log('Sending Emails System: off. To turn ON change value on env file.')
  }
}

var notifyAcceptedResource = function(params) {
  /*
   * params: {
   *  toUser: 'email@email.com'
   *  toBusiness: 'email@email.com'
   *  employee: 'Joe blow',
   *  position: 'Bartender',
   *  phone: '(xxx) xxx-xxxx0',
   *  email: 'email@email.com'
   * }
   */

  //Send To Business
  var paramsToUser = {
    to: params.toUser
  };

  params.to = params.toBusiness;

  sendEmail('notifyAcceptedResource2User.html', "Applicant Accepted successfully", paramsToUser);
  sendEmail('notifyAcceptedResource2Business.html', "Applicant Accepted successfully", params);

  sendSMS('notifyAcceptedResource2Business.html', params);

  //Send To User
  sendSMS('notifyAcceptedResource2User.html', paramsToUser);

}

var notifyDeleteEventResource = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   * }
   */
  sendEmail('notifyDeleteEventResource.html', 'Event canceled', params);
  sendSMS('notifyDeleteEventResource.html', params);
};

var notifyEditEventResource = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { comment: String }
   * }
   */
  sendEmail('notifyEditEventResource.html', 'Event modified', params);
  sendSMS('notifyEditEventResource.html', params);
};

var notifyEditResource = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { comment: String }
   * }
   */
  sendEmail('notifyEditResource.html', 'Resource modified', params);
  sendSMS('notifyEditResource.html', params);
};

var notifyUpdateAddressUser = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   * }
   */
  sendEmail('updateAddressUser.html', 'User venue updated', params);
  sendSMS('updateAddressUser.html', params);
};


var notifyUpdateAddressBusiness = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   * }
   */
  sendEmail('updateAddressBusiness.html', 'Business venue updated', params);
  sendSMS('updateAddressBusiness.html', params);
};

var notifyApplyResourceBusiness = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   * }
   */
  sendEmail('applyResourceBusiness.html', 'Your business have a new resource', params);
  sendSMS('applyResourceBusiness.html', params);
};

var notifyAttendTastingUser = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: {
   *    tastingTitle: 'string',
   *    tastingCode: 'string'
   *  }
   * }
   */
  sendEmail('attendTastingUser.html', 'Assistanse confirmed on tasting event', params);
  sendSMS('attendTastingUser.html', params);
};

var notifyAddRatingUser = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { businessName: 'string' }
   * }
   */
  sendEmail('addRatingUser.html', 'You have received a rating', params);
  sendSMS('addRatingUser.html', params);
};

var notifyAddRatingBusiness = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { userName: 'string' }
   * }
   */
  sendEmail('addRatingBusiness.html', 'You have received a review', params);
  sendSMS('addRatingBusiness.html', params);
};

var notifyAddResourceUserRemoved = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { eventTitle: 'string' }
   * }
   */
  sendEmail('addResourceUserRemoved.html', 'You have been removed from an event', params);
  sendSMS('addResourceUserRemoved.html', params);
};

var notifyAddResourceUserAdded = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { eventTitle: 'string' }
   * }
   */
  sendEmail('addResourceUserAdded.html', 'You have been added from an event', params);
  sendSMS('addResourceUserAdded.html', params);
};

var notifyDeclineCompetitionBusiness = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { competitionTitle: 'string' }
   * }
   */
  sendEmail('declineCompetitionBusiness.html', 'Your competition has been declined', params);
  sendSMS('declineCompetitionBusiness.html', params);
};

var notifyAcceptCompetitionBusiness = function(params) {
  /*
   * params: {
   *  to: 'email@email.com',
   *  htmlParams: { competitionTitle: 'string' }
   * }
   */
  sendEmail('acceptCompetitionBusiness.html', 'Your competition has been accepted', params);
  sendSMS('acceptCompetitionBusiness.html', params);
};

var notifyAddCompetingEmployee = function(params) {
  /*
   * params: {
   *  to: 'email@email.com'
   * }
   */
  sendEmail('addCompetingEmployee.html', 'You have a new competition', params);
  sendSMS('addCompetingEmployee.html', params);
};

var notifyDeleteTastingHostBusiness = function(params) {
  /*
   * params: {
   *  to: 'email@email.com'
   * }
   */
  sendEmail('deleteTastingHostBusiness.html', 'Tasting event removed', params);
  sendSMS('deleteTastingHostBusiness.html', params);
};

var notifyAddEventProduct = function(params) {
  /*
   * params: {
   *  to: 'email@email.com'
   * }
   */
  sendEmail('notifyAddEventProduct.html', 'Tasting product changed', params);
  sendSMS('notifyAddEventProduct.html', params);
};

var notifyDeleteTastingManagerBusiness = function(params) {
  /*
   * params: {
   *  htmlParams: { tastingTitle: 'string' },
   *  to: 'email@email.com'
   * }
   */
  sendEmail('deleteTastingManagerBusiness.html', 'Tasting event removed', params);
  sendSMS('deleteTastingManagerBusiness.html', params);
};

var notifyAcceptTastingHostBusiness = function(params) {
  /*
   * params: {
   *  htmlParams: { tastingTitle: 'string' },
   *  to: 'email@email.com'
   * }
   */
  sendEmail('acceptTastingHostBusiness.html', 'Tasting event accepted', params);
  sendSMS('acceptTastingHostBusiness.html', params);
};

var notifyAcceptTastingManagerBusiness = function(params) {
  /*
   * params: {
   *  htmlParams: { tastingTitle: 'string' },
   *  to: 'email@email.com'
   * }
   */
  sendEmail('acceptTastingManagerBusiness.html', 'Tasting event accepted', params);
  sendSMS('acceptTastingManagerBusiness.html', params);
};

var notifyAccountSuspended = function(params) {
  /*
   * params: {
   *  htmlParams: { reasons: 'string' },
   *  to: 'email@email.com'
   * }
   */
  sendEmail('accountSuspended.html', 'Account Suspended', params);
  sendSMS('accountSuspended.html', params);
};

var notifyAccountEnabled = function(params) {
  /*
   * params: {
   *  to: 'email@email.com'
   * }
   */
  sendEmail('accountEnabled.html', 'Account Enabled', params);
  sendSMS('accountEnabled.html', params);
};

var notifyTest = function(params) {
  /*
   * params: {
   *  htmlParams: { name: 'string' },
   *  to: 'email@email.com'
   * } shelter
   */
  sendEmail('test.html', 'TEST SUBJECT', params);
  sendSMS('test.html', params);
};

var sendEmail = function(template, subject, params) {
  /*
   * params: {
   *  to: 'email@email.com'  ---> required!
   * }
   */
  consolidate.swig('app/views/templates/' + template, {
    params: params.htmlParams,
  }, function(err, html) {
    if (err) {
      console.log(err);
    }
    var mailOptions = {
      to: params.to,
      from: 'do-not-reply@speedcontractor.com',
      subject: subject,
      html: html
    };
    transport.sendMail(mailOptions, function(err) {
      if(!err)
        console.log('Message sent! to: ' + mailOptions.to + ' - ' + mailOptions.subject);
      else
        console.log(err);
    });
  });
};
// var sendEmail_cb = function(template, subject, params, cb) {
//   /*
//    * params: {
//    *  to: 'email@email.com'  ---> required!
//    * }
//    */
//   consolidate.swig('app/views/templates/' + template, {
//     params: params.htmlParams,
//   }, function(err, html) {
//     if (err) {
//       console.log(err);
//     }
//     var mailOptions = {
//       to: params.to,
//       from: 'do-not-reply@speedcontractor.com',
//       subject: subject,
//       html: html
//     };
//     console.log("Mail to : " + mailOptions.to);
//     transport.sendMail(mailOptions, function(err) {
//       if(!err)
//         console.log('Message sent! to: ' + mailOptions.to + ' - ' + mailOptions.subject);
//       else
//         console.log(err);
//       cb();
//     });
//   });
// };

var sendSMS = function(template, params) {
  User.findOne({ email: params.to }, (err, user) => {
    if (!err && user && user.mobilePhone) {
      consolidate.swig('app/views/templatesSMS/' + template, {
        params: params.htmlParams,
      }, function(err, html) {
        if (err) {
          console.log(err);
        }
        twilio.messages
        .create({
           body: html,
           from: fromNumber,
           to: user.mobilePhone
         })
        .then(message => console.log(message.sid))
        .catch(err => console.log(err));
      });
    } else {
      console.log('No mobile phone registered');
    }
  });
}