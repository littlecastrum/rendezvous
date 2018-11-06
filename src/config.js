/*
 * Create and export configuration variables
 *
 */

// Staging (default) enviroment
const staging = {
  httpPort: 3000,
  httpsPort: 3001,
  env: 'staging',
  hashingSecret: 'secret'
};

// Production enviroment
const production = {
  httpPort: 5000,
  httpsPort:  5001,
  env: 'production',
  hashingSecret: 'secret'
};

// Container for all the enviroments
const envs = {
  staging,
  production
};

// Determine which enviroment was passed as a command-line argument
const currentEnv = typeof(process.env.NODE_ENV) === 'string'
  ? process.env.NODE_ENV.toLowerCase()
  : '';

// Check that the current enviroment is one of the above, if not, default to staging
const envToExport = typeof(envs[currentEnv]) === 'object'
  ? envs[currentEnv]
  : envs.staging

module.exports = envToExport