require('dotenv').config();

// Trim all env vars that may have \r\n from PowerShell piping during deployment
['DATABASE_URL', 'DIRECT_URL', 'CLIENT_URL', 'NODE_ENV', 'JWT_SECRET',
  'JWT_REFRESH_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'LOG_LEVEL',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
].forEach(k => { if (process.env[k]) process.env[k] = process.env[k].trim(); });

const app = require('../server/src/app');
module.exports = app;

