const { errors } = require('../lib');
const checkHandler = require('./check');
const tokenHandler = require('./tokens');
const userHandler = require('./users');

module.exports = {
  checkHandler
  notFoundHandler: () => Promise.reject(errors.notFound()),
  tokenHandler,
  userHandler,
};