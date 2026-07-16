const express = require('express');
const pool = require('../config/database');
const { authenticate, requirePermission } = require('../middleware/auth');
const { paginated, fail } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticate);
router.use(requirePermission('settings', 'users'));

/**
 * GET /api/audit — paginated audit trail
 */
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;
    const { action, search, user_id: userId } = req.query;

    const conditions = [];
    const params = [];
    if (action) {
      conditions.push('a.action = ?');
      params.push(action);
    }
    if (userId) {
      conditions.push('a.user_id = ?');
      params.push(userId);
    }
    if (search && String(search).trim()) {
      conditions.push('(a.details LIKE ? OR a.action LIKE ? OR u.username LIKE ? OR u.full_name LIKE ?)');
      const term = `%${String(search).trim()}%`;
      params.push(term, term, term, term);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM audit_trail a
       LEFT JOIN users u ON u.user_id = a.user_id
       ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.execute(
      `SELECT a.log_id, a.user_id, a.application_id, a.resource_id, a.action, a.details,
              a.timestamp AS created_at,
              u.username, u.full_name
       FROM audit_trail a
       LEFT JOIN users u ON u.user_id = a.user_id
       ${where}
       ORDER BY a.timestamp DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return paginated(res, rows, { page, limit, total });
  } catch (error) {
    console.error('Audit list error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

/**
 * GET /api/audit/export.csv — CSV export
 */
router.get('/export.csv', async (req, res) => {
  try {
    const limit = Math.min(5000, Math.max(1, parseInt(req.query.limit, 10) || 1000));
    const [rows] = await pool.execute(
      `SELECT a.timestamp AS created_at, a.action, a.details, a.application_id, a.resource_id,
              u.username, u.full_name
       FROM audit_trail a
       LEFT JOIN users u ON u.user_id = a.user_id
       ORDER BY a.timestamp DESC
       LIMIT ${limit}`
    );

    const escape = (v) => {
      const s = v == null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const header = 'created_at,action,username,full_name,application_id,resource_id,details\n';
    const body = rows
      .map((r) =>
        [r.created_at, r.action, r.username, r.full_name, r.application_id, r.resource_id, r.details]
          .map(escape)
          .join(',')
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-trail.csv"');
    res.send(header + body);
  } catch (error) {
    console.error('Audit export error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
