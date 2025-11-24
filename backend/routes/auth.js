const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('[LOGIN] Login attempt:', { username, passwordProvided: !!password });

    if (!username || !password) {
      console.log('[LOGIN] Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [users] = await pool.execute(
      'SELECT user_id, username, password_hash, full_name, role_id FROM Users WHERE username = ?',
      [username]
    );

    console.log('[LOGIN] User query result:', { userFound: users.length > 0, userId: users[0]?.user_id });

    if (users.length === 0) {
      console.log('[LOGIN] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    console.log('[LOGIN] Comparing password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('[LOGIN] Password comparison result:', isValidPassword);

    if (!isValidPassword) {
      console.log('[LOGIN] Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[LOGIN] Password valid, generating token...');

    // Get role name
    const [roles] = await pool.execute(
      'SELECT role_name FROM Roles WHERE role_id = ?',
      [user.role_id]
    );

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, roleId: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await logAction(user.user_id, 'LOGIN', `User '${username}' logged in`);

    console.log('[LOGIN] Login successful for user:', username);

    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role_id: user.role_id,
        role_name: roles[0]?.role_name
      }
    });
  } catch (error) {
    console.error('[LOGIN] Login error:', error);
    console.error('[LOGIN] Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const [roles] = await pool.execute(
      'SELECT role_name FROM Roles WHERE role_id = ?',
      [req.user.role_id]
    );

    res.json({
      user_id: req.user.user_id,
      username: req.user.username,
      full_name: req.user.full_name,
      role_id: req.user.role_id,
      role_name: roles[0]?.role_name
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register (Admin only)
router.post('/register', authenticate, authorize('SuperAdmin', 'Admin'), async (req, res) => {
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

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO Users (username, password_hash, full_name, role_id) VALUES (?, ?, ?, ?)',
      [username, password_hash, full_name, role_id]
    );

    await logAction(req.user.user_id, 'CREATE_USER', `User '${req.user.username}' created user '${username}'`);

    res.status(201).json({
      user_id: result.insertId,
      username,
      full_name,
      role_id
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

