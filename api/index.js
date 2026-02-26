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

// Prisma schema requires DIRECT_URL — fall back to DATABASE_URL if not set
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL.replace('pgbouncer=true', '').replace(/[?&]$/, '').replace(/&$/, '');
}

// Validate required environment variables before loading the app
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missingVars = REQUIRED_ENV_VARS.filter(k => !process.env[k]);

if (missingVars.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Set these in your Vercel project dashboard under Settings → Environment Variables.');
  module.exports = (req, res) => {
    res.status(500).json({
      success: false,
      error: { message: 'Server configuration error. Missing required environment variables.' },
    });
  };
  return;
}

let app;
try {
  app = require('../server/src/app');
} catch (err) {
  console.error('FATAL: Failed to load app module:', err.message);
  console.error(err.stack);
  app = (req, res) => {
    res.status(500).json({
      success: false,
      error: { message: 'App failed to initialize. Check Vercel function logs for details.' },
    });
  };
}

module.exports = app;
