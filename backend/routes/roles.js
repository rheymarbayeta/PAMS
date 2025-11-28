const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('SuperAdmin', 'Admin'));

// Get all roles
router.get('/', async (req, res) => {
  try {
    const [roles] = await pool.execute(
      'SELECT role_id, role_name, created_at, updated_at FROM roles ORDER BY role_id'
    );

    res.json(roles);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

