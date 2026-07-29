const express = require('express');
const db = require('../db');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

router.use(requireAuth);

const generateUniqueCode = () => {
  while (true) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const existing = db.prepare('SELECT id FROM groups WHERE code = ?').get(code);
    if (!existing) return code;
  }
};

const assignDailyQuestion = (groupId, dayNumber) => {
  const unusedQuestion = db.prepare(`
    SELECT id FROM questions 
    WHERE (group_id IS NULL OR group_id = ?)
    AND id NOT IN (
      SELECT question_id FROM daily_questions WHERE group_id = ?
    )
    ORDER BY RANDOM() LIMIT 1
  `).get(groupId, groupId);

  if (unusedQuestion) {
    db.prepare('INSERT INTO daily_questions (group_id, question_id, day_number) VALUES (?, ?, ?)')
      .run(groupId, unusedQuestion.id, dayNumber);
  }
};

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const code = generateUniqueCode();
  const userId = req.session.userId;

  const transaction = db.transaction(() => {
    const groupResult = db.prepare('INSERT INTO groups (name, code, created_by) VALUES (?, ?, ?)')
      .run(name, code, userId);
    const groupId = groupResult.lastInsertRowid;

    db.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)')
      .run(groupId, userId);

    db.prepare('INSERT INTO group_day_tracker (group_id, current_day) VALUES (?, ?)')
      .run(groupId, 1);

    assignDailyQuestion(groupId, 1);
    
    return db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  });

  try {
    const newGroup = transaction();
    res.json(newGroup);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

router.post('/join', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const group = db.prepare('SELECT * FROM groups WHERE code = ?').get(code);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  try {
    db.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)')
      .run(group.id, req.session.userId);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: 'Failed to join group' });
  }
});

router.get('/', (req, res) => {
  const groups = db.prepare(`
    SELECT g.*, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
    FROM groups g
    JOIN group_members gm ON g.id = gm.group_id
    WHERE gm.user_id = ?
  `).all(req.session.userId);
  res.json(groups);
});

router.get('/:id', (req, res) => {
  const groupId = req.params.id;
  const isMember = db.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
    .get(groupId, req.session.userId);
  
  if (!isMember) return res.status(403).json({ error: 'Not a member' });

  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  const members = db.prepare(`
    SELECT u.id, u.username, u.avatar_url
    FROM users u
    JOIN group_members gm ON u.id = gm.user_id
    WHERE gm.group_id = ?
  `).all(groupId);

  res.json({ ...group, members });
});

router.delete('/:id', (req, res) => {
  const groupId = req.params.id;
  const group = db.prepare('SELECT created_by FROM groups WHERE id = ?').get(groupId);
  
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (group.created_by !== req.session.userId) return res.status(403).json({ error: 'Only creator can delete' });

  const transaction = db.transaction(() => {
    db.prepare('DELETE FROM answers WHERE daily_question_id IN (SELECT id FROM daily_questions WHERE group_id = ?)').run(groupId);
    db.prepare('DELETE FROM votes WHERE daily_question_id IN (SELECT id FROM daily_questions WHERE group_id = ?)').run(groupId);
    db.prepare('DELETE FROM daily_questions WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM group_day_tracker WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM group_members WHERE group_id = ?').run(groupId);
    db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
  });

  try {
    transaction();
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router;
