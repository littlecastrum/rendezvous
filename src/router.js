const {
  tokenHandler,
  notFoundHandler,
  userHandler
} = require('./handlers');

// Define a request router
module.exports = {
  tokens: tokenHandler,
  notFound: notFoundHandler,
  users: userHandler
};