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

const _tokens = {}

// Users - GET
// Required params: phone, password
// Optional params: none
// @TODO Improve the error structure an messages
_tokens.post = function(data) {
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
          const tokenObject = {
            phone,
            id: tokenId,
            expires
          }
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

// Users - GET
// Required params: id
// Optional params: none
_tokens.get = function(data) {
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

// Users - PUT
// Required params: id, extend
// Optional params: none
_tokens.put = function(data) {
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
            console.log(error);
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

// Users - DELETE
// Required params: id
// Optional params: none
_tokens.delete = function(data) {
  return new Promise(async (resolve, reject) => {
    const id = verifyPayload(data.query.id, 20);
    if (id) {
      const tokenPromise = await to(jsondm.read('tokens', id));
      if (!tokenPromise.error && tokenPromise.response) {
        const { error } = await to(jsondm.remove('tokens', id))
        if (!error) {
          resolve({ statusCode: 200, payload: {} })
        } else {
          console.log(error);
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

function verifyToken(id, phone) {
  return new Promise(async (resolve, reject) => {
    const { error, response } = await to(_jsondm.read('tokens', id));
    if (!error && response) {
      if (response.phone === phone && response.expires > Date.now()) {
        resolve(true)
      } else {
        reject(false)
      }
    } else {
      reject(false)
    }
  })
};

module.exports = tokenHandler;

function tokenHandler(data) {
  return new Promise(async (resolve, reject) => {
    console.log(serverMessage(data));
    if (acceptedHTTPMethod(data.method)) {
      const payloadPromise = await to(_tokens[data.method](data));
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
