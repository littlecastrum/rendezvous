const {
  checkHandler,
  tokenHandler,
  notFoundHandler,
  userHandler
} = require('./handlers');

// Define a request router
module.exports = {
  checks: checkHandler,
  tokens: tokenHandler,
  notFound: notFoundHandler,
  users: userHandler
};