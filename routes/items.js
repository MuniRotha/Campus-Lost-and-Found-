const express = require('express');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { requireLogin } = require('../middleware/auth');
const uploadImage = require('../middleware/upload');
const hasImageSignature = require('../middleware/magic');
const router = express.Router();

const KINDS = ['lost', 'found'];
const STATUSES = ['open', 'resolved'];
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

const isId = (v) => /^\d{1,10}$/.test(String(v)) && Number(v) > 0 && Number(v) <= 4294967295;
const removeFile = (name) => { if (name) fs.unlink(path.join(UPLOAD_DIR, path.basename(name)), () => {}); };
const getCategories = async () => (await db.query('SELECT id, name FROM categories ORDER BY name'))[0];

const SELECT_POST = `SELECT p.*, c.name AS category, u.username AS owner
  FROM posts p JOIN categories c ON c.id = p.category_id JOIN users u ON u.id = p.user_id`;

// Validates form input on the server. Returns { errors, data }.
async function validatePost(body) {
  const errors = [];
  const data = {
    title: (body.title || '').trim(),
    description: (body.description || '').trim(),
    category_id: body.category_id,
    kind: body.kind,
    status: body.status || 'open',
    location: (body.location || '').trim()
  };
  if (!data.title) errors.push('Title is required.');
  else if (data.title.length > 100) errors.push('Title must be 100 characters or fewer.');
  if (!data.description) errors.push('Description is required.');
  else if (data.description.length > 2000) errors.push('Description must be 2000 characters or fewer.');
  if (data.location.length > 100) errors.push('Location must be 100 characters or fewer.');
  if (!KINDS.includes(data.kind)) errors.push('Choose whether the item is lost or found.');
  if (!STATUSES.includes(data.status)) errors.push('Invalid status.');
  if (!isId(data.category_id)) errors.push('Choose a category.');
  else {
    const [rows] = await db.query('SELECT id FROM categories WHERE id = ?', [data.category_id]);
    if (!rows.length) errors.push('Selected category does not exist.');
  }
  return { errors, data };
}

// Loads a post and enforces ownership on the server. Sends the response itself on failure.
async function loadOwnedPost(req, res) {
  if (!isId(req.params.id)) { res.status(404).render('error', { code: 404, message: 'That item could not be found.' }); return null; }
  const [rows] = await db.query(`${SELECT_POST} WHERE p.id = ?`, [req.params.id]);
  const post = rows[0];
  if (!post) { res.status(404).render('error', { code: 404, message: 'That item could not be found. It may have been deleted.' }); return null; }
  if (post.user_id !== req.session.user.id) {
    res.status(403).render('error', { code: 403, message: 'You can only change or delete your own posts.' });
    return null;
  }
  return post;
}

// Browse + search/filter
router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim().slice(0, 100);
    const category = isId(req.query.category) ? req.query.category : '';
    const kind = KINDS.includes(req.query.kind) ? req.query.kind : '';
    const where = [];
    const params = [];
    if (q) {
      where.push('(p.title LIKE ? OR p.description LIKE ?)');
      const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      params.push(like, like);
    }
    if (category) { where.push('p.category_id = ?'); params.push(category); }
    if (kind) { where.push('p.kind = ?'); params.push(kind); }
    const [items] = await db.query(
      `${SELECT_POST} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY p.created_at DESC, p.id DESC`, params);
    res.render('items/index', { items, categories: await getCategories(), filters: { q, category: String(category), kind } });
  } catch (err) { next(err); }
});

router.get('/new', requireLogin, async (req, res, next) => {
  try {
    res.render('items/form', { mode: 'new', post: { kind: 'lost', status: 'open' }, categories: await getCategories(), errors: [] });
  } catch (err) { next(err); }
});

router.post('/', requireLogin, uploadImage, async (req, res, next) => {
  try {
    const { errors, data } = await validatePost(req.body);
    if (req.uploadError) errors.push(req.uploadError);
    if (req.file && !hasImageSignature(req.file.path)) { errors.push('Only JPEG or PNG images are allowed.'); }
    if (errors.length) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).render('items/form', { mode: 'new', post: data, categories: await getCategories(), errors });
    }
    const [result] = await db.query(
      `INSERT INTO posts (user_id, category_id, title, description, kind, status, location, image_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.user.id, data.category_id, data.title, data.description, data.kind, data.status, data.location || null, req.file ? req.file.filename : null]);
    req.session.flash = { type: 'success', text: 'Your post was created.' };
    res.redirect(`/items/${result.insertId}`);
  } catch (err) { if (req.file) removeFile(req.file.filename); next(err); }
});

router.get('/mine', requireLogin, async (req, res, next) => {
  try {
    const [items] = await db.query(`${SELECT_POST} WHERE p.user_id = ? ORDER BY p.created_at DESC, p.id DESC`, [req.session.user.id]);
    res.render('items/mine', { items });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!isId(req.params.id)) return res.status(404).render('error', { code: 404, message: 'That item could not be found.' });
    const [rows] = await db.query(`${SELECT_POST} WHERE p.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).render('error', { code: 404, message: 'That item could not be found. It may have been deleted.' });
    res.render('items/show', { post: rows[0] });
  } catch (err) { next(err); }
});

router.get('/:id/edit', requireLogin, async (req, res, next) => {
  try {
    const post = await loadOwnedPost(req, res);
    if (!post) return;
    res.render('items/form', { mode: 'edit', post, categories: await getCategories(), errors: [] });
  } catch (err) { next(err); }
});

router.post('/:id/edit', requireLogin, uploadImage, async (req, res, next) => {
  try {
    const post = await loadOwnedPost(req, res);
    if (!post) { if (req.file) removeFile(req.file.filename); return; }
    const { errors, data } = await validatePost(req.body);
    if (req.uploadError) errors.push(req.uploadError);
    if (req.file && !hasImageSignature(req.file.path)) errors.push('Only JPEG or PNG images are allowed.');
    if (errors.length) {
      if (req.file) removeFile(req.file.filename);
      return res.status(400).render('items/form', { mode: 'edit', post: { ...data, id: post.id, image_path: post.image_path }, categories: await getCategories(), errors });
    }
    let imagePath = post.image_path;
    if (req.file) imagePath = req.file.filename;
    else if (req.body.remove_image === '1') imagePath = null;

    // user_id in WHERE is a second line of defence for ownership.
    await db.query(
      `UPDATE posts SET category_id=?, title=?, description=?, kind=?, status=?, location=?, image_path=?
       WHERE id=? AND user_id=?`,
      [data.category_id, data.title, data.description, data.kind, data.status, data.location || null, imagePath, post.id, req.session.user.id]);
    if (imagePath !== post.image_path) removeFile(post.image_path);
    req.session.flash = { type: 'success', text: 'Your post was updated.' };
    res.redirect(`/items/${post.id}`);
  } catch (err) { if (req.file) removeFile(req.file.filename); next(err); }
});

router.post('/:id/resolve', requireLogin, async (req, res, next) => {
  try {
    const post = await loadOwnedPost(req, res);
    if (!post) return;
    await db.query("UPDATE posts SET status='resolved' WHERE id=? AND user_id=?", [post.id, req.session.user.id]);
    req.session.flash = { type: 'success', text: 'Post marked as resolved.' };
    res.redirect(`/items/${post.id}`);
  } catch (err) { next(err); }
});

router.post('/:id/delete', requireLogin, async (req, res, next) => {
  try {
    const post = await loadOwnedPost(req, res);
    if (!post) return;
    await db.query('DELETE FROM posts WHERE id=? AND user_id=?', [post.id, req.session.user.id]);
    removeFile(post.image_path);
    req.session.flash = { type: 'success', text: 'Your post was deleted.' };
    res.redirect('/items/mine');
  } catch (err) { next(err); }
});

module.exports = router;
