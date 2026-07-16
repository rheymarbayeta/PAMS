const pool = require('../../config/database');

/**
 * Price monitoring / markets data access (Phase 4 domain extract).
 */

async function listPriceRecords({ commodity_id, market_id, date_from, date_to, limit = 100 } = {}) {
  let sql = `SELECT pr.*, com.commodity_name, com.unit, cat.category_name,
               mkt.market_name, u.full_name as recorder_name
             FROM pm_price_records pr
             JOIN pm_commodities com ON com.commodity_id = pr.commodity_id
             JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
             JOIN pm_markets mkt ON mkt.market_id = pr.market_id
             LEFT JOIN users u ON u.user_id = pr.recorder_id`;
  const params = [];
  const where = [];
  if (commodity_id) {
    where.push('pr.commodity_id = ?');
    params.push(commodity_id);
  }
  if (market_id) {
    where.push('pr.market_id = ?');
    params.push(market_id);
  }
  if (date_from) {
    where.push('pr.recorded_date >= ?');
    params.push(date_from);
  }
  if (date_to) {
    where.push('pr.recorded_date <= ?');
    params.push(date_to);
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  const safeLimit = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
  sql += ` ORDER BY pr.recorded_date DESC, pr.created_at DESC LIMIT ${safeLimit}`;
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function listCommodities() {
  const [rows] = await pool.execute(
    `SELECT c.*, cat.category_name
     FROM pm_commodities c
     LEFT JOIN pm_commodity_categories cat ON cat.category_id = c.category_id
     ORDER BY c.commodity_name ASC`
  );
  return rows;
}

async function listMarkets() {
  const [rows] = await pool.execute('SELECT * FROM pm_markets ORDER BY market_name ASC');
  return rows;
}

module.exports = { listPriceRecords, listCommodities, listMarkets };
