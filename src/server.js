/*
 *
 *
 */

// Dependencies
const https = require('https');
const http = require('http');
const path = require('path');
const { readFileSync } = require('fs') 
const { parse } = require('url');
const { StringDecoder } = require('string_decoder');
const { helpers } = require('./lib');
const handlers = require('./handlers');
const router = require('./router');
const config = require('./config');

const serverOptions = {
  key: readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: readFileSync(path.join(__dirname, '/../https/cert.pem'))
};

function unifiedServer(req, res) {
  const { method, headers, url } = req;
  const { pathname, query } = parse(url, true);
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', data => {
    buffer += decoder.write(data);
  })

  req.on('end', async () => {
    buffer += decoder.end();
        
    const choosenHandle = typeof(router[trimmedPath]) !== 'undefined'
      ? router[trimmedPath] 
      : handlers.notFound;

    const data = {
      trimmedPath,
      query,
      method: method.toLowerCase(),
      headers,
      payload: helpers.parseJsonToObject(buffer)
    };

    const { error, response } = await helpers.to(choosenHandle(data));
    
    let { statusCode, payload } = !error ? response : error;

    statusCode = typeof(statusCode) === 'number' ? statusCode : 200;
    payload = typeof(payload) === 'object' ? payload : {};

    const payloadString = JSON.stringify(payload);

    res.setHeader('Content-Type', 'application/json');
    res.writeHead(statusCode);
    res.end(payloadString);

    console.log(`\nSERVER RESPONSE\nStatus: ${statusCode}\nPayload: ${payloadString}`);
  });
}; 

function init(servers) {
  servers.forEach(({server, port}) => {
    server.listen(port, () => {
      console.log(`The server is listening on port ${port}`);
    })
  })
};

const availableServers = [
  {
    server: http.createServer((req, res) => unifiedServer(req, res)),
    port: config.httpPort
  },
  {
    server: https.createServer(serverOptions, (req, res) => unifiedServer(req, res)),
    port: config.httpsPort
  }
];

module.exports = {
  availableServers,
  init
};
