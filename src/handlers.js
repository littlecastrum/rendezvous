
// Define the handlers

module.exports = {
  ping: (data, cb) => {
    cb(200)
  },
  notFound: (data, cb) => {
    cb(404)
  }
};