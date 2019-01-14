const fs = require('fs');
const config = require('../config');
const { errors, jsondm } = require('../lib');
const {
  acceptedHTTPMethod,
  createRandomStr,
  hash,
  isString,
  isBoolean,
  isArray,
  to,
  serverMessage,
  verifyPayload,
  verifyPhonePayload,
  verifyPayloadWithOptions,
  verifyObjectArrayPayload,
  verifyTimeoutPayload
} = require('../lib').helpers;
const { _tokens } = require('./tokens');

const HOUR = 1000 * 60 * 60;

const _checks = {
  post: postFn,
  get: getFn,
  put: putFn,
  delete: deleteFn
}

module.exports = checkHandler;

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
    const protocol =  verifyPayloadWithOptions(data.payload.protocol, ['http', 'https']);
    const url =  verifyPayload(data.payload.url);
    const method =  verifyPayloadWithOptions(data.payload.method, ['post', 'get', 'put', 'delete']);
    const successCodes = verifyObjectArrayPayload(data.payload.successCodes);
    const timeoutSeconds = verifyTimeoutPayload(data.payload.timeoutSeconds);

    if (protocol && url && method && successCodes && timeoutSeconds) {
      const token = isString(data.headers.token) ? data.headers.token : false;
      const tokenPromise = await to(jsondm.read('tokens', token));
      if (!tokenPromise.error && tokenPromise.response) {
        const userPhone = tokenPromise.response.phone;
        const userPromise = await to(jsondm.read('users', userPhone));
        if (!userPromise.error && userPromise.response) {
          const userChecks = isArray(userPromise.response.checks) ? userPromise.response.checks : [];
          if (userChecks.length < config.maxChecks) {
            const checkId = createRandomStr(20);
            const checkObject = {
              id: checkId,
              userPhone,
              protocol,
              url,
              method,
              successCodes,
              timeoutSeconds
            };
            const newCheck = await to(jsondm.create('checks', checkId, checkObject));
            if (!newCheck.error) {
              const updateUserWithChecks = userPromise.response;
              updateUserWithChecks.checks = [...userChecks, checkId];
              const updatedUser = await to(jsondm.update('users', userPhone, updateUserWithChecks));
              if (!updatedUser.error) {
                resolve({ statusCode: 200, payload: checkObject })
              } else {
                reject(errors.standard(500, `Could not update the user with the new checks`));
              }
            } else {
              reject(errors.standard(500, `Could not create the new checks`));
            }
          } else {
            reject(errors.standard(400, 'User already reached the maximun amount of checks ('+config.maxChecks+')'));
          }
        } else {
          reject(errors.standard(403, 'Unauthorized to access data'));
        }
      } else {
        reject(errors.standard(403, 'Unauthorized to access data'));
      }
    } else {
      const missingFields = Object.entries({protocol, url, method, successCodes, timeoutSeconds})
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
      const checkPromise = await to(jsondm.read('checks', id));
      if (!checkPromise.error && checkPromise.response) {
        const token = isString(data.headers.token) ? data.headers.token : false;
        const tokenIsValid = await _tokens.verifyToken(token, checkPromise.response.userPhone);
        if (tokenIsValid) {
          resolve({ statusCode: 200, payload: checkPromise.response })
        } else {
          reject(errors.standard(403, 'Missing required token in header, or token is invalid'));
        }
      } else {
        reject(errors.notFound(tokenPromise.error));
      }
    } else {
      reject(errors.missingFieldsError(['id']));
    }
  })
};

// Checks - PUT
// Required params: id
// Optional params: protocol, url, method, successCodes, timeoutSeconds (one must be send)
function putFn(data) {
  return new Promise(async (resolve, reject) => {
    const id = verifyPayload(data.payload.id, 20);

    if (id) {
      const protocol =  verifyPayloadWithOptions(data.payload.protocol, ['http', 'https']);
      const url =  verifyPayload(data.payload.url);
      const method =  verifyPayloadWithOptions(data.payload.method, ['post', 'get', 'put', 'delete']);
      const successCodes = verifyObjectArrayPayload(data.payload.successCodes);
      const timeoutSeconds = verifyTimeoutPayload(data.payload.timeoutSeconds);
      if (protocol || url || method || successCodes || timeoutSeconds) {
        const checkPromise = await to(jsondm.read('checks', id));
        if (!checkPromise.error && checkPromise.response) {
          const token = isString(data.headers.token) ? data.headers.token : false;
          const tokenIsValid = await _tokens.verifyToken(token, checkPromise.response.userPhone);
          if (tokenIsValid) {
            const checkObject = updateUserObject({ protocol, url, method, successCodes, timeoutSeconds }, checkPromise.response);
            const { error } = await to(jsondm.update('checks', id, checkObject));
            if (!error) {
              resolve({ statusCode: 200, payload: checkObject })
            } else {
              reject(errors.standard(500, 'Could not update the check, something went wrong'));
            }
          } else {
            reject(errors.standard(403, 'Missing required token in header, or token is invalid'));
          }
        } else {
          reject(errors.standard(400, 'Check ID did not exists'));
        }
      } else {
        const missingFields = ['protocol', 'url', 'method', 'successCodes', 'timeoutSeconds'];
        reject(errors.missingFieldsError(missingFields, true));
      }
    } else {
      reject(errors.missingFieldsError(['id']));
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
      const checkPromise = await to(jsondm.read('checks', id));
      if (!checkPromise.error && checkPromise.response) {
        const checkData = checkPromise.response;
        const token = isString(data.headers.token) ? data.headers.token : false;
        const tokenIsValid = await _tokens.verifyToken(token, checkData.userPhone);
        if (tokenIsValid) {
          const { error } = await to(jsondm.remove('checks', id));
          if (!error) {
            const userPromise = await to(jsondm.read('users', checkData.userPhone));
            if (!userPromise.error && userPromise.response) {
              const userData = userPromise.response;
              const userChecks = isArray(userData.checks) ? userData.checks : [];
              if (userChecks.includes(id)) {
                const updatedChecks = userChecks.filter(checkId => checkId !== id);
                const updateToUser = { ...userData, checks: updatedChecks };
                const updatedUserPromise = await to(jsondm.update('users', checkData.userPhone, updateToUser));
                if (!updatedUserPromise.error && updatedUserPromise.response) {
                  resolve({ statusCode: 200, payload: {} });
                }  else {
                  console.log()
                  reject(errors.standard(500, 'Could not update the user, something went wrong'));
                }
              } else {
                reject(errors.standard(500, 'Could not find the check on the user\'s object, something went wrong'));
              }
            } else {
              reject(errors.standard(500, 'Could not find the user to delete checks, something went wrong'));
            }
          } else {
            reject(errors.standard(500, 'Could not delete the check data, something went wrong'));
          }
        } else {
          reject(errors.standard(403, 'Missing required token in header, or token is invalid'));
        }
      } else {
        reject(errors.standard(400, 'Check ID did not exists'));
      }
    } else {
      reject(errors.missingFieldsError(['id']));
    }
  })
};

function updateUserObject(newValues, check) {
  const { protocol, url, method,  successCodes, timeoutSeconds } = newValues;
  return {
    ...check,
    protocol: protocol ? protocol : check.protocol,
    url: url ? url : check.url,
    method: method ? method : check.method,
    successCodes: successCodes ? successCodes : check.successCodes,
    timeoutSeconds: timeoutSeconds ? timeoutSeconds : check.timeoutSeconds
  }
};
