const pool = require('../../config/database');
const { generateId, ID_PREFIXES } = require('../../utils/idGenerator');

/**
 * Citations data access (Phase 4–5 domain extract).
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

function parseDate(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  return dateValue;
}

function generateTicketNumber() {
  const prefix = 'DG-' + new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return prefix + '-' + random;
}

async function listCitations(query = {}) {
  const { status, dateFrom, dateTo, plateNumber, driverName, enforcerId } = query;
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const limitNum = Math.min(10000, Math.max(1, parseInt(query.limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  let whereSQL = '';
  const params = [];

  if (status && status !== 'all') {
    if (status === 'Partial') {
      whereSQL +=
        (whereSQL ? ' AND ' : ' WHERE ') +
        `c.payment_status IN ('Partially Paid', 'Installment', 'Partial')`;
    } else if (status === 'Paid') {
      // Paid reports include partially paid tickets
      whereSQL +=
        (whereSQL ? ' AND ' : ' WHERE ') +
        `c.payment_status IN ('Paid', 'Partially Paid', 'Installment', 'Partial')`;
    } else {
      whereSQL += (whereSQL ? ' AND ' : ' WHERE ') + 'c.payment_status = ?';
      params.push(status);
    }
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
     LEFT JOIN (
       SELECT citation_id,
              GROUP_CONCAT(DISTINCT NULLIF(TRIM(receipt_number), '') ORDER BY payment_date SEPARATOR ', ') as receipt_number
       FROM citation_payments
       GROUP BY citation_id
     ) cr ON cr.citation_id = c.citation_id
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

async function createCitation(body, userId) {
  const {
    ticketNumber,
    driverName,
    driverAddress,
    driverContact,
    licenseNumber,
    licenseExpiry,
    vehicleType,
    vehicleColor,
    plateNumber,
    vehicleRegistration,
    vehicleOwner,
    ownerName,
    ownerAddress,
    ownerContact,
    violations,
    otherViolations,
    violationLocation,
    placeViolation,
    violationTime,
    violationDate,
    remarks,
    fineAmount,
    paymentStatus,
    enforcerId,
    enforcerName,
    enforcerBadge,
    enforcerSignature,
    witnessName,
    witnessSignature,
    supervisorName,
    supervisorSignature,
    sealStamp,
    isCompleted,
  } = body;

  const citationId = generateId(ID_PREFIXES.CITATION);
  const finalTicketNumber = ticketNumber || generateTicketNumber();

  let resolvedEnforcerName = enforcerName || null;
  let resolvedEnforcerBadge = enforcerBadge || null;
  if (enforcerId && (!resolvedEnforcerName || !resolvedEnforcerBadge)) {
    try {
      const [enforcerRows] = await pool.execute(
        'SELECT full_name, badge_number FROM enforcers WHERE enforcer_id = ?',
        [enforcerId]
      );
      if (enforcerRows.length > 0) {
        resolvedEnforcerName = resolvedEnforcerName || enforcerRows[0].full_name;
        resolvedEnforcerBadge = resolvedEnforcerBadge || enforcerRows[0].badge_number;
      }
    } catch (_) { /* optional */ }
  }

  const location = violationLocation || placeViolation || null;

  await pool.execute(
    `INSERT INTO citations (
      citation_id, ticket_number, driver_name, driver_address, driver_contact,
      license_number, license_expiry, vehicle_type, vehicle_color, plate_number,
      vehicle_registration, vehicle_owner, owner_name, owner_address, owner_contact,
      violations, other_violations, violation_location, violation_time, violation_date,
      remarks, fine_amount, payment_status, enforcer_id, enforcer_name, enforcer_badge,
      enforcer_signature, witness_name, witness_signature, supervisor_name,
      supervisor_signature, seal_stamp, is_completed, issued_by_user_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      citationId,
      finalTicketNumber,
      driverName || null,
      driverAddress || null,
      driverContact || null,
      licenseNumber || null,
      parseDate(licenseExpiry),
      vehicleType || null,
      vehicleColor || null,
      plateNumber || null,
      vehicleRegistration || null,
      vehicleOwner || null,
      ownerName || null,
      ownerAddress || null,
      ownerContact || null,
      JSON.stringify(violations || []),
      otherViolations || null,
      location,
      violationTime || null,
      parseDate(violationDate),
      remarks || null,
      fineAmount || 0,
      paymentStatus || 'Pending',
      enforcerId || null,
      resolvedEnforcerName,
      resolvedEnforcerBadge,
      enforcerSignature || null,
      witnessName || null,
      witnessSignature || null,
      supervisorName || null,
      supervisorSignature || null,
      sealStamp || null,
      isCompleted || false,
      userId,
    ]
  );

  if (enforcerId) {
    const fineAmountNum = parseFloat(fineAmount) || 0;
    await pool.execute(
      `UPDATE enforcers SET citations_issued = citations_issued + 1, total_fines = total_fines + ? WHERE enforcer_id = ?`,
      [fineAmountNum, enforcerId]
    );
  }

  return { citation_id: citationId, ticket_number: finalTicketNumber };
}

async function findById(citationId) {
  const [rows] = await pool.execute('SELECT * FROM citations WHERE citation_id = ?', [citationId]);
  return rows[0] || null;
}

async function insertPayment({
  paymentId,
  citationId,
  amountPaid,
  paymentMethod,
  receiptNumber,
  notes,
  paymentDate,
}) {
  await pool.execute(
    `INSERT INTO citation_payments (
      payment_id, citation_id, amount_paid, payment_method, receipt_number, notes, payment_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      citationId,
      amountPaid,
      paymentMethod,
      receiptNumber || null,
      notes || null,
      paymentDate,
    ]
  );
}

async function getTotalPaid(citationId) {
  const [rows] = await pool.execute(
    'SELECT SUM(amount_paid) AS total_paid FROM citation_payments WHERE citation_id = ?',
    [citationId]
  );
  return parseFloat(rows[0]?.total_paid) || 0;
}

async function updatePaymentStatus(citationId, status) {
  await pool.execute(
    'UPDATE citations SET payment_status = ?, updated_at = NOW() WHERE citation_id = ?',
    [status, citationId]
  );
}

async function findPayment(paymentId, citationId) {
  const [rows] = await pool.execute(
    'SELECT * FROM citation_payments WHERE payment_id = ? AND citation_id = ?',
    [paymentId, citationId]
  );
  return rows[0] || null;
}

async function updatePaymentFields(paymentId, citationId, fields, values) {
  await pool.execute(
    `UPDATE citation_payments SET ${fields.join(', ')} WHERE payment_id = ? AND citation_id = ?`,
    [...values, paymentId, citationId]
  );
}

module.exports = {
  listCitations,
  parseViolations,
  createCitation,
  parseDate,
  generateTicketNumber,
  findById,
  insertPayment,
  getTotalPaid,
  updatePaymentStatus,
  findPayment,
  updatePaymentFields,
};
