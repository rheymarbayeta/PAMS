const express = require('express');
const pool = require('../config/database');
const { authenticate, requirePermission } = require('../middleware/auth');
const { userHasPermission } = require('../config/permissions');

const router = express.Router();

router.use(authenticate);
router.use(requirePermission('tasks_view', 'dashboard_view', 'applications', 'waterworks_view'));

/**
 * GET /api/tasks — My Work inbox (pending actions across modules).
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const tasks = [];

    if (userHasPermission(user, ['assess_fees', 'applications'])) {
      const [pendingAssess] = await pool.execute(
        `SELECT a.application_id, a.application_number, a.permit_type, a.status, a.created_at,
                e.entity_name
         FROM applications a
         LEFT JOIN entities e ON e.entity_id = a.entity_id
         WHERE a.status = 'Pending'
         ORDER BY a.created_at ASC
         LIMIT 50`
      );
      for (const row of pendingAssess) {
        tasks.push({
          id: `assess-${row.application_id}`,
          module: 'permits',
          type: 'assess_application',
          title: `Assess application ${row.application_number || row.application_id}`,
          subtitle: row.entity_name || row.permit_type,
          status: row.status,
          href: `/applications/${row.application_id}/assess`,
          created_at: row.created_at,
        });
      }
    }

    if (userHasPermission(user, ['approve_applications', 'applications'])) {
      const [pendingApproval] = await pool.execute(
        `SELECT a.application_id, a.application_number, a.permit_type, a.status, a.created_at,
                e.entity_name
         FROM applications a
         LEFT JOIN entities e ON e.entity_id = a.entity_id
         WHERE a.status = 'Pending Approval'
         ORDER BY a.created_at ASC
         LIMIT 50`
      );
      for (const row of pendingApproval) {
        tasks.push({
          id: `approve-${row.application_id}`,
          module: 'permits',
          type: 'approve_application',
          title: `Approve application ${row.application_number || row.application_id}`,
          subtitle: row.entity_name || row.permit_type,
          status: row.status,
          href: `/applications/${row.application_id}/approve`,
          created_at: row.created_at,
        });
      }
    }

    if (userHasPermission(user, ['waterworks_manage', 'waterworks_view'])) {
      try {
        const [readings] = await pool.execute(
          `SELECT r.reading_id, r.account_id, r.reading_date, r.current_reading, r.created_at,
                  a.account_number, s.supply_name
           FROM ww_meter_readings r
           LEFT JOIN ww_consumer_accounts a ON a.account_id = r.account_id
           LEFT JOIN ww_water_supplies s ON s.supply_id = a.supply_id
           WHERE r.status = 'pending'
           ORDER BY r.created_at ASC
           LIMIT 50`
        );
        for (const row of readings) {
          tasks.push({
            id: `reading-${row.reading_id}`,
            module: 'waterworks',
            type: 'verify_reading',
            title: `Verify meter reading ${row.account_number || row.account_id}`,
            subtitle: row.supply_name || 'Waterworks',
            status: 'pending',
            href: '/admin/waterworks/readings',
            created_at: row.created_at || row.reading_date,
          });
        }
      } catch (err) {
        // Waterworks tables may not exist on older DBs
        if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
      }
    }

    tasks.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    res.json({
      data: tasks,
      summary: {
        total: tasks.length,
        by_module: tasks.reduce((acc, t) => {
          acc[t.module] = (acc[t.module] || 0) + 1;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
