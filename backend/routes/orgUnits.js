const express = require('express');
const pool = require('../config/database');
const { authenticate, requirePermission } = require('../middleware/auth');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const { fail } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticate);

router.get('/', requirePermission('settings', 'users', 'org_units_manage'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT o.*, p.name AS parent_name,
              (SELECT COUNT(*) FROM user_org_units uou WHERE uou.org_unit_id = o.org_unit_id) AS user_count
       FROM org_units o
       LEFT JOIN org_units p ON p.org_unit_id = o.parent_id
       ORDER BY o.name ASC`
    );
    res.json({ data: rows });
  } catch (error) {
    console.error('List org units error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/', requirePermission('settings', 'users', 'org_units_manage'), async (req, res) => {
  try {
    const { code, name, type = 'office', parent_id = null } = req.body;
    if (!code || !name) return fail(res, 400, 'code and name are required');
    const org_unit_id = generateId(ID_PREFIXES.ORG_UNIT);
    await pool.execute(
      `INSERT INTO org_units (org_unit_id, code, name, type, parent_id) VALUES (?, ?, ?, ?, ?)`,
      [org_unit_id, code, name, type, parent_id]
    );
    res.status(201).json({ org_unit_id, code, name, type, parent_id });
  } catch (error) {
    console.error('Create org unit error:', error);
    return fail(res, 500, error.code === 'ER_DUP_ENTRY' ? 'Org unit code already exists' : 'Internal server error');
  }
});

router.put('/:id', requirePermission('settings', 'users', 'org_units_manage'), async (req, res) => {
  try {
    const { name, type, parent_id, is_active } = req.body;
    await pool.execute(
      `UPDATE org_units SET name = COALESCE(?, name), type = COALESCE(?, type),
        parent_id = ?, is_active = COALESCE(?, is_active) WHERE org_unit_id = ?`,
      [name || null, type || null, parent_id ?? null, is_active == null ? null : is_active ? 1 : 0, req.params.id]
    );
    res.json({ message: 'Updated' });
  } catch (error) {
    console.error('Update org unit error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/:id/users', requirePermission('settings', 'users', 'org_units_manage'), async (req, res) => {
  try {
    const { user_id, is_primary = false } = req.body;
    if (!user_id) return fail(res, 400, 'user_id required');
    await pool.execute(
      `INSERT INTO user_org_units (user_id, org_unit_id, is_primary) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE is_primary = VALUES(is_primary)`,
      [user_id, req.params.id, is_primary ? 1 : 0]
    );
    res.status(201).json({ message: 'User assigned' });
  } catch (error) {
    console.error('Assign org user error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.get('/:id/users', requirePermission('settings', 'users', 'org_units_manage'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.username, u.full_name, uou.is_primary
       FROM user_org_units uou
       JOIN users u ON u.user_id = uou.user_id
       WHERE uou.org_unit_id = ?`,
      [req.params.id]
    );
    res.json({ data: rows });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
