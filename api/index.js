require('dotenv').config();

let app;
let loadError = null;
try {
  app = require('../server/src/app');
} catch (err) {
  console.error('APP LOAD ERROR:', err);
  loadError = err;
  app = (req, res) => res.status(500).json({ loadError: err.message });
}

module.exports = (req, res) => {
  // Debug: expose env check and any load error before Express middleware
  if (req.url && req.url.includes('_debug')) {
    return res.writeHead(200, { 'Content-Type': 'application/json' }) ||
      res.end(JSON.stringify({
        ok: true,
        nodeVersion: process.version,
        loadError: loadError ? loadError.message : null,
        env: { DB: !!process.env.DATABASE_URL, JWT: !!process.env.JWT_SECRET, NODE_ENV: process.env.NODE_ENV }
      }));
  }
  return app(req, res);
};
