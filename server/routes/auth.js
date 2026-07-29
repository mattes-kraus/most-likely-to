const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const db = require('../db');
const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.post('/register', async (req, res) => {
  const { email, password, username } = req.body;
  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)')
      .run(email, passwordHash, username);
    
    req.session.userId = result.lastInsertRowid;
    const user = db.prepare('SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
    res.json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    req.session.userId = user.id;
    delete user.password_hash;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});

router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = db.prepare('SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  res.json(user);
});

router.put('/profile', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { username, avatar_url } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    db.prepare('UPDATE users SET username = ?, avatar_url = ? WHERE id = ?')
      .run(username, avatar_url || null, req.session.userId);
    
    const user = db.prepare('SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/avatar', upload.single('avatar'), (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  // File path accessible from frontend via express.static (relative path so it works in production)
  const avatarUrl = '/uploads/' + req.file.filename;

  try {
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.session.userId);
    const user = db.prepare('SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

router.get('/custom-questions', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const questions = db.prepare(`
    SELECT q.id, q.text, q.type, q.group_id, g.name as group_name
    FROM questions q
    LEFT JOIN groups g ON q.group_id = g.id
    WHERE q.created_by = ?
    ORDER BY q.id DESC
  `).all(req.session.userId);

  res.json(questions);
});

module.exports = router;
