require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const app = require('../server/src/app');

module.exports = app;
