const pool = require('../../config/database');

const ACCOUNT_SELECT = `SELECT a.*, s.supply_name, s.supply_code, e.entity_name AS linked_entity_name`;
const ACCOUNT_FROM = `FROM ww_consumer_accounts a
       JOIN ww_water_supplies s ON s.supply_id = a.supply_id
       LEFT JOIN entities e ON e.entity_id = a.entity_id`;

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

async function listAccounts(query = {}) {
  const { supply_id, status, search } = query;
  const { page, limit, offset } = parsePagination(query);

  let where = 'WHERE 1=1';
  const params = [];

  if (supply_id) {
    where += ' AND a.supply_id = ?';
    params.push(supply_id);
  }
  if (status) {
    where += ' AND a.status = ?';
    params.push(status);
  }
  if (search) {
    where +=
      ' AND (a.account_number LIKE ? OR a.consumer_name LIKE ? OR a.meter_number LIKE ? OR a.address LIKE ? OR e.entity_name LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM ww_consumer_accounts a
     LEFT JOIN entities e ON e.entity_id = a.entity_id
     ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.execute(
    `${ACCOUNT_SELECT}
     ${ACCOUNT_FROM}
     ${where}
     ORDER BY a.account_number ASC
     LIMIT ${offset}, ${limit}`,
    params
  );

  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

async function getAccountById(accountId) {
  const [rows] = await pool.execute(
    `${ACCOUNT_SELECT}, s.rate_per_cubic_meter, s.minimum_charge
     ${ACCOUNT_FROM}
     WHERE a.account_id = ?`,
    [accountId]
  );
  return rows[0] || null;
}

async function listReadings(query = {}) {
  const { supply_id, status, period_month, period_year, account_id } = query;
  const { page, limit, offset } = parsePagination(query);

  let where = 'WHERE 1=1';
  const params = [];

  if (supply_id) {
    where += ' AND a.supply_id = ?';
    params.push(supply_id);
  }
  if (status) {
    where += ' AND r.status = ?';
    params.push(status);
  }
  if (period_month) {
    where += ' AND r.reading_period_month = ?';
    params.push(parseInt(period_month, 10));
  }
  if (period_year) {
    where += ' AND r.reading_period_year = ?';
    params.push(parseInt(period_year, 10));
  }
  if (account_id) {
    where += ' AND r.account_id = ?';
    params.push(account_id);
  }

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM ww_meter_readings r
     JOIN ww_consumer_accounts a ON a.account_id = r.account_id
     ${where}`,
    params
  );
  const total = countRows[0]?.total || 0;

  const [rows] = await pool.execute(
    `SELECT r.*, a.account_number, a.consumer_name, a.meter_number, a.supply_id,
            s.supply_name, u.full_name AS recorded_by_name
     FROM ww_meter_readings r
     JOIN ww_consumer_accounts a ON a.account_id = r.account_id
     JOIN ww_water_supplies s ON s.supply_id = a.supply_id
     LEFT JOIN users u ON u.user_id = r.recorded_by
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ${offset}, ${limit}`,
    params
  );

  return {
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

module.exports = {
  ACCOUNT_SELECT,
  ACCOUNT_FROM,
  parsePagination,
  listAccounts,
  getAccountById,
  listReadings,
};
