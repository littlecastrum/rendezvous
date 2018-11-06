const { errors } = require('../lib');
const users = require('./users');
const tokens = require('./tokens');

module.exports = {
  users,
  notFound: () => Promise.reject(errors.notFound())
};