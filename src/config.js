/*
 * Create and export configuration variables
 *
 */

// Staging (default) enviroment
const staging = {
  httpPort: 3000,
  httpsPort: 3001,
  env: 'staging',
  hashingSecret: 'secret',
  maxChecks: 5,
  twilio: {
    accountSid: 'ACf807ea0630ffb691df7b7d234a5fb6ef',
    authToken: '65531ab6018116febee6ba2eec348b2b',
    fromPhone: '+12563872398'
  }
};

// Production enviroment
const production = {
  httpPort: 5000,
  httpsPort:  5001,
  env: 'production',
  hashingSecret: 'secret',
  maxChecks: 5,
  twilio: {
    accountSid: '',
    authToken: '',
    fromPhone: ''
  }
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