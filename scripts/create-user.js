// Usage: npm run create-user -- <username> <email> <password>
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../db');

(async () => {
  const [username, email, password] = process.argv.slice(2);
  if (!username || !email || !password) {
    console.error('Usage: npm run create-user -- <username> <email> <password>');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email.toLowerCase(), hash]);
  console.log(`Created user "${username}" (password stored as a bcrypt hash).`);
  await db.end();
})().catch((e) => { console.error('Could not create user:', e.message); process.exit(1); });
