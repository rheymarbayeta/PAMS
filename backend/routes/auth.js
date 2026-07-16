const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [users] = await pool.execute(
      'SELECT user_id, username, password_hash, full_name, role_id FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get all roles for the user from the junction table
    let [userRoles] = await pool.execute(
      `SELECT r.role_id, r.role_name, r.permissions
       FROM user_roles ur 
       INNER JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = ?`,
      [user.user_id]
    );
    
    // Fallback to single role if no roles in junction table
    if (userRoles.length === 0) {
      const [roles] = await pool.execute(
        'SELECT role_id, role_name, permissions FROM roles WHERE role_id = ?',
        [user.role_id]
      );
      userRoles = roles;
    }

    if (!process.env.JWT_SECRET) {
      console.error('[LOGIN] JWT_SECRET is not configured');
      return res.status(500).json({ error: 'Server authentication is not configured' });
    }

    const token = jwt.sign(
      { userId: user.user_id, username: user.username, roleId: user.role_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    await logAction(user.user_id, 'LOGIN', `User '${username}' logged in`);

    // Return all roles + effective permissions
    const roles = userRoles.map(r => r.role_name);
    const role_ids = userRoles.map(r => r.role_id);
    const { resolvePermissionsForRoles } = require('../config/permissions');
    const permissions = resolvePermissionsForRoles(userRoles);

    res.json({
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        full_name: user.full_name,
        role_id: user.role_id,
        role_name: roles[0] || null,
        roles: roles,
        role_ids: role_ids,
        permissions,
      }
    });
  } catch (error) {
    console.error('[LOGIN] Login error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user_id: req.user.user_id,
      username: req.user.username,
      full_name: req.user.full_name,
      role_id: req.user.role_id,
      role_name: req.user.role_name || (req.user.roles && req.user.roles[0]) || null,
      roles: req.user.roles || [],
      role_ids: req.user.role_ids || [],
      permissions: req.user.permissions || [],
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
      'SELECT user_id FROM users WHERE username = ?',
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const user_id = generateId(ID_PREFIXES.USER);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (user_id, username, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
      [user_id, username, password_hash, full_name, role_id]
    );

    await logAction(req.user.user_id, 'CREATE_USER', `User '${req.user.username}' created user '${username}'`);

    res.status(201).json({
      user_id,
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

