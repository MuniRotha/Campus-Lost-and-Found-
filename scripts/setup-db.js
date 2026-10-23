// Optional helper: runs db/schema.sql then db/seed.sql using the credentials in .env.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });
  for (const f of ['schema.sql', 'seed.sql']) {
    await conn.query(fs.readFileSync(path.join(__dirname, '..', 'db', f), 'utf8'));
    console.log(`Ran db/${f}`);
  }
  await conn.end();
})().catch((e) => { console.error('Database setup failed:', e.message); process.exit(1); });
