const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      `SELECT * FROM Notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [req.user.user_id]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM Notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.user_id]
    );
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE Notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE Notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.user_id]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

