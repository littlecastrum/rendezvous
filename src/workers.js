/*
 * Worker related tasks
 *
 */
// Dependencies
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const { jsondm, helpers } = require('./lib');
const {
  loopFn,
  to,
  verifyPayload,
  verifyPayloadWithOptions,
  verifyObjectArrayPayload,
  verifyTimeoutPayload,
  isNumber
} = helpers;

const MIN = 1000 * 60;

function performCheck(checkData) {
  const checkOutcome = {
    error: false,
    responseCode: false,
  };
  const outcomeSent = false;
};

function validateCheckData(checkData) {
  checkData = typeof(checkData) === 'object' && checkData !== null : {};
  checkData.id = verifyPayload(checkData.id, 20);
  checkData.userPhone = verifyPayload(checkData.userPhone, 10);
  checkData.protocol = verifyPayloadWithOptions(checkData.protocol, ['http', 'https']);
  checkData.url = verifyPayload(checkData.url);
  checkData.method = verifyPayloadWithOptions(checkData.method, ['post', 'get', 'put', 'delete']);
  checkData.successCodes = verifyObjectArrayPayload(checkData.successCodes);
  checkData.timeoutSeconds = verifyTimeoutPayload(checkData.timeoutSeconds);

  checkData.state = verifyPayloadWithOptions(checkData.state, ['up', 'down'], 'down');
  checkData.lastChecked = isNumber(checkData.lastChecked) && checkData.lastChecked > 0 
    ? checkData.lastChecked
    : false;

  const checksNeeded = Reflect.ownKeys(checkData).filter((key) => !['state', 'lastChecked'].includes(key));
  const allChecksPass = !checksNeeded.every((key) => checkData[key] !== false)
  if (allChecksPass) {
    performCheck(checkData);
  } else {
    console.log('Error: One of the checks is not properly formatted. Skipping it')
  }
};

async function gatherAllChecks() {
  const { error, response } = await to(jsondm.list('checks'));
  if (!error && response && response.length > 0) {
    response.forEach((check) => {
      const checkPromise = await to(jsondm.read('checks', checks));
      if (!checkPromise.error && checkPromise.response) {
        validateCheckData(checkPromise.response);
      } else {
        console.log(`Error: problems reading one of the check's data`)
      }
    })
  } else {
    console.log('Error: Could not find any checks to process')
  }
};

function init() {
  gatherAllChecks();
  loopFn(gatherAllChecks, MIN);
};

module.exports = {
  init
}