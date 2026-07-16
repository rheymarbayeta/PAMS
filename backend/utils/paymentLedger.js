const pool = require('../config/database');
const { generateId } = require('./idGenerator');
const logger = require('./logger');

/**
 * Record a row in the unified payment ledger (Phase 2).
 * Failures are logged but do not break the source payment flow.
 */
async function recordLedgerEntry({
  module,
  referenceType,
  referenceId,
  entityId = null,
  amount,
  paymentDate,
  receiptNo = null,
  method = null,
  recordedBy = null,
  sourceTable = null,
  sourceId = null,
  notes = null,
  connection = null,
}) {
  const db = connection || pool;
  const ledgerId = generateId('led');
  const amt = parseFloat(amount);
  if (!Number.isFinite(amt)) {
    throw new Error('Invalid ledger amount');
  }

  await db.execute(
    `INSERT INTO payment_ledger
      (ledger_id, module, reference_type, reference_id, entity_id, amount, payment_date,
       receipt_no, method, recorded_by, source_table, source_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ledgerId,
      module,
      referenceType,
      referenceId,
      entityId,
      amt,
      paymentDate,
      receiptNo,
      method,
      recordedBy,
      sourceTable,
      sourceId,
      notes,
    ]
  );

  return ledgerId;
}

async function listLedger({ module, entityId, dateFrom, dateTo, page = 1, limit = 50 }) {
  const conditions = [];
  const params = [];
  if (module) {
    conditions.push('module = ?');
    params.push(module);
  }
  if (entityId) {
    conditions.push('entity_id = ?');
    params.push(entityId);
  }
  if (dateFrom) {
    conditions.push('payment_date >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('payment_date <= ?');
    params.push(dateTo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 50));
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (safePage - 1) * safeLimit;

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS total_amount FROM payment_ledger ${where}`,
    params
  );
  const [rows] = await pool.execute(
    `SELECT * FROM payment_ledger ${where} ORDER BY payment_date DESC, created_at DESC LIMIT ${safeLimit} OFFSET ${offset}`,
    params
  );

  return {
    data: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: countRows[0]?.total || 0,
      totalPages: Math.max(1, Math.ceil((countRows[0]?.total || 0) / safeLimit)),
    },
    summary: {
      total_amount: parseFloat(countRows[0]?.total_amount || 0),
    },
  };
}

module.exports = { recordLedgerEntry, listLedger };
