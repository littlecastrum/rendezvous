/*
 * Primary file for the API
 *
 */

// Dependencies
const https = require('https');
const http = require('http');
const { readFileSync } = require('fs') 
const config = require('./src/config');
const server = require('./src/server');

// Initialize the HTTP server
const httpServer = http.createServer((req, res) => server(req, res));

// Start the HTTP server and make it listen on the given port 
httpServer.listen(config.httpPort, () => {
  console.log(`The server is listening on http://localhost:${config.httpPort}`);
})

// Initialize the HTTPS server
const serverOptions = {
  key: readFileSync('./https/key.pem'),
  cert: readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(serverOptions, (req, res) => server(req, res));

// Start the HTTPS server and make it listen on the given port 
httpsServer.listen(config.httpsPort, () => {
  console.log(`The server is listening on http://localhost:${config.httpsPort}`);
})
