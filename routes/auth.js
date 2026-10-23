const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const router = express.Router();

const USERNAME_RE = /^[A-Za-z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/items');
  res.render('auth/register', { errors: [], values: {} });
});

router.post('/register', async (req, res, next) => {
  try {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const errors = [];

    if (!USERNAME_RE.test(username)) errors.push('Username must be 3-30 letters, numbers or underscores.');
    if (!EMAIL_RE.test(email) || email.length > 100) errors.push('Enter a valid email address.');
    if (password.length < 8 || password.length > 72) errors.push('Password must be 8-72 characters.');

    if (!errors.length) {
      const [dupes] = await db.query(
        'SELECT username, email FROM users WHERE username = ? OR email = ?', [username, email]);
      if (dupes.some(d => d.username.toLowerCase() === username.toLowerCase())) errors.push('That username is already taken.');
      if (dupes.some(d => d.email === email)) errors.push('That email is already registered.');
    }
    if (errors.length) return res.status(400).render('auth/register', { errors, values: { username, email } });

    const hash = await bcrypt.hash(password, 10);
    try {
      await db.query('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', [username, email, hash]);
    } catch (e) {
      if (e.code === 'ER_DUP_ENTRY') {
        return res.status(400).render('auth/register', { errors: ['Username or email is already registered.'], values: { username, email } });
      }
      throw e;
    }
    req.session.flash = { type: 'success', text: 'Account created. Please log in.' };
    res.redirect('/login');
  } catch (err) { next(err); }
});

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/items');
  res.render('auth/login', { errors: [], values: {}, info: req.query.loggedout ? 'You have been logged out.' : null });
});

router.post('/login', async (req, res, next) => {
  try {
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';
    const [rows] = await db.query('SELECT id, username, password_hash FROM users WHERE username = ?', [username]);
    const user = rows[0];
    // Same message for unknown user and wrong password.
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).render('auth/login', { errors: ['Incorrect username or password.'], values: { username }, info: null });
    }
    const returnTo = req.session.returnTo || '/items';
    // Regenerate the session on login to prevent session fixation.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = { id: user.id, username: user.username };
      req.session.flash = { type: 'success', text: `Welcome back, ${user.username}!` };
      res.redirect(returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/items');
    });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/login?loggedout=1');
  });
});

module.exports = router;
