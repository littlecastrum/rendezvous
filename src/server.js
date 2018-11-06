const { parse } = require('url');
const { StringDecoder } = require('string_decoder');
const handlers = require('./handlers');
const router = require('./router');
const { helpers } = require('./lib');

// Unified logic for http and https servers
module.exports = (req, res) => {
  // Get the method, headers & URL
  const { method, headers, url } = req;

  // Get the parsed URL
  const { pathname, query } = parse(url, true);

  // Get the path
  const trimmedPath = pathname.replace(/^\/+|\/+$/g, '');

  // Get the payload, if any
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