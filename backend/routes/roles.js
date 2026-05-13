const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(authorize('SuperAdmin', 'Admin'));

// Default permissions for each role (used as fallback when DB has no value yet)
const DEFAULT_PERMISSIONS = {
  'SuperAdmin': ['all'],
  'Admin': ['permits', 'applications', 'entities', 'citations', 'reports', 'users', 'settings', 'enforcers', 'delete_citations'],
  'Rights and Rentals Manager': ['rights_rentals_view', 'rights_rentals_record_payment', 'rights_rentals_view_reports'],
  'Assessor': ['applications', 'assess_fees', 'view_reports'],
  'Approver': ['applications', 'approve_applications'],
  'Traffic Officer': ['citations', 'create_citations', 'view_citations'],
  'Citation Manager': ['citations', 'create_citations', 'view_citations', 'delete_citations'],
  'Application Creator': ['applications', 'create_applications'],
};

// Get all roles with permissions
router.get('/', async (req, res) => {
  try {
    const [roles] = await pool.execute(
      'SELECT role_id, role_name, permissions, created_at, updated_at FROM roles ORDER BY role_id'
    );

    // Merge with defaults for roles that have no saved permissions yet
    const result = roles.map(role => ({
      ...role,
      permissions: role.permissions || DEFAULT_PERMISSIONS[role.role_name] || [],
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
      permissions: role.permissions || DEFAULT_PERMISSIONS[role.role_name] || [],
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

