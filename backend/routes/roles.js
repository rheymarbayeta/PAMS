const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { DEFAULT_PERMISSIONS, parsePermissions } = require('../config/permissions');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('SuperAdmin', 'Admin'));

function normalizeRolePermissions(role) {
  const fromDb = parsePermissions(role.permissions);
  if (fromDb && fromDb.length > 0) return fromDb;
  return DEFAULT_PERMISSIONS[role.role_name] || [];
}

// Get all roles with permissions
router.get('/', async (req, res) => {
  try {
    const [roles] = await pool.execute(
      'SELECT role_id, role_name, permissions, created_at, updated_at FROM roles ORDER BY role_id'
    );

    const result = roles.map((role) => ({
      ...role,
      permissions: normalizeRolePermissions(role),
    }));

    res.json(result);
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get permissions for a specific role
router.get('/:roleId/permissions', async (req, res) => {
  try {
    const [roles] = await pool.execute(
      'SELECT role_id, role_name, permissions FROM roles WHERE role_id = ?',
      [req.params.roleId]
    );

    if (roles.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const role = roles[0];
    res.json({
      role_id: role.role_id,
      role_name: role.role_name,
      permissions: normalizeRolePermissions(role),
    });
  } catch (error) {
    console.error('Get role permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update permissions for a specific role
router.put('/:roleId/permissions', async (req, res) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'permissions must be an array' });
    }

    const [roles] = await pool.execute(
      'SELECT role_id, role_name FROM roles WHERE role_id = ?',
      [req.params.roleId]
    );

    if (roles.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await pool.execute(
      'UPDATE roles SET permissions = ? WHERE role_id = ?',
      [JSON.stringify(permissions), req.params.roleId]
    );

    res.json({ message: 'Permissions updated successfully', permissions });
  } catch (error) {
    console.error('Update role permissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
