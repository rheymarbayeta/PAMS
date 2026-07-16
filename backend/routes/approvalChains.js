const express = require('express');
const pool = require('../config/database');
const { authenticate, requirePermission } = require('../middleware/auth');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const { getChainSteps } = require('../utils/approvalEngine');
const { fail } = require('../utils/apiResponse');

const router = express.Router();
router.use(authenticate);
router.use(requirePermission('settings', 'permits', 'approve_applications'));

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.*,
              (SELECT COUNT(*) FROM approval_chain_steps s WHERE s.chain_id = c.chain_id) AS step_count
       FROM approval_chains c
       ORDER BY c.created_at DESC`
    );
    res.json({ data: rows });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [chains] = await pool.execute('SELECT * FROM approval_chains WHERE chain_id = ?', [req.params.id]);
    if (!chains.length) return fail(res, 404, 'Chain not found');
    const steps = await getChainSteps(req.params.id);
    res.json({ ...chains[0], steps });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, permit_type_id = null, steps = [] } = req.body;
    if (!name) return fail(res, 400, 'name required');
    const chain_id = generateId(ID_PREFIXES.APPROVAL_CHAIN);
    await pool.execute(
      `INSERT INTO approval_chains (chain_id, name, permit_type_id) VALUES (?, ?, ?)`,
      [chain_id, name, permit_type_id]
    );
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await pool.execute(
        `INSERT INTO approval_chain_steps (step_id, chain_id, step_order, role_name, sla_hours)
         VALUES (?, ?, ?, ?, ?)`,
        [
          generateId(ID_PREFIXES.APPROVAL_CHAIN_STEP),
          chain_id,
          s.step_order || i + 1,
          s.role_name,
          s.sla_hours || 48,
        ]
      );
    }
    res.status(201).json({ chain_id, name, permit_type_id });
  } catch (error) {
    console.error('Create approval chain error:', error);
    return fail(res, 500, 'Internal server error');
  }
});

router.put('/:id/active', async (req, res) => {
  try {
    const active = req.body.is_active ? 1 : 0;
    await pool.execute('UPDATE approval_chains SET is_active = ? WHERE chain_id = ?', [active, req.params.id]);
    res.json({ message: 'Updated' });
  } catch (error) {
    return fail(res, 500, 'Internal server error');
  }
});

module.exports = router;
