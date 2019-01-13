const { errors } = require('../lib');
const tokenHandler = require('./tokens');
const userHandler = require('./users');

module.exports = {
  notFoundHandler: () => Promise.reject(errors.notFound()),
  tokenHandler,
  userHandler,
};