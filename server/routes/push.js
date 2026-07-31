const express = require('express');
const db = require('../db');
const { webpush, vapidPublicKey } = require('../pushUtils');

const router = express.Router();

// Get the public VAPID key
router.get('/vapidPublicKey', (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

// Subscribe to push notifications
router.post('/subscribe', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription object' });
  }

  try {
    const subString = JSON.stringify(subscription);
    db.prepare('INSERT OR IGNORE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)')
      .run(req.session.userId, subString);
    res.status(201).json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

// Test send push to a group
router.post('/test/:groupId', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const groupId = req.params.groupId;
  
  // Verify the user is the admin (creator) of the group
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }
  
  if (group.created_by !== req.session.userId) {
    return res.status(403).json({ error: 'Only the group admin can send test pushes' });
  }

  try {
    // Get all subscriptions for users in this group
    const subscriptions = db.prepare(`
      SELECT ps.subscription, ps.user_id 
      FROM push_subscriptions ps
      JOIN group_members gm ON ps.user_id = gm.user_id
      WHERE gm.group_id = ?
    `).all(groupId);

    const payload = JSON.stringify({
      title: 'Test Push-Benachrichtigung',
      body: 'Dies ist ein Test vom Gruppen-Admin!',
      url: `/groups/${groupId}`
    });

    const sendPromises = subscriptions.map(subRow => {
      const sub = JSON.parse(subRow.subscription);
      return webpush.sendNotification(sub, payload).catch(err => {
        console.error('Error sending push to user', subRow.user_id, err);
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid
          db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?')
            .run(subRow.user_id, subRow.subscription);
        }
      });
    });

    await Promise.all(sendPromises);
    res.json({ message: 'Push notifications sent', count: subscriptions.length });
  } catch (err) {
    console.error('Error in test push:', err);
    res.status(500).json({ error: 'Failed to send push notifications' });
  }
});

module.exports = router;
