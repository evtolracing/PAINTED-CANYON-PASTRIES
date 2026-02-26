require('dotenv').config();

// Store boot error so /api/boot-error can return it for live diagnosis
let BOOT_ERROR = null;

// Trim all env vars that may have \r\n from PowerShell piping during deployment
['DATABASE_URL', 'DIRECT_URL', 'CLIENT_URL', 'NODE_ENV', 'PORT',
  'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_EXPIRES_IN', 'JWT_REFRESH_EXPIRES_IN',
  'STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_API_KEY',
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
  BOOT_ERROR = { message: `Missing required environment variables: ${missingVars.join(', ')}` };
}

let app = null;
if (!BOOT_ERROR) {
  try {
    app = require('../server/src/app');
  } catch (err) {
    BOOT_ERROR = { message: err.message, stack: err.stack };
    console.error('FATAL: Failed to load app module:', err.message);
    console.error(err.stack);
  }
}

module.exports = async (req, res) => {
  // Diagnostic endpoint — always available even on boot failure
  if (req.url === '/api/boot-error' || req.url === '/api/boot-error/') {
    let dbStatus = 'not tested';
    if (!BOOT_ERROR && app) {
      try {
        const prisma = require('../server/src/config/database');
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch (e) {
        dbStatus = `FAILED: ${e.message}`;
      }
    }
    return res.status(BOOT_ERROR ? 500 : 200).json({
      ok: !BOOT_ERROR,
      error: BOOT_ERROR,
      db: dbStatus,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'not set',
        hasDatabase: !!process.env.DATABASE_URL,
        hasDirectUrl: !!process.env.DIRECT_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasJwtRefresh: !!process.env.JWT_REFRESH_SECRET,
        hasStripe: !!process.env.STRIPE_SECRET_KEY?.trim(),
        hasGemini: !!process.env.GEMINI_API_KEY?.trim(),
        hasOpenAI: !!process.env.OPENAI_API_KEY?.trim(),
        hasDeepSeek: !!process.env.DEEPSEEK_API_KEY?.trim(),
        hasSupabase: !!process.env.SUPABASE_URL?.trim(),
      },
    });
  }

  if (!app) {
    return res.status(500).json({
      success: false,
      error: {
        message: BOOT_ERROR
          ? `App failed to initialize: ${BOOT_ERROR.message}`
          : 'App failed to initialize for unknown reason.',
        hint: 'Visit /api/boot-error for diagnostics.',
      },
    });
  }

  return app(req, res);
};
