const pool = require('../../config/database');

/**
 * Citations data access (Phase 4 domain extract).
 */

function parseViolations(row) {
  if (row.violations && typeof row.violations === 'string') {
    try {
      row.violations = JSON.parse(row.violations);
    } catch {
      row.violations = [];
    }
  }
  return row;
}

async function listCitations(query = {}) {
  const { status, dateFrom, dateTo, plateNumber, driverName, enforcerId } = query;
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const limitNum = Math.min(10000, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  let whereSQL = '';
  const params = [];

  if (status && status !== 'all') {
    whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.payment_status = ?';
    params.push(status);
  }
  if (plateNumber && String(plateNumber).trim()) {
    whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.plate_number LIKE ?';
    params.push(`%${String(plateNumber).trim()}%`);
  }
  if (driverName && String(driverName).trim()) {
    whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.driver_name LIKE ?';
    params.push(`%${String(driverName).trim()}%`);
  }
  if (dateFrom) {
    whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.violation_date >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.violation_date <= ?';
    params.push(dateTo);
  }
  if (enforcerId) {
    whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.enforcer_id = ?';
    params.push(enforcerId);
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) as total FROM citations c${whereSQL}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.execute(
    `SELECT c.citation_id, c.ticket_number, c.driver_name, c.plate_number,
            c.violation_date, c.fine_amount, c.is_completed,
            c.violations, c.created_at, COALESCE(u.full_name, 'Unknown') as issued_by_name,
            COALESCE(c.enforcer_name, e.full_name) as enforcer_name,
            c.driver_address, c.violation_location, c.violation_time,
            COALESCE(cp.total_paid, 0) as total_paid,
            CASE
              WHEN COALESCE(cp.total_paid, 0) <= 0 THEN
                CASE WHEN c.payment_status = 'Paid' THEN 'Pending' ELSE c.payment_status END
              WHEN COALESCE(cp.total_paid, 0) >= c.fine_amount THEN 'Paid'
              ELSE 'Partially Paid'
            END as payment_status,
            cr.receipt_number
     FROM citations c
     LEFT JOIN users u ON c.issued_by_user_id = u.user_id
     LEFT JOIN enforcers e ON c.enforcer_id = e.enforcer_id
     LEFT JOIN (SELECT citation_id, SUM(amount_paid) as total_paid FROM citation_payments GROUP BY citation_id) cp ON cp.citation_id = c.citation_id
     LEFT JOIN (SELECT citation_id, MAX(receipt_number) as receipt_number FROM citation_payments GROUP BY citation_id) cr ON cr.citation_id = c.citation_id
     ${whereSQL}
     ORDER BY c.created_at DESC
     LIMIT ${limitNum} OFFSET ${offset}`,
    params
  );

  return {
    data: (rows || []).map(parseViolations),
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 },
  };
}

module.exports = { listCitations, parseViolations };
