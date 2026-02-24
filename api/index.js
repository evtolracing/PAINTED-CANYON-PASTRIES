require('dotenv').config();

// Trim all env vars that may have \r\n from PowerShell piping during deployment
['DATABASE_URL', 'DIRECT_URL', 'CLIENT_URL', 'NODE_ENV', 'PORT',
  'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN',
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY',
  'AI_PROVIDER', 'AI_CHAT_MODEL', 'AI_EMBEDDING_MODEL',
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM',
  'LOG_LEVEL'
].forEach(k => { if (process.env[k]) process.env[k] = process.env[k].trim(); });

const app = require('../server/src/app');
module.exports = app;

