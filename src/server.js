const { parse } = require('url');
const { StringDecoder } = require('string_decoder');
const handlers = require('./handlers');
const router = require('./router');

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

  req.on('end', () => {
    buffer += decoder.end();
    
    // Choose the handler this request should go to. If one is not found, use the notFound hanlder
    const choosenHandle = typeof(router[trimmedPath]) !== 'undefined'
      ? router[trimmedPath] 
      : handlers.notFound;
    
    // Construct the data object to send to the handler
    const data = {
      trimmedPath,
      query,
      method,
      headers,
      payload: buffer
    };

    // Route the request to the handler specified in the router
    choosenHandle(data, (statusCode, payload) => {
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

      // Use the payload called back by the handler, or default to an empty object
      payload = typeof(payload) === 'object' ? payload : {};

      // Convert the payload to a string
      const payloadString = JSON.stringify(payload);

      // Send the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the request path
      console.log(`Request received on server\nStatus: ${statusCode}\nPayload: ${payloadString}`);
    });
  });
};