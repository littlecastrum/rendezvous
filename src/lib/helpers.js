/*
 * Helpers for various tasks
 *
 */

// Dependencies
const crypto = require('crypto');
const config = require('../config');

function acceptedHTTPMethod(method) {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  return acceptableMethods.includes(method)
}

function createRandomStr(strLength) {
  if (typeof(strLength) === 'number' && strLength > 0) {
    const possibleChars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array(strLength).fill(null, 0, strLength).map((char) => {
      return possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
    }).join('');
  }
  return false
};

function hash(str) {
  if (typeof(str) === 'string' && str.length > 0) {
    return crypto
      .createHmac('sha256', config.hashingSecret)
      .update(str)
      .digest('hex');
  } else {
    return false
  }
};

function isString(val) {
  return typeof(val) === 'string';
};

function isBoolean(val) {
  return typeof(val) === 'boolean';
};

function parseJsonToObject(str) {
  try {
    return JSON.parse(str);
  } catch(err) {
    return {};
  }
};

function promisify(fn) {
  return (...args) => new Promise((resolve, reject) => {
    fn.call(this, ...args, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

function to(promise) {
  return promise
    .then(response => ({ response, error: null }))
    .catch(error => ({ error, data: null }));
}

function serverMessage(data) {
  return `\nINCOMING REQUEST\nMethod: ${data.method}\nQuery: ${JSON.stringify(data.query)}\nPath: ${data.trimmedPath}\nBody: ${JSON.stringify(data.payload)}`
}

function verifyPayload(payload, strLength=null) {
  if (isString(payload)) {
    if (strLength) {
      return payload.trim().length === strLength ? payload.trim() : false;
    } else {
      return payload.trim().length > 0 ? payload.trim() : false;
    }
  }
  return false;
}

function verifyPhonePayload(payload) {
  return isString(payload) && payload.trim().length === 10
    ? payload.trim()
    : false;
}

module.exports = {
  acceptedHTTPMethod,
  createRandomStr,
  hash,
  isString,
  isBoolean,
  parseJsonToObject,
  promisify,
  to,
  serverMessage,
  verifyPayload,
  verifyPhonePayload
}