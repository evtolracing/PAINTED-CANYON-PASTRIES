require('dotenv').config();

let app;
try {
  app = require('../server/src/app');
} catch (err) {
  console.error('APP LOAD ERROR:', err);
  app = (req, res) => res.status(500).json({ loadError: err.message, stack: err.stack });
}

// Add an early error-exposing health check at the top
const originalApp = app;
module.exports = (req, res) => {
  if (req.url === '/api/_debug') {
    return res.status(200).json({ status: 'function ok', nodeVersion: process.version, env: { DB: !!process.env.DATABASE_URL, JWT: !!process.env.JWT_SECRET, NODE_ENV: process.env.NODE_ENV } });
  }
  return originalApp(req, res);
};
