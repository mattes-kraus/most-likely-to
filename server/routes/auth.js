const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');
const router = express.Router();

let transporter;
async function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });
  } else {
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
  }
  return transporter;
}

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

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

    db.prepare('INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
      .run(user.id, token, expiresAt);

    const resetLink = `http://localhost:5173/reset-password/${token}`;
    
    const mailTransporter = await getTransporter();
    const info = await mailTransporter.sendMail({
      from: '"Most Likely To App" <noreply@mostlikelyto.app>',
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link to reset your password: ${resetLink}`,
      html: `<p>You requested a password reset.</p><p>Click the link below to reset your password:</p><a href="${resetLink}">${resetLink}</a>`
    });

    console.log('Password reset email sent: %s', nodemailer.getTestMessageUrl(info));

    res.json({ message: 'If an account with that email exists, we sent a password reset link.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const resetRecord = db.prepare('SELECT * FROM reset_tokens WHERE token = ?').get(token);
    
    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, resetRecord.user_id);
    db.prepare('DELETE FROM reset_tokens WHERE id = ?').run(resetRecord.id);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
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

  const avatarUrl = '/uploads/' + req.file.filename;

  try {
    db.prepare('UPDATE users SET avatar_url = ? WHERE id = ?').run(avatarUrl, req.session.userId);
    const user = db.prepare('SELECT id, email, username, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

router.put('/password', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, req.session.userId);
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
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
