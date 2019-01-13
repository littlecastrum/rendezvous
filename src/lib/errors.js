
function fileErrors(code) {
  return ({
    EEXIST: 'Could not create new file, it may already exist',
    ENOENT: 'Could not find file or directory'
  })[code]
}

function missingFieldsError(fields, optional=false) {
  return {
    statusCode: 400,
    payload: {
      error: optional ? 'Missing at least one field' : 'Missing required field', 
      fields: fields
    }
  }
};

function notFound(message=null) {
  if (typeof message === 'object' && message.hasOwnProperty('code')) {
    message = fileErrors(message.code);
  }
  return {
    statusCode: 404,
    payload: {
      error: message ? message : 'Requested resource not found', 
    }
  }
};

function standard(status, message) {
  return {
    statusCode: status,
    payload: {
      error: message
    }
  }
};

module.exports = {
  fileErrors,
  missingFieldsError,
  notFound,
  standard
};