const fs = require('fs');
const { errors, jsondm } = require('../lib');
const 
const {
  hash,
  to,
  isBoolean,
  isString,
  verifyPayload,
  verifyPhonePayload,
  serverMessage
} = require('../lib').helpers;

const _users = {}

// Users - GET
// Required params: firstName, lastName, password, phone & tosAgreement
// Optional params: none
// @TODO Improve the error structure an messages
_users.post = function(data) {
  return new Promise(async (resolve, reject) => {
    const firstName = verifyPayload(data.payload.firstName);
    const lastName =  verifyPayload(data.payload.lastName);
    const password =  verifyPayload(data.payload.password);
    const phone =  verifyPhonePayload(data.payload.phone);
    const tosAgreement = isBoolean(data.payload.tosAgreement) && data.payload.tosAgreement;
    const userObject = { firstName, lastName, phone, password, tosAgreement };
    const payloadOK = Object.values(userObject).every(payload => payload !== false);
    if (payloadOK) {
      try {
        const user = await jsondm.fileExists('users', phone);
        if (user) {
          reject({ statusCode: 400, payload: { error: 'A user with that phone number already exists' }})
        } else {
          userObject.password = hash(password);
          const newUser = await jsondm.create('users', phone, userObject);
          resolve({ statusCode: 200, payload: userObject })
        }
      } catch(err) {
        console.log(err);
        reject({ statusCode: 500, payload: { error: 'Could not create the new user' }})
      }
    } else {
      const missingFields = Object.entries(userObject)
        .filter(field => field[1] === false)
        .map(field => field[0])
      reject(errors.missingFieldsError(missingFields));
    }
  })
};

// Users - GET
// Required params: phone
// Optional params: none
_users.get = function(data) {
  return new Promise(async (resolve, reject) => {
    const phone = verifyPhonePayload(data.query.phone);
    if (phone) {
      const token = isString(data.headers.token) ? data.headers.token : false;
      const handlers
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
_users.put = function(data) {
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
_users.delete = function(data) {
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

module.exports = userHandler;

function userHandler(data) {
  return new Promise(async (resolve, reject) => {
    console.log(serverMessage(data));
    if (acceptedHTTPMethod(data.method)) {
      const payloadPromise = await to(_users[data.method](data));
      if (payloadPromise.error) {
        reject(payloadPromise.error)
      } else {
        resolve(payloadPromise.response);
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
