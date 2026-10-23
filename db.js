require('dotenv').config();
const mysql = require('mysql2/promise');

// Credentials come from environment settings only (.env), never from source code.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'lost_found',
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
