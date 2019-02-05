const querystring = require('querystring');
const https = require('https');
const config = require('../config');
const { verifyPayload, verifyMessage } = require('./helpers');

function sendTwilioSms(phone, msg) {
  return new Promise(async (resolve, reject) => {
    phone = verifyPayload(phone, 10);
    msg = verifyMessage(msg);
    if (phone && msg) {
      const payload = {
        From: config.twilio.fromPhone,
        To: `+1${phone}`,
        Body: msg
      };
      const stringPayload = querystring.stringify(payload);
      const requestDetails = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/Accounts/${config.twilio.accontSid}/Messages.json`,
        auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(stringPayload)
        }
      };
      const req = https.request(requestDetails, ({ statusCode, statusMessage }) => {
        statusCode === 200 || statusCode === 201
          ? resolve(false)
          : reject(`${statusCode} ${statusMessage}`)
      });
      req.on('error', (error) => reject(error));
      req.write(stringPayload);
      req.end();
    } else {
      reject('Giving parameters were missing or invalid');
    }
  })
}

module.exports = {
  sendTwilioSms
}