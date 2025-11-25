const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('SuperAdmin', 'Admin'));

// Get all users
router.get('/', async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.user_id, u.username, u.full_name, u.role_id, r.role_name, u.created_at, u.updated_at
       FROM Users u
       INNER JOIN Roles r ON u.role_id = r.role_id
       ORDER BY u.created_at DESC`
    );

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single user
router.get('/:id', async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT u.user_id, u.username, u.full_name, u.role_id, r.role_name, u.created_at, u.updated_at
       FROM Users u
       INNER JOIN Roles r ON u.role_id = r.role_id
       WHERE u.user_id = ?`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user
router.post('/', async (req, res) => {
  try {
    const { username, password, full_name, role_id } = req.body;

    if (!username || !password || !full_name || !role_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if username exists
    const [existing] = await pool.execute(
      'SELECT user_id FROM Users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user_id = generateId(ID_PREFIXES.USER);

    const [result] = await pool.execute(
      'INSERT INTO Users (user_id, username, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, username, password_hash, full_name, role_id]
    );

    await logAction(req.user.user_id, 'CREATE_USER', `Created user '${username}'`);

    res.status(201).json({
      user_id,
      username,
      full_name,
      role_id
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { username, password, full_name, role_id } = req.body;
    const userId = req.params.id;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT username FROM Users WHERE user_id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates = [];
    const values = [];

    if (username) {
      // Check if new username is taken
      const [existing] = await pool.execute(
        'SELECT user_id FROM Users WHERE username = ? AND user_id != ?',
        [username, userId]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updates.push('username = ?');
      values.push(username);
    }

    if (full_name) {
      updates.push('full_name = ?');
      values.push(full_name);
    }

    if (role_id) {
      updates.push('role_id = ?');
      values.push(role_id);
    }

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      values.push(password_hash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);

    await pool.execute(
      `UPDATE Users SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );

    await logAction(req.user.user_id, 'UPDATE_USER', `Updated user ID ${userId}`);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent self-deletion
    if (parseInt(userId) === req.user.user_id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check for dependencies that prevent deletion
    const [createdApps] = await pool.execute(
      'SELECT COUNT(*) as count FROM Applications WHERE creator_id = ?',
      [userId]
    );

    const [assessedFees] = await pool.execute(
      'SELECT COUNT(*) as count FROM Assessed_Fees WHERE assessed_by_user_id = ?',
      [userId]
    );

    const [auditTrail] = await pool.execute(
      'SELECT COUNT(*) as count FROM Audit_Trail WHERE user_id = ?',
      [userId]
    );

    const [sentMessages] = await pool.execute(
      'SELECT COUNT(*) as count FROM Messages WHERE sender_id = ?',
      [userId]
    );

    const [receivedMessages] = await pool.execute(
      'SELECT COUNT(*) as count FROM Messages WHERE recipient_id = ?',
      [userId]
    );

    const dependencies = [];
    if (createdApps[0].count > 0) {
      dependencies.push(`${createdApps[0].count} application(s) as creator`);
    }
    if (assessedFees[0].count > 0) {
      dependencies.push(`${assessedFees[0].count} assessed fee(s)`);
    }
    if (auditTrail[0].count > 0) {
      dependencies.push(`${auditTrail[0].count} audit trail entry/entries`);
    }
    if (sentMessages[0].count > 0 || receivedMessages[0].count > 0) {
      dependencies.push(`${sentMessages[0].count + receivedMessages[0].count} message(s)`);
    }

    if (dependencies.length > 0) {
      return res.status(400).json({ 
        error: `Cannot delete user. User has ${dependencies.join(', ')}. Please reassign or remove these records first.` 
      });
    }

    const [result] = await pool.execute(
      'DELETE FROM Users WHERE user_id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    await logAction(req.user.user_id, 'DELETE_USER', `Deleted user ID ${userId}`);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    
    // Check for foreign key constraint error
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(400).json({ 
        error: 'Cannot delete user. User is referenced in other records (applications, fees, audit trail, or messages). Please reassign these records first.' 
      });
    }
    
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

module.exports = router;

