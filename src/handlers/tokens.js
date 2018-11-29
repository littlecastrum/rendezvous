const fs = require('fs');
const { errors, jsondm } = require('../lib');
const { hash, to, isBoolean, isString, createRandomString } = require('../lib').helpers;

const HOUR = 1000 * 60 * 60;

const _tokens = {}

// Users - GET
// Required params: phone, password
// Optional params: none
// @TODO Improve the error structure an messages
_tokens.post = function(data) {
  return new Promise(async (resolve, reject) => {
    const password =  verifyPayload(data.payload.password);
    const phone =  verifyPhonePayload(data.payload.phone);
    console.log(phone)
    if (phone && password) {
      const userPromise = await to(jsondm.read('users', phone));
      if (!userPromise.error && userPromise.response) {
        const hashedPassword = hash(password);
        if (userPromise.response.hashedPassword === hashedPassword) {
          const tokenId = createRandomString(20);
          const expires = Date.now() + HOUR;
          const tokenObject = {
            phone,
            id: tokenId,
            expires
          }
          const newTokenPromise = await to(jsondm.create('tokens', tokenId, tokenObject));
          if (newTokenPromise.error) {
            reject(errors.standard(500, 'Could not create the new token'));
          } else {
            resolve({ statusCode: 200, payload: tokenObject })
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
// Required params: phone
// Optional params: none
// @TODO Only let an authenticated users access their object
_tokens.get = function(data) {
  return new Promise(async (resolve, reject) => {
    const phone = verifyPhonePayload(data.query.phone);
    if (phone) {
      const { error, response } = await to(jsondm.read('users', phone));
      if (!error && response) {
        delete response.hashedPassword
        resolve({ statusCode: 200, payload: response })
      } else {
        reject(errors.notFound());
      }
    } else {
      reject(errors.missingFieldsError(['phone']));
    }
  })
};

// Users - PUT
// Required params: phone
// Optional params: firstName, lastName & password (At least one must be specified)
// @TODO Only let an authenticated users update their object
_tokens.put = function(data) {
  return new Promise(async (resolve, reject) => {
    const phone = verifyPhonePayload(data.payload.phone);
    const firstName = verifyPayload(data.payload.firstName);
    const lastName =  verifyPayload(data.payload.lastName);
    const password =  verifyPayload(data.payload.password);
    if (phone) {
      if (firstName || lastName || password) {
        const userPromise = await to(jsondm.read('users', phone));
        if (!userPromise.error && userPromise.response) {
          const userObject = updateUserObject({ firstName, lastName, password }, userPromise.response);
          const { error } = await to(jsondm.update('users', phone, userObject));
          if (!error) {
            resolve({ statusCode: 200, payload: userObject })
          } else {
            console.log(error);
            reject(errors.standard(500, 'Could not update the user, something went wrong'));
          }
        } else {
          reject(errors.standard(400, 'The requested user does not exists'));
        }
      } else {
        const missingFields = ['firstName', 'lastName', 'password'];
        reject(errors.missingFieldsError(missingFields, true));
      }
    } else {
      reject(errors.missingFieldsError(['phone']));
    }
  })
};

// Users - DELETE
// Required params: phone
// Optional params: none
// @TODO Only let an authenticated users delete their object
// @TODO Cleanup (delete) any other data files associated with this user
_tokens.delete = function(data) {
  return new Promise(async (resolve, reject) => {
    const phone = verifyPhonePayload(data.query.phone);
    if (phone) {
      const userPromise = await to(jsondm.read('users', phone));
      if (!userPromise.error && userPromise.response) {
        const { error } = await to(jsondm.remove('users', phone))
        if (!error) {
          resolve({ statusCode: 200, payload: {} })
        } else {
          console.log(error);
          reject(errors.standard(500, 'Could not delete the user, something went wrong'));
        }
      } else {
        reject(errors.standard(400, 'The requested user does not exists'));
      }
    } else {
      reject(errors.missingFieldsError(['phone']));
    }
  })
};

module.exports = tokenHandler;

function tokenHandler(data) {
  return new Promise(async (resolve, reject) => {
    console.log(`\nINCOMING REQUEST\nMethod: ${data.method}\nQuery: ${JSON.stringify(data.query)}\nPath: ${data.trimmedPath}\nBody: ${JSON.stringify(data.payload)}`);
    const acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.includes(data.method)) {
      try {
        const payload = await _tokens[data.method](data);
        resolve(payload);
      } catch(err) {
        reject(err)
      }
    } else {
      reject({ statusCode: 405, payload: {} });
    }
  })
}

function updateUserObject(newValues, user) {
  const { firstName, lastName, password } = newValues;
  return {
    firstName: firstName ? firstName : user.firstName,
    lastName: lastName ? lastName : user.lastName,
    password: password ? hash(password) : user.password,
    phone: user.phone,
    tosAgreement: user.tosAgreement,
  }
};

function verifyPayload(payload) {
  return isString(payload) && payload.trim().length > 0
    ? payload.trim()
    : false;
}

function verifyPhonePayload(payload) {
  return isString(payload) && payload.trim().length === 10
    ? payload.trim()
    : false;
}