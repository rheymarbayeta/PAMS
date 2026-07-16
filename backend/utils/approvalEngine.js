const pool = require('../config/database');
const { generateId, ID_PREFIXES } = require('./idGenerator');
const logger = require('./logger');

/**
 * Configurable approval chains + SLA (Phase 3 MVP).
 */

async function getActiveChainForPermit(permitTypeId) {
  if (!permitTypeId) {
    const [rows] = await pool.execute(
      'SELECT * FROM approval_chains WHERE is_active = 1 AND permit_type_id IS NULL ORDER BY created_at ASC LIMIT 1'
    );
    return rows[0] || null;
  }
  const [specific] = await pool.execute(
    'SELECT * FROM approval_chains WHERE is_active = 1 AND permit_type_id = ? LIMIT 1',
    [permitTypeId]
  );
  if (specific[0]) return specific[0];
  const [fallback] = await pool.execute(
    'SELECT * FROM approval_chains WHERE is_active = 1 AND permit_type_id IS NULL ORDER BY created_at ASC LIMIT 1'
  );
  return fallback[0] || null;
}

async function getChainSteps(chainId) {
  const [steps] = await pool.execute(
    'SELECT * FROM approval_chain_steps WHERE chain_id = ? ORDER BY step_order ASC',
    [chainId]
  );
  return steps;
}

/**
 * Materialize approval steps when an application enters Pending Approval.
 */
async function startApprovalChain(applicationId, permitTypeId) {
  try {
    const chain = await getActiveChainForPermit(permitTypeId);
    if (!chain) return null;

    const [existing] = await pool.execute(
      'SELECT app_step_id FROM application_approval_steps WHERE application_id = ? LIMIT 1',
      [applicationId]
    );
    if (existing.length) return chain;

    const steps = await getChainSteps(chain.chain_id);
    if (!steps.length) return null;

    const now = Date.now();
    for (const step of steps) {
      const due = new Date(now + (step.sla_hours || 48) * 3600 * 1000);
      await pool.execute(
        `INSERT INTO application_approval_steps
          (app_step_id, application_id, chain_id, step_id, step_order, role_name, status, due_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          generateId(ID_PREFIXES.APPROVAL_STEP || 'astep'),
          applicationId,
          chain.chain_id,
          step.step_id,
          step.step_order,
          step.role_name,
          due,
        ]
      );
    }
    return chain;
  } catch (err) {
    logger.warn('startApprovalChain failed (non-fatal)', { error: err.message });
    return null;
  }
}

async function getPendingStep(applicationId) {
  const [rows] = await pool.execute(
    `SELECT * FROM application_approval_steps
     WHERE application_id = ? AND status = 'pending'
     ORDER BY step_order ASC LIMIT 1`,
    [applicationId]
  );
  return rows[0] || null;
}

/**
 * Approve current step. Returns { done: true } when all steps complete.
 */
async function approveCurrentStep(applicationId, userId, notes = null) {
  const pending = await getPendingStep(applicationId);
  if (!pending) {
    return { done: true, usedChain: false };
  }

  await pool.execute(
    `UPDATE application_approval_steps
     SET status = 'approved', acted_at = NOW(), acted_by = ?, notes = ?
     WHERE app_step_id = ?`,
    [userId, notes, pending.app_step_id]
  );

  const next = await getPendingStep(applicationId);
  return { done: !next, usedChain: true, step: pending };
}

async function rejectCurrentStep(applicationId, userId, notes = null) {
  const pending = await getPendingStep(applicationId);
  if (!pending) return { usedChain: false };
  await pool.execute(
    `UPDATE application_approval_steps
     SET status = 'rejected', acted_at = NOW(), acted_by = ?, notes = ?
     WHERE app_step_id = ?`,
    [userId, notes, pending.app_step_id]
  );
  return { usedChain: true, step: pending };
}

/**
 * Escalate overdue pending steps (SLA).
 */
async function escalateOverdueSteps() {
  const [rows] = await pool.execute(
    `SELECT * FROM application_approval_steps
     WHERE status = 'pending' AND due_at IS NOT NULL AND due_at < NOW()
     LIMIT 100`
  );
  let count = 0;
  for (const row of rows) {
    await pool.execute(
      `UPDATE application_approval_steps
       SET status = 'escalated', due_at = DATE_ADD(NOW(), INTERVAL 24 HOUR)
       WHERE app_step_id = ? AND status = 'pending'`,
      [row.app_step_id]
    );
    // Keep work visible: reopen as pending with extended SLA window
    await pool.execute(
      `UPDATE application_approval_steps SET status = 'pending' WHERE app_step_id = ? AND status = 'escalated'`,
      [row.app_step_id]
    );
    count += 1;
    try {
      const { notifyRole } = require('./notificationService');
      await notifyRole(
        row.role_name,
        `SLA escalation: application ${row.application_id} awaiting ${row.role_name}`,
        `/applications/${row.application_id}/approve`
      );
    } catch (_) { /* optional */ }
  }
  return count;
}

module.exports = {
  getActiveChainForPermit,
  getChainSteps,
  startApprovalChain,
  getPendingStep,
  approveCurrentStep,
  rejectCurrentStep,
  escalateOverdueSteps,
};
