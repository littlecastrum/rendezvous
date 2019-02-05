/*
 * Primary file for the API
 *
 */

// Dependencies
const server = require('./src/server');
const workers = require('./src/workers');

const app = {
  init: () => {
    server.init(server.availableServers);
    workers.init();
  }
};

app.init();

module.exports = app;
