require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });

let app;
try {
  app = require('../server/src/app');
} catch (err) {
  // Expose startup error for debugging
  app = (req, res) => {
    res.status(500).json({ error: 'Startup failed', message: err.message, stack: err.stack });
  };
}

module.exports = app;
