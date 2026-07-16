const express = require('express');
const pool = require('../config/database');
const { authenticate, requirePermission } = require('../middleware/auth');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const { nextRunFrom } = require('../utils/reportScheduler');
const { fail } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticate);
router.use(requirePermission('reports', 'view_reports', 'settings'));

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM scheduled_reports ORDER BY created_at DESC'
    );
    res.json({ data: rows });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, report_type, frequency = 'daily', params = {}, is_active = true } = req.body;
    if (!name || !report_type) return fail(res, 400, 'name and report_type required');
    const schedule_id = generateId(ID_PREFIXES.SCHEDULE);
    const next = nextRunFrom(frequency);
    await pool.execute(
      `INSERT INTO scheduled_reports
        (schedule_id, name, report_type, frequency, params_json, is_active, next_run_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        schedule_id,
        name,
        report_type,
        frequency,
        JSON.stringify(params),
        is_active ? 1 : 0,
        next,
        req.user.user_id,
      ]
    );
    res.status(201).json({ schedule_id, next_run_at: next });
  } catch (error) {
    console.error('Create schedule error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, frequency, is_active, params } = req.body;
    await pool.execute(
      `UPDATE scheduled_reports SET
        name = COALESCE(?, name),
        frequency = COALESCE(?, frequency),
        is_active = COALESCE(?, is_active),
        params_json = COALESCE(?, params_json)
       WHERE schedule_id = ?`,
      [
        name || null,
        frequency || null,
        is_active == null ? null : is_active ? 1 : 0,
        params ? JSON.stringify(params) : null,
        req.params.id,
      ]
    );
    res.json({ message: 'Updated' });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
