// Blocks anonymous users from protected pages/actions.
function requireLogin(req, res, next) {
  if (req.session.user) return next();
  req.session.flash = { type: 'error', text: 'Please log in to continue.' };
  req.session.returnTo = req.method === 'GET' ? req.originalUrl : '/items';
  res.redirect('/login');
}
module.exports = { requireLogin };
