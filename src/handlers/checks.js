const fs = require('fs');
const { errors, jsondm } = require('../lib');
const {
  acceptedHTTPMethod,
  createRandomStr,
  hash,
  isString,
  isBoolean,
  to,
  serverMessage,
  verifyPayload,
  verifyPhonePayload
} = require('../lib').helpers;

const HOUR = 1000 * 60 * 60;

const _checks = {
  post: postFn,
  get: getFn,
  put: putFn,
  delete: deleteFn,
  verifyToken
}

module.exports = {
  checkHandler,
  _checks
};

function checkHandler(data) {
  return new Promise(async (resolve, reject) => {
    console.log(serverMessage(data));
    if (acceptedHTTPMethod(data.method)) {
      const payloadPromise = await to(_checks[data.method](data));
      if (!payloadPromise.error && payloadPromise.response) {
        resolve(payloadPromise.response)
      } else {
        reject(payloadPromise.error);
      }
    } else {
      reject({ statusCode: 405, payload: {} });
    }
  })
}


// Checks - POST
// Required params: protocol, url, method, sucessCodes, timeoutSeconds
// Optional params: none
function postFn(data) {
  return new Promise(async (resolve, reject) => {
    const phone =  verifyPhonePayload(data.payload.phone);
    const password =  verifyPayload(data.payload.password);
    if (phone && password) {
      const userPromise = await to(jsondm.read('users', phone));
      if (!userPromise.error && userPromise.response) {
        const hashedPassword = hash(password);
        if (userPromise.response.password === hashedPassword) {
          const tokenId = createRandomStr(20);
          const expires = Date.now() + HOUR;
          const tokenObject = { phone, id: tokenId, expires };
          const newTokenPromise = await to(jsondm.create('tokens', tokenId, tokenObject));
          if (!newTokenPromise.error) {
            resolve({ statusCode: 200, payload: tokenObject })
          } else {
            reject(errors.standard(500, 'Could not create the new token'));
          }
        } else {
          reject(errors.standard(400, 'Password did not match the user\'s password'));
        }
      } else {
        reject(errors.standard(400, 'Could not find the specified user'));
      }
    } else {
      const missingFields = Object.entries({password, phone})
        .filter(field => field[1] === false)
        .map(field => field[0])
      reject(errors.missingFieldsError(missingFields));
    }
  })
};

// Checks - GET
// Required params: id
// Optional params: none
function getFn(data) {
  return new Promise(async (resolve, reject) => {
    const id = verifyPayload(data.query.id, 20);
    if (id) {
      const tokenPromise = await to(jsondm.read('tokens', id));
      if (!tokenPromise.error && tokenPromise.response) {
        resolve({ statusCode: 200, payload: tokenPromise.response })
      } else {
        reject(errors.notFound(tokenPromise.error));
      }
    } else {
      reject(errors.missingFieldsError(['id']));
    }
  })
};

// Checks - PUT
// Required params: id, extend
// Optional params: none
function putFn(data) {
  return new Promise(async (resolve, reject) => {
    const id = verifyPayload(data.payload.id, 20);
    const extend =  isBoolean(data.payload.extend) && data.payload.extend;
    if (id && extend) {
      const tokenPromise = await to(jsondm.read('tokens', id));
      if (!tokenPromise.error && tokenPromise.response) {
        if (tokenPromise.response.expires > Date.now()) {
          const extendedTokenObject = { ...tokenPromise.response, expires: Date.now() + HOUR };
          const { error } = await to(jsondm.update('tokens', id, extendedTokenObject));
          if (!error) {
            resolve({ statusCode: 200, payload: extendedTokenObject })
          } else {
            reject(errors.standard(500, 'Could not update the token\'s expiration, something went wrong'));
          }
        } else {
          reject(errors.standard(400, 'The requested token has already expired'));
        }
      } else {
        reject(errors.standard(400, 'The requested token does not exists'));
      }
    } else {
      const missingFields = Object.entries({id, extend})
        .filter(field => field[1] === false)
        .map(field => field[0])
      reject(errors.missingFieldsError(missingFields));
    }
  })
};

// Checks - DELETE
// Required params: id
// Optional params: none
function deleteFn(data) {
  return new Promise(async (resolve, reject) => {
    const id = verifyPayload(data.query.id, 20);
    if (id) {
      const tokenPromise = await to(jsondm.read('tokens', id));
      if (!tokenPromise.error && tokenPromise.response) {
        const { error } = await to(jsondm.remove('tokens', id))
        if (!error) {
          resolve({ statusCode: 200, payload: {} })
        } else {
          reject(errors.standard(500, 'Could not delete the token, something went wrong'));
        }
      } else {
        reject(errors.standard(400, 'The requested token does not exists'));
      }
    } else {
      reject(errors.missingFieldsError(['id']));
    }
  })
};