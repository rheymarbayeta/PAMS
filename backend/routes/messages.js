const express = require('express');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get online users for chat
router.get('/online-users', async (req, res) => {
  try {
    const onlineUsers = req.app.get('onlineUsers');
    const onlineUserIds = onlineUsers ? Array.from(onlineUsers.keys()) : [];
    
    if (onlineUserIds.length === 0) {
      return res.json([]);
    }
    
    // Filter out current user and get user details
    const filteredIds = onlineUserIds.filter(id => id !== req.user.user_id);
    
    if (filteredIds.length === 0) {
      return res.json([]);
    }
    
    const placeholders = filteredIds.map(() => '?').join(',');
    const [users] = await pool.execute(
      `SELECT u.user_id, u.username, u.full_name, u.role_id, r.role_name
       FROM Users u
       INNER JOIN Roles r ON u.role_id = r.role_id
       WHERE u.user_id IN (${placeholders})
       ORDER BY u.full_name ASC`,
      filteredIds
    );

    res.json(users);
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users for chat (no admin role required)
// This must come BEFORE the '/' route to avoid conflicts
router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.user_id, u.username, u.full_name, u.role_id, r.role_name
       FROM Users u
       INNER JOIN Roles r ON u.role_id = r.role_id
       WHERE u.user_id != ?
       ORDER BY u.full_name ASC`,
      [req.user.user_id]
    );

    res.json(users);
  } catch (error) {
    console.error('Get chat users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list of users you have conversations with
// This must come BEFORE the '/' route to avoid conflicts
router.get('/conversations', async (req, res) => {
  try {
    // Simplified query to get unique conversation partners
    const [partners] = await pool.execute(
      `SELECT DISTINCT
        CASE 
          WHEN m.sender_id = ? THEN m.recipient_id
          ELSE m.sender_id
        END as user_id,
        u.full_name,
        r.role_name
       FROM Messages m
       INNER JOIN Users u ON (
         CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END = u.user_id
       )
       INNER JOIN Roles r ON u.role_id = r.role_id
       WHERE m.sender_id = ? OR m.recipient_id = ?
       ORDER BY (
         SELECT MAX(timestamp) FROM Messages m2 
         WHERE (m2.sender_id = ? AND m2.recipient_id = CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END)
            OR (m2.recipient_id = ? AND m2.sender_id = CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END)
       ) DESC`,
      [
        req.user.user_id,
        req.user.user_id,
        req.user.user_id, req.user.user_id,
        req.user.user_id, req.user.user_id, req.user.user_id, req.user.user_id
      ]
    );

    res.json(partners);
  } catch (error) {
    console.error('Get conversations error:', error);
    console.error('Error details:', error.message);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get conversation history
router.get('/', async (req, res) => {
  try {
    const { recipient_id, application_context_id } = req.query;

    if (!recipient_id) {
      return res.status(400).json({ error: 'recipient_id is required' });
    }

    let query = `
      SELECT 
        m.*,
        sender.full_name as sender_name,
        recipient.full_name as recipient_name
      FROM Messages m
      INNER JOIN Users sender ON m.sender_id = sender.user_id
      INNER JOIN Users recipient ON m.recipient_id = recipient.user_id
      WHERE (m.sender_id = ? AND m.recipient_id = ?) 
         OR (m.sender_id = ? AND m.recipient_id = ?)
    `;
    const params = [req.user.user_id, recipient_id, recipient_id, req.user.user_id];

    if (application_context_id) {
      query += ' AND m.application_context_id = ?';
      params.push(application_context_id);
    }

    query += ' ORDER BY m.timestamp ASC';

    const [messages] = await pool.execute(query, params);
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send message
router.post('/', async (req, res) => {
  try {
    const { recipient_id, content, application_context_id } = req.body;

    if (!recipient_id || !content) {
      return res.status(400).json({ error: 'Recipient ID and content are required' });
    }

    const message_id = generateId(ID_PREFIXES.MESSAGE);

    const [result] = await pool.execute(
      'INSERT INTO Messages (message_id, sender_id, recipient_id, content, application_context_id) VALUES (?, ?, ?, ?, ?)',
      [message_id, req.user.user_id, recipient_id, content, application_context_id || null]
    );

    // Get the created message with user details
    const [messages] = await pool.execute(
      `SELECT 
        m.*,
        sender.full_name as sender_name,
        recipient.full_name as recipient_name
       FROM Messages m
       INNER JOIN Users sender ON m.sender_id = sender.user_id
       INNER JOIN Users recipient ON m.recipient_id = recipient.user_id
       WHERE m.message_id = ?`,
      [message_id]
    );

    const message = messages[0];

    // Get sender's full name once
    const [senderInfo] = await pool.execute(
      'SELECT full_name, username FROM Users WHERE user_id = ?',
      [req.user.user_id]
    );
    const senderName = senderInfo[0]?.full_name || senderInfo[0]?.username || 'Someone';

    // Create notification for recipient
    try {
      const { createNotification } = require('../utils/notificationService');
      await createNotification(
        recipient_id,
        `New message from ${senderName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        `/chat?user_id=${req.user.user_id}`
      );
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail the message send if notification fails
    }

    // Emit via Socket.io if available (for real-time chat updates)
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${recipient_id}`).emit('new_message', message);
      // Note: notification is already emitted by createNotification above
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

