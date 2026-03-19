const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../backend-agent/.env.dev') });
// Fallback para .env local
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

module.exports = pool;
