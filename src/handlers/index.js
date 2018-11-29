const { errors } = require('../lib');
const tokens = require('./tokens');
const users = require('./users');

module.exports = {
  notFound: () => Promise.reject(errors.notFound()),
  tokens,
  users,
};