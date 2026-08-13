const pool = require('../../config/database');
const { parsePagination } = require('./accountsRepository');

/**
 * Waterworks billing & payments lists (Phase 5).
 */

async function listBills(query = {}) {
  const { supply_id, billing_month, billing_year, status } = query;
  const { page, limit, offset } = parsePagination(query);

  let where = 'WHERE 1=1';
  const params = [];

  if (supply_id) {
    where += ' AND a.supply_id = ?';
    params.push(supply_id);
  }
  if (billing_month) {
    where += ' AND b.billing_month = ?';
    params.push(parseInt(billing_month, 10));
  }
  if (billing_year) {
    where += ' AND b.billing_year = ?';
    params.push(parseInt(billing_year, 10));
  }
  if (status) {
    where += ' AND b.status = ?';
    params.push(status);
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM ww_bills b
     JOIN ww_consumer_accounts a ON a.account_id = b.account_id ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.execute(
    `SELECT b.*, a.account_number, a.consumer_name, a.supply_id, s.supply_name,
      s.reading_day_from, s.reading_day_to, s.billing_day,
      COALESCE((SELECT SUM(amount_paid) FROM ww_payments p WHERE p.bill_id = b.bill_id), 0) AS total_paid
     FROM ww_bills b
     JOIN ww_consumer_accounts a ON a.account_id = b.account_id
     JOIN ww_water_supplies s ON s.supply_id = a.supply_id
     ${where}
     ORDER BY b.billing_year DESC, b.billing_month DESC, a.account_number ASC
     LIMIT ${offset}, ${limit}`,
    params
  );

  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

async function listPayments(query = {}) {
  const { supply_id, date_from, date_to, account_id } = query;
  const { page, limit, offset } = parsePagination(query);

  let where = 'WHERE 1=1';
  const params = [];

  if (supply_id) {
    where += ' AND a.supply_id = ?';
    params.push(supply_id);
  }
  if (account_id) {
    where += ' AND p.account_id = ?';
    params.push(account_id);
  }
  if (date_from) {
    where += ' AND p.payment_date >= ?';
    params.push(date_from);
  }
  if (date_to) {
    where += ' AND p.payment_date <= ?';
    params.push(date_to);
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM ww_payments p
     JOIN ww_consumer_accounts a ON a.account_id = p.account_id ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.execute(
    `SELECT p.*, a.account_number, a.consumer_name, s.supply_name, u.full_name AS recorded_by_name,
            b.billing_month, b.billing_year
     FROM ww_payments p
     JOIN ww_consumer_accounts a ON a.account_id = p.account_id
     JOIN ww_water_supplies s ON s.supply_id = a.supply_id
     LEFT JOIN users u ON u.user_id = p.recorded_by
     LEFT JOIN ww_bills b ON b.bill_id = p.bill_id
     ${where}
     ORDER BY p.payment_date DESC, p.created_at DESC
     LIMIT ${offset}, ${limit}`,
    params
  );

  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

async function getBillingSurchargeSettings(connection) {
  const [rows] = await connection.query(`
    SELECT setting_key, setting_value
    FROM system_settings
    WHERE setting_key IN ('ww_billing_surcharge_enabled', 'ww_billing_surcharge_percentage')
  `);

  const map = {};
  rows.forEach((row) => {
    map[row.setting_key] = row.setting_value;
  });

  const enabled = map.ww_billing_surcharge_enabled !== 'false';
  const parsedPercentage = parseFloat(map.ww_billing_surcharge_percentage);
  const percentage = Number.isFinite(parsedPercentage)
    ? Math.max(0, Math.min(100, parsedPercentage))
    : 10;

  return { enabled, percentage, rate: percentage / 100 };
}

async function getAccountOutstandingBalance(connection, accountId) {
  const [accounts] = await connection.query(
    'SELECT unpaid_dues FROM ww_consumer_accounts WHERE account_id = ?',
    [accountId]
  );
  const openingDues = parseFloat(accounts[0]?.unpaid_dues) || 0;

  const [rows] = await connection.query(
    `
    SELECT b.bill_id, b.total_due, COALESCE(SUM(p.amount_paid), 0) AS total_paid
    FROM ww_bills b
    LEFT JOIN ww_payments p ON p.bill_id = b.bill_id
    WHERE b.account_id = ? AND b.status IN ('unpaid', 'partial')
    GROUP BY b.bill_id, b.total_due
  `,
    [accountId]
  );

  let billBalance = 0;
  for (const row of rows) {
    billBalance += parseFloat(row.total_due) - parseFloat(row.total_paid);
  }

  return Math.max(0, parseFloat((billBalance + openingDues).toFixed(2)));
}

async function updateBillStatus(connection, billId) {
  const [bills] = await connection.query('SELECT total_due FROM ww_bills WHERE bill_id = ?', [billId]);
  if (!bills.length) return;

  const [payments] = await connection.query(
    'SELECT COALESCE(SUM(amount_paid), 0) AS total FROM ww_payments WHERE bill_id = ?',
    [billId]
  );

  const totalPaid = parseFloat(payments[0].total) || 0;
  const totalDue = parseFloat(bills[0].total_due) || 0;
  let status = 'unpaid';
  if (totalPaid >= totalDue) status = 'paid';
  else if (totalPaid > 0) status = 'partial';

  await connection.query('UPDATE ww_bills SET status = ? WHERE bill_id = ?', [status, billId]);
}

async function findAccountForPayment(accountId) {
  const [rows] = await pool.execute(
    'SELECT account_id, entity_id FROM ww_consumer_accounts WHERE account_id = ?',
    [accountId]
  );
  return rows[0] || null;
}

module.exports = {
  listBills,
  listPayments,
  getBillingSurchargeSettings,
  getAccountOutstandingBalance,
  updateBillStatus,
  findAccountForPayment,
};
