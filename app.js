require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');

if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 2 }
}));

// Make the logged-in user and one-time flash message available to every view.
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

app.get('/', (req, res) => res.redirect('/items'));
app.use('/', authRoutes);
app.use('/items', itemRoutes);

// 404 for unknown URLs
app.use((req, res) => res.status(404).render('error', { code: 404, message: 'Page not found.' }));

// Central error handler: logs details on the server, shows a generic message to the user.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { code: 500, message: 'Something went wrong. Please try again later.' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Lost-and-Found Board running at http://localhost:${port}`));
