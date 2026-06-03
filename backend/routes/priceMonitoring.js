const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId } = require('../utils/idGenerator');

const router = express.Router();
router.use(authenticate);

// ─── ID helpers ────────────────────────────────────────────────────────────────
const PM = {
  CATEGORY: 'pmcat',
  COMMODITY: 'pmcom',
  MARKET: 'pmmkt',
  RECORD: 'pmrec',
  ALERT: 'pmalert',
  TRIGGER: 'pmtrig',
};

function pmId(prefix) {
  const { randomBytes } = require('crypto');
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

// ─── UTILITY: Run migrations on first use ─────────────────────────────────────
async function ensureTables() {
  const createStatements = [
    `CREATE TABLE IF NOT EXISTS pm_commodity_categories (
       category_id VARCHAR(64) PRIMARY KEY,
       category_name VARCHAR(100) NOT NULL UNIQUE,
       description TEXT,
       icon VARCHAR(50) DEFAULT 'tag',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS pm_commodities (
       commodity_id VARCHAR(64) PRIMARY KEY,
       category_id VARCHAR(64) NOT NULL,
       commodity_name VARCHAR(150) NOT NULL,
       unit VARCHAR(50) NOT NULL,
       description TEXT,
       is_active TINYINT(1) DEFAULT 1,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       FOREIGN KEY (category_id) REFERENCES pm_commodity_categories(category_id) ON DELETE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS pm_markets (
       market_id VARCHAR(64) PRIMARY KEY,
       market_name VARCHAR(150) NOT NULL,
       barangay VARCHAR(100),
       address TEXT,
       market_type ENUM('public_market','supermarket','grocery','sari_sari','wet_market','other') DEFAULT 'public_market',
       is_active TINYINT(1) DEFAULT 1,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS pm_price_records (
       record_id VARCHAR(64) PRIMARY KEY,
       commodity_id VARCHAR(64) NOT NULL,
       market_id VARCHAR(64) NOT NULL,
       price DECIMAL(10,2) NOT NULL,
       recorded_date DATE NOT NULL,
       recorder_id VARCHAR(64) NOT NULL,
       notes TEXT,
       source ENUM('field_survey','market_report','official_bulletin','other') DEFAULT 'field_survey',
       is_verified TINYINT(1) DEFAULT 0,
       verified_by VARCHAR(64),
       verified_at TIMESTAMP NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       FOREIGN KEY (commodity_id) REFERENCES pm_commodities(commodity_id) ON DELETE CASCADE,
       FOREIGN KEY (market_id) REFERENCES pm_markets(market_id) ON DELETE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS pm_price_alerts (
       alert_id VARCHAR(64) PRIMARY KEY,
       alert_name VARCHAR(150) NOT NULL,
       commodity_id VARCHAR(64) NOT NULL,
       market_id VARCHAR(64),
       alert_type ENUM('above','below','change_pct') NOT NULL,
       threshold_value DECIMAL(10,2) NOT NULL,
       is_active TINYINT(1) DEFAULT 1,
       notify_roles TEXT,
       last_triggered_at TIMESTAMP NULL,
       created_by VARCHAR(64) NOT NULL,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       FOREIGN KEY (commodity_id) REFERENCES pm_commodities(commodity_id) ON DELETE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS pm_alert_triggers (
       trigger_id VARCHAR(64) PRIMARY KEY,
       alert_id VARCHAR(64) NOT NULL,
       record_id VARCHAR(64) NOT NULL,
       triggered_price DECIMAL(10,2) NOT NULL,
       triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (alert_id) REFERENCES pm_price_alerts(alert_id) ON DELETE CASCADE,
       FOREIGN KEY (record_id) REFERENCES pm_price_records(record_id) ON DELETE CASCADE
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];

  for (const sql of createStatements) {
    await pool.execute(sql);
  }

  // Seed default categories if empty
  const [cats] = await pool.execute('SELECT COUNT(*) as cnt FROM pm_commodity_categories');
  if (cats[0].cnt === 0) {
    const seedCats = [
      ['pmcat_rice_grains', 'Rice & Grains', 'Rice, corn, and other grain products'],
      ['pmcat_meat', 'Meat & Poultry', 'Pork, chicken, beef, and other meats'],
      ['pmcat_fish_seafood', 'Fish & Seafood', 'Fresh and dried fish, shellfish'],
      ['pmcat_vegetables', 'Vegetables', 'Fresh vegetables and leafy greens'],
      ['pmcat_fruits', 'Fruits', 'Fresh and seasonal fruits'],
      ['pmcat_dairy_eggs', 'Dairy & Eggs', 'Eggs, milk, and dairy products'],
      ['pmcat_cooking_oil', 'Cooking Oil & Condiments', 'Oil, vinegar, soy sauce'],
      ['pmcat_fuel', 'Fuel & Energy', 'Gasoline, diesel, LPG'],
      ['pmcat_construction', 'Construction Materials', 'Cement, sand, gravel, steel'],
      ['pmcat_other', 'Other Commodities', 'Other monitored goods'],
    ];
    for (const [id, name, desc] of seedCats) {
      await pool.execute(
        'INSERT IGNORE INTO pm_commodity_categories (category_id, category_name, description) VALUES (?,?,?)',
        [id, name, desc]
      );
    }

    const seedComs = [
      ['pmcom_rice_wlnd', 'pmcat_rice_grains', 'Rice - Well Milled', 'kg'],
      ['pmcom_rice_reg', 'pmcat_rice_grains', 'Rice - Regular Milled', 'kg'],
      ['pmcom_rice_spec', 'pmcat_rice_grains', 'Rice - Special/Premium', 'kg'],
      ['pmcom_pork_kasim', 'pmcat_meat', 'Pork - Kasim (Shoulder)', 'kg'],
      ['pmcom_pork_liempo', 'pmcat_meat', 'Pork - Liempo (Belly)', 'kg'],
      ['pmcom_chicken_whole', 'pmcat_meat', 'Chicken - Whole', 'kg'],
      ['pmcom_bangus', 'pmcat_fish_seafood', 'Bangus (Milkfish)', 'kg'],
      ['pmcom_tilapia', 'pmcat_fish_seafood', 'Tilapia', 'kg'],
      ['pmcom_galunggong', 'pmcat_fish_seafood', 'Galunggong (Round Scad)', 'kg'],
      ['pmcom_ampalaya', 'pmcat_vegetables', 'Ampalaya (Bitter Gourd)', 'kg'],
      ['pmcom_tomato', 'pmcat_vegetables', 'Tomato', 'kg'],
      ['pmcom_onion_red', 'pmcat_vegetables', 'Red Onion', 'kg'],
      ['pmcom_garlic', 'pmcat_vegetables', 'Garlic', 'kg'],
      ['pmcom_banana', 'pmcat_fruits', 'Banana - Lakatan', 'kg'],
      ['pmcom_mango', 'pmcat_fruits', 'Mango - Carabao', 'kg'],
      ['pmcom_eggs_medium', 'pmcat_dairy_eggs', 'Eggs - Medium', 'piece'],
      ['pmcom_cooking_oil', 'pmcat_cooking_oil', 'Cooking Oil - Refined', 'liter'],
      ['pmcom_lpg_11', 'pmcat_fuel', 'LPG 11kg Cylinder', 'cylinder'],
      ['pmcom_gasoline95', 'pmcat_fuel', 'Gasoline - RON 95', 'liter'],
      ['pmcom_diesel', 'pmcat_fuel', 'Diesel', 'liter'],
    ];
    for (const [id, catId, name, unit] of seedComs) {
      await pool.execute(
        'INSERT IGNORE INTO pm_commodities (commodity_id, category_id, commodity_name, unit) VALUES (?,?,?,?)',
        [id, catId, name, unit]
      );
    }

    await pool.execute(
      `INSERT IGNORE INTO pm_markets (market_id, market_name, barangay, market_type) VALUES
       ('pmmkt_dalaguete_central','Dalaguete Public Market','Poblacion','public_market'),
       ('pmmkt_dalaguete_wet','Dalaguete Wet Market','Poblacion','wet_market')`
    );
  }
}

// Run migration on module load
ensureTables().catch(err => console.error('Price monitoring table init error:', err));

// ─────────────────────────────────────────────────────────────────────────────
// AI ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function computeLinearTrend(prices) {
  const n = prices.length;
  if (n < 2) return { slope: 0, intercept: prices[0] || 0, r2: 0 };
  const xMean = (n - 1) / 2;
  const yMean = prices.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (prices[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  // R²
  const ssTot = prices.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = prices.reduce((s, y, i) => s + (y - (slope * i + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function movingAverage(prices, window = 3) {
  return prices.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = prices.slice(start, i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

function detectAnomalies(prices, threshold = 2.0) {
  if (prices.length < 3) return prices.map(() => false);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const std = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length);
  return prices.map(p => std > 0 && Math.abs(p - mean) > threshold * std);
}

function forecastNext(prices, steps = 3) {
  const { slope, intercept } = computeLinearTrend(prices);
  const n = prices.length;
  return Array.from({ length: steps }, (_, i) => Math.max(0, slope * (n + i) + intercept));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMODITY CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT c.*, COUNT(com.commodity_id) as commodity_count
       FROM pm_commodity_categories c
       LEFT JOIN pm_commodities com ON com.category_id = c.category_id
       GROUP BY c.category_id ORDER BY c.category_name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/categories', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_name, description } = req.body;
    if (!category_name) return res.status(400).json({ error: 'Category name is required' });
    const id = pmId(PM.CATEGORY);
    await pool.execute(
      'INSERT INTO pm_commodity_categories (category_id, category_name, description) VALUES (?,?,?)',
      [id, category_name, description || null]
    );
    await logAction(req.user.user_id, 'CREATE_PM_CATEGORY', `Created price monitoring category: ${category_name}`);
    res.status(201).json({ category_id: id, category_name, description });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Category name already exists' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/categories/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_name, description } = req.body;
    if (!category_name) return res.status(400).json({ error: 'Category name is required' });
    const [r] = await pool.execute(
      'UPDATE pm_commodity_categories SET category_name=?, description=? WHERE category_id=?',
      [category_name, description || null, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    await logAction(req.user.user_id, 'UPDATE_PM_CATEGORY', `Updated price monitoring category: ${category_name}`);
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/categories/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const [r] = await pool.execute(
      'DELETE FROM pm_commodity_categories WHERE category_id=?', [req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Category not found' });
    await logAction(req.user.user_id, 'DELETE_PM_CATEGORY', `Deleted price monitoring category ${req.params.id}`);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COMMODITIES
// ─────────────────────────────────────────────────────────────────────────────
router.get('/commodities', async (req, res) => {
  try {
    const { category_id, active } = req.query;
    let sql = `SELECT com.*, cat.category_name,
                 (SELECT price FROM pm_price_records pr WHERE pr.commodity_id = com.commodity_id
                  ORDER BY recorded_date DESC, created_at DESC LIMIT 1) as latest_price,
                 (SELECT recorded_date FROM pm_price_records pr WHERE pr.commodity_id = com.commodity_id
                  ORDER BY recorded_date DESC, created_at DESC LIMIT 1) as latest_date
               FROM pm_commodities com
               JOIN pm_commodity_categories cat ON cat.category_id = com.category_id`;
    const params = [];
    const where = [];
    if (category_id) { where.push('com.category_id = ?'); params.push(category_id); }
    if (active !== undefined) { where.push('com.is_active = ?'); params.push(active === 'true' ? 1 : 0); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY cat.category_name, com.commodity_name';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/commodities', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_id, commodity_name, unit, description } = req.body;
    if (!category_id || !commodity_name || !unit)
      return res.status(400).json({ error: 'category_id, commodity_name, and unit are required' });
    const id = pmId(PM.COMMODITY);
    await pool.execute(
      'INSERT INTO pm_commodities (commodity_id, category_id, commodity_name, unit, description) VALUES (?,?,?,?,?)',
      [id, category_id, commodity_name, unit, description || null]
    );
    await logAction(req.user.user_id, 'CREATE_PM_COMMODITY', `Created commodity: ${commodity_name}`);
    res.status(201).json({ commodity_id: id, category_id, commodity_name, unit, description });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Commodity already exists in this category' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/commodities/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { category_id, commodity_name, unit, description, is_active } = req.body;
    const [r] = await pool.execute(
      'UPDATE pm_commodities SET category_id=?, commodity_name=?, unit=?, description=?, is_active=? WHERE commodity_id=?',
      [category_id, commodity_name, unit, description || null, is_active !== undefined ? is_active : 1, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Commodity not found' });
    await logAction(req.user.user_id, 'UPDATE_PM_COMMODITY', `Updated commodity: ${commodity_name}`);
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/commodities/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const [r] = await pool.execute('DELETE FROM pm_commodities WHERE commodity_id=?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Commodity not found' });
    await logAction(req.user.user_id, 'DELETE_PM_COMMODITY', `Deleted commodity ${req.params.id}`);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MARKETS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/markets', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM pm_markets ORDER BY market_name'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/markets', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { market_name, barangay, address, market_type } = req.body;
    if (!market_name) return res.status(400).json({ error: 'Market name is required' });
    const id = pmId(PM.MARKET);
    await pool.execute(
      'INSERT INTO pm_markets (market_id, market_name, barangay, address, market_type) VALUES (?,?,?,?,?)',
      [id, market_name, barangay || null, address || null, market_type || 'public_market']
    );
    await logAction(req.user.user_id, 'CREATE_PM_MARKET', `Created market: ${market_name}`);
    res.status(201).json({ market_id: id, market_name, barangay, address, market_type });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/markets/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { market_name, barangay, address, market_type, is_active } = req.body;
    const [r] = await pool.execute(
      'UPDATE pm_markets SET market_name=?, barangay=?, address=?, market_type=?, is_active=? WHERE market_id=?',
      [market_name, barangay || null, address || null, market_type || 'public_market', is_active !== undefined ? is_active : 1, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Market not found' });
    await logAction(req.user.user_id, 'UPDATE_PM_MARKET', `Updated market: ${market_name}`);
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/markets/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const [r] = await pool.execute('DELETE FROM pm_markets WHERE market_id=?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Market not found' });
    await logAction(req.user.user_id, 'DELETE_PM_MARKET', `Deleted market ${req.params.id}`);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICE RECORDS
// ─────────────────────────────────────────────────────────────────────────────
router.get('/records', async (req, res) => {
  try {
    const { commodity_id, market_id, date_from, date_to, limit = 100 } = req.query;
    let sql = `SELECT pr.*, com.commodity_name, com.unit, cat.category_name,
                 mkt.market_name, u.full_name as recorder_name
               FROM pm_price_records pr
               JOIN pm_commodities com ON com.commodity_id = pr.commodity_id
               JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
               JOIN pm_markets mkt ON mkt.market_id = pr.market_id
               LEFT JOIN users u ON u.user_id = pr.recorder_id`;
    const params = [];
    const where = [];
    if (commodity_id) { where.push('pr.commodity_id = ?'); params.push(commodity_id); }
    if (market_id) { where.push('pr.market_id = ?'); params.push(market_id); }
    if (date_from) { where.push('pr.recorded_date >= ?'); params.push(date_from); }
    if (date_to) { where.push('pr.recorded_date <= ?'); params.push(date_to); }
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ` ORDER BY pr.recorded_date DESC, pr.created_at DESC LIMIT ${parseInt(limit)}`;
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/records', async (req, res) => {
  try {
    const { commodity_id, market_id, price, recorded_date, notes, source } = req.body;
    if (!commodity_id || !market_id || price === undefined || !recorded_date)
      return res.status(400).json({ error: 'commodity_id, market_id, price, and recorded_date are required' });
    if (isNaN(parseFloat(price)) || parseFloat(price) < 0)
      return res.status(400).json({ error: 'Price must be a non-negative number' });

    const id = pmId(PM.RECORD);
    await pool.execute(
      `INSERT INTO pm_price_records (record_id, commodity_id, market_id, price, recorded_date, recorder_id, notes, source)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, commodity_id, market_id, parseFloat(price), recorded_date, req.user.user_id, notes || null, source || 'field_survey']
    );

    // Check alerts
    await checkAlertsForRecord({ record_id: id, commodity_id, market_id, price: parseFloat(price), recorded_date });

    await logAction(req.user.user_id, 'CREATE_PM_PRICE_RECORD', `Recorded price for commodity ${commodity_id}: ₱${price}`);
    res.status(201).json({ record_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/records/:id/verify', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const [r] = await pool.execute(
      'UPDATE pm_price_records SET is_verified=1, verified_by=?, verified_at=NOW() WHERE record_id=?',
      [req.user.user_id, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });
    res.json({ message: 'Record verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/records/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const [r] = await pool.execute('DELETE FROM pm_price_records WHERE record_id=?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Record not found' });
    await logAction(req.user.user_id, 'DELETE_PM_PRICE_RECORD', `Deleted price record ${req.params.id}`);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICE ALERTS
// ─────────────────────────────────────────────────────────────────────────────
async function checkAlertsForRecord({ record_id, commodity_id, market_id, price, recorded_date }) {
  try {
    const [alerts] = await pool.execute(
      `SELECT * FROM pm_price_alerts WHERE commodity_id=? AND is_active=1
       AND (market_id IS NULL OR market_id=?)`,
      [commodity_id, market_id]
    );

    for (const alert of alerts) {
      let triggered = false;
      if (alert.alert_type === 'above' && price > parseFloat(alert.threshold_value)) triggered = true;
      if (alert.alert_type === 'below' && price < parseFloat(alert.threshold_value)) triggered = true;
      if (alert.alert_type === 'change_pct') {
        // Get previous price
        const [prev] = await pool.execute(
          `SELECT price FROM pm_price_records
           WHERE commodity_id=? AND market_id=? AND recorded_date < ? AND record_id != ?
           ORDER BY recorded_date DESC LIMIT 1`,
          [commodity_id, market_id, recorded_date, record_id]
        );
        if (prev.length > 0) {
          const pct = Math.abs((price - parseFloat(prev[0].price)) / parseFloat(prev[0].price)) * 100;
          if (pct >= parseFloat(alert.threshold_value)) triggered = true;
        }
      }

      if (triggered) {
        const triggerId = pmId(PM.TRIGGER);
        await pool.execute(
          'INSERT INTO pm_alert_triggers (trigger_id, alert_id, record_id, triggered_price) VALUES (?,?,?,?)',
          [triggerId, alert.alert_id, record_id, price]
        );
        await pool.execute(
          'UPDATE pm_price_alerts SET last_triggered_at=NOW() WHERE alert_id=?',
          [alert.alert_id]
        );
      }
    }
  } catch (err) {
    console.error('Alert check error:', err);
  }
}

router.get('/alerts', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, com.commodity_name, com.unit, mkt.market_name,
         (SELECT COUNT(*) FROM pm_alert_triggers t WHERE t.alert_id = a.alert_id) as trigger_count
       FROM pm_price_alerts a
       JOIN pm_commodities com ON com.commodity_id = a.commodity_id
       LEFT JOIN pm_markets mkt ON mkt.market_id = a.market_id
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/alerts', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { alert_name, commodity_id, market_id, alert_type, threshold_value, notify_roles } = req.body;
    if (!alert_name || !commodity_id || !alert_type || threshold_value === undefined)
      return res.status(400).json({ error: 'alert_name, commodity_id, alert_type, and threshold_value are required' });
    const id = pmId(PM.ALERT);
    await pool.execute(
      `INSERT INTO pm_price_alerts (alert_id, alert_name, commodity_id, market_id, alert_type, threshold_value, notify_roles, created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, alert_name, commodity_id, market_id || null, alert_type, parseFloat(threshold_value),
       notify_roles ? JSON.stringify(notify_roles) : null, req.user.user_id]
    );
    await logAction(req.user.user_id, 'CREATE_PM_ALERT', `Created price alert: ${alert_name}`);
    res.status(201).json({ alert_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/alerts/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const { alert_name, commodity_id, market_id, alert_type, threshold_value, is_active } = req.body;
    const [r] = await pool.execute(
      `UPDATE pm_price_alerts SET alert_name=?, commodity_id=?, market_id=?, alert_type=?,
       threshold_value=?, is_active=? WHERE alert_id=?`,
      [alert_name, commodity_id, market_id || null, alert_type, parseFloat(threshold_value),
       is_active !== undefined ? is_active : 1, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Alert not found' });
    await logAction(req.user.user_id, 'UPDATE_PM_ALERT', `Updated price alert: ${alert_name}`);
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/alerts/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const [r] = await pool.execute('DELETE FROM pm_price_alerts WHERE alert_id=?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Alert not found' });
    await logAction(req.user.user_id, 'DELETE_PM_ALERT', `Deleted price alert ${req.params.id}`);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/alerts/:id/triggers', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT t.*, pr.recorded_date, pr.market_id, mkt.market_name, com.commodity_name
       FROM pm_alert_triggers t
       JOIN pm_price_records pr ON pr.record_id = t.record_id
       JOIN pm_commodities com ON com.commodity_id = pr.commodity_id
       JOIN pm_markets mkt ON mkt.market_id = pr.market_id
       WHERE t.alert_id=? ORDER BY t.triggered_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD / OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const [[{ total_records }]] = await pool.execute('SELECT COUNT(*) as total_records FROM pm_price_records');
    const [[{ total_commodities }]] = await pool.execute('SELECT COUNT(*) as total_commodities FROM pm_commodities WHERE is_active=1');
    const [[{ total_markets }]] = await pool.execute('SELECT COUNT(*) as total_markets FROM pm_markets WHERE is_active=1');
    const [[{ active_alerts }]] = await pool.execute('SELECT COUNT(*) as active_alerts FROM pm_price_alerts WHERE is_active=1');
    const [[{ triggered_today }]] = await pool.execute(
      'SELECT COUNT(*) as triggered_today FROM pm_alert_triggers WHERE DATE(triggered_at)=CURDATE()'
    );

    // Recent price records (last 10)
    const [recent] = await pool.execute(
      `SELECT pr.price, pr.recorded_date, pr.is_verified, com.commodity_name, com.unit,
         mkt.market_name, cat.category_name
       FROM pm_price_records pr
       JOIN pm_commodities com ON com.commodity_id = pr.commodity_id
       JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
       JOIN pm_markets mkt ON mkt.market_id = pr.market_id
       ORDER BY pr.created_at DESC LIMIT 10`
    );

    // Price changes (compare latest vs previous)
    const [priceChanges] = await pool.execute(
      `SELECT com.commodity_name, com.unit, cat.category_name,
         r1.price as current_price, r2.price as prev_price, r1.recorded_date,
         mkt.market_name
       FROM pm_commodities com
       JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
       JOIN pm_price_records r1 ON r1.commodity_id = com.commodity_id
         AND r1.record_id = (
           SELECT record_id FROM pm_price_records
           WHERE commodity_id = com.commodity_id
           ORDER BY recorded_date DESC, created_at DESC LIMIT 1
         )
       LEFT JOIN pm_price_records r2 ON r2.commodity_id = com.commodity_id
         AND r2.record_id = (
           SELECT record_id FROM pm_price_records
           WHERE commodity_id = com.commodity_id
             AND recorded_date < r1.recorded_date
           ORDER BY recorded_date DESC, created_at DESC LIMIT 1
         )
       JOIN pm_markets mkt ON mkt.market_id = r1.market_id
       WHERE com.is_active = 1
       LIMIT 20`
    );

    res.json({
      stats: { total_records, total_commodities, total_markets, active_alerts, triggered_today },
      recent_records: recent,
      price_changes: priceChanges,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// AI ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
router.get('/analysis/:commodity_id', async (req, res) => {
  try {
    const { commodity_id } = req.params;
    const { market_id, days = 90 } = req.query;

    // Get commodity info
    const [[commodity]] = await pool.execute(
      `SELECT com.*, cat.category_name FROM pm_commodities com
       JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
       WHERE com.commodity_id=?`,
      [commodity_id]
    );
    if (!commodity) return res.status(404).json({ error: 'Commodity not found' });

    // Get price history
    let sql = `SELECT pr.price, pr.recorded_date, pr.is_verified, mkt.market_name
               FROM pm_price_records pr
               JOIN pm_markets mkt ON mkt.market_id = pr.market_id
               WHERE pr.commodity_id=? AND pr.recorded_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`;
    const params = [commodity_id, parseInt(days)];
    if (market_id) { sql += ' AND pr.market_id=?'; params.push(market_id); }
    sql += ' ORDER BY pr.recorded_date ASC';

    const [records] = await pool.execute(sql, params);

    if (records.length === 0) {
      return res.json({
        commodity,
        has_data: false,
        message: 'No price records found for analysis.',
        insights: [],
      });
    }

    const prices = records.map(r => parseFloat(r.price));
    const dates = records.map(r => r.recorded_date);

    // Statistical analysis
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const std = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length);
    const volatility = mean > 0 ? (std / mean) * 100 : 0;

    // Trend analysis
    const { slope, r2 } = computeLinearTrend(prices);
    const trendPct = prices.length > 1 ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0;
    const trendDirection = slope > 0.01 ? 'rising' : slope < -0.01 ? 'falling' : 'stable';

    // Moving averages
    const ma7 = movingAverage(prices, 7);
    const ma14 = movingAverage(prices, 14);

    // Anomalies
    const anomalyFlags = detectAnomalies(prices);
    const anomalies = records.filter((_, i) => anomalyFlags[i]).map((r, i) => ({
      date: r.recorded_date,
      price: prices[records.indexOf(r)],
      market: r.market_name,
    }));

    // Forecast next 7 days
    const forecast = forecastNext(prices, 7);

    // Generate AI insights
    const insights = [];

    if (trendDirection === 'rising') {
      insights.push({
        type: 'warning',
        title: 'Price Increase Detected',
        detail: `${commodity.commodity_name} prices are trending upward by ${Math.abs(trendPct).toFixed(1)}% over the past ${days} days. Consider monitoring supply chain issues.`,
      });
    } else if (trendDirection === 'falling') {
      insights.push({
        type: 'positive',
        title: 'Price Decrease Detected',
        detail: `${commodity.commodity_name} prices have decreased by ${Math.abs(trendPct).toFixed(1)}% over the past ${days} days, indicating good market supply.`,
      });
    } else {
      insights.push({
        type: 'info',
        title: 'Price Stable',
        detail: `${commodity.commodity_name} prices are relatively stable with only ${Math.abs(trendPct).toFixed(1)}% change over ${days} days.`,
      });
    }

    if (volatility > 20) {
      insights.push({
        type: 'warning',
        title: 'High Price Volatility',
        detail: `Price volatility is ${volatility.toFixed(1)}% — this is high. Prices are fluctuating significantly, which may indicate supply instability.`,
      });
    }

    if (anomalies.length > 0) {
      insights.push({
        type: 'alert',
        title: `${anomalies.length} Price Anomaly${anomalies.length > 1 ? 'ies' : ''} Detected`,
        detail: `Unusual price points detected on: ${anomalies.map(a => a.date).join(', ')}. These deviate significantly from the average (₱${mean.toFixed(2)}).`,
      });
    }

    const forecastMax = Math.max(...forecast);
    const forecastMin = Math.min(...forecast);
    insights.push({
      type: 'forecast',
      title: '7-Day Price Forecast',
      detail: `Based on current trends, prices are expected to range between ₱${forecastMin.toFixed(2)} and ₱${forecastMax.toFixed(2)} in the next 7 days.`,
    });

    if (r2 < 0.3 && records.length >= 5) {
      insights.push({
        type: 'info',
        title: 'Irregular Price Pattern',
        detail: 'No clear linear trend detected. Prices may be influenced by multiple seasonal or external factors.',
      });
    }

    res.json({
      commodity,
      has_data: true,
      period_days: parseInt(days),
      record_count: records.length,
      statistics: {
        mean: parseFloat(mean.toFixed(2)),
        min: parseFloat(min.toFixed(2)),
        max: parseFloat(max.toFixed(2)),
        std: parseFloat(std.toFixed(2)),
        volatility: parseFloat(volatility.toFixed(2)),
        trend_direction: trendDirection,
        trend_pct: parseFloat(trendPct.toFixed(2)),
        r2: parseFloat(r2.toFixed(4)),
      },
      price_history: records.map((r, i) => ({
        date: r.recorded_date,
        price: prices[i],
        market: r.market_name,
        ma7: parseFloat((ma7[i] || 0).toFixed(2)),
        ma14: parseFloat((ma14[i] || 0).toFixed(2)),
        is_anomaly: anomalyFlags[i],
      })),
      forecast: forecast.map((p, i) => ({
        day: i + 1,
        forecasted_price: parseFloat(p.toFixed(2)),
      })),
      anomalies,
      insights,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Market Comparison
router.get('/analysis/compare/markets', async (req, res) => {
  try {
    const { commodity_id, days = 30 } = req.query;
    if (!commodity_id) return res.status(400).json({ error: 'commodity_id is required' });

    const [[commodity]] = await pool.execute(
      'SELECT com.*, cat.category_name FROM pm_commodities com JOIN pm_commodity_categories cat ON cat.category_id = com.category_id WHERE com.commodity_id=?',
      [commodity_id]
    );

    const [marketStats] = await pool.execute(
      `SELECT mkt.market_id, mkt.market_name, mkt.market_type,
         AVG(pr.price) as avg_price, MIN(pr.price) as min_price, MAX(pr.price) as max_price,
         COUNT(pr.record_id) as record_count,
         MAX(pr.recorded_date) as last_recorded
       FROM pm_price_records pr
       JOIN pm_markets mkt ON mkt.market_id = pr.market_id
       WHERE pr.commodity_id=? AND pr.recorded_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY mkt.market_id, mkt.market_name, mkt.market_type
       ORDER BY avg_price ASC`,
      [commodity_id, parseInt(days)]
    );

    const insights = [];
    if (marketStats.length >= 2) {
      const cheapest = marketStats[0];
      const most_expensive = marketStats[marketStats.length - 1];
      const priceDiff = parseFloat(most_expensive.avg_price) - parseFloat(cheapest.avg_price);
      const priceDiffPct = (priceDiff / parseFloat(cheapest.avg_price)) * 100;

      insights.push({
        type: 'info',
        title: 'Best Value Establishment',
        detail: `${cheapest.market_name} offers the lowest average price for ${commodity?.commodity_name} at ₱${parseFloat(cheapest.avg_price).toFixed(2)}/${commodity?.unit}.`,
      });

      if (priceDiffPct > 10) {
        insights.push({
          type: 'warning',
          title: 'Significant Price Disparity',
          detail: `There is a ₱${priceDiff.toFixed(2)} (${priceDiffPct.toFixed(1)}%) price difference between establishments. Consider coordinating establishment-level interventions.`,
        });
      }
    }

    res.json({
      commodity,
      period_days: parseInt(days),
      market_comparison: marketStats.map(m => ({
        ...m,
        avg_price: parseFloat(parseFloat(m.avg_price).toFixed(2)),
        min_price: parseFloat(parseFloat(m.min_price).toFixed(2)),
        max_price: parseFloat(parseFloat(m.max_price).toFixed(2)),
      })),
      insights,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global AI Summary
router.get('/analysis/summary/global', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    // Top risers
    const [risers] = await pool.execute(
      `SELECT com.commodity_name, com.unit, cat.category_name,
         r_new.price as latest_price, r_old.price as prev_price,
         ((r_new.price - r_old.price) / r_old.price * 100) as change_pct
       FROM pm_commodities com
       JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
       JOIN pm_price_records r_new ON r_new.commodity_id = com.commodity_id
         AND r_new.record_id = (
           SELECT record_id FROM pm_price_records
           WHERE commodity_id = com.commodity_id ORDER BY recorded_date DESC, created_at DESC LIMIT 1
         )
       JOIN pm_price_records r_old ON r_old.commodity_id = com.commodity_id
         AND r_old.record_id = (
           SELECT record_id FROM pm_price_records
           WHERE commodity_id = com.commodity_id
             AND recorded_date <= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           ORDER BY recorded_date DESC, created_at DESC LIMIT 1
         )
       WHERE com.is_active = 1 AND r_old.price > 0
       ORDER BY change_pct DESC LIMIT 5`,
      [parseInt(days)]
    );

    const [fallers] = await pool.execute(
      `SELECT com.commodity_name, com.unit, cat.category_name,
         r_new.price as latest_price, r_old.price as prev_price,
         ((r_new.price - r_old.price) / r_old.price * 100) as change_pct
       FROM pm_commodities com
       JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
       JOIN pm_price_records r_new ON r_new.commodity_id = com.commodity_id
         AND r_new.record_id = (
           SELECT record_id FROM pm_price_records
           WHERE commodity_id = com.commodity_id ORDER BY recorded_date DESC, created_at DESC LIMIT 1
         )
       JOIN pm_price_records r_old ON r_old.commodity_id = com.commodity_id
         AND r_old.record_id = (
           SELECT record_id FROM pm_price_records
           WHERE commodity_id = com.commodity_id
             AND recorded_date <= DATE_SUB(CURDATE(), INTERVAL ? DAY)
           ORDER BY recorded_date DESC, created_at DESC LIMIT 1
         )
       WHERE com.is_active = 1 AND r_old.price > 0
       ORDER BY change_pct ASC LIMIT 5`,
      [parseInt(days)]
    );

    const [[{ recently_triggered }]] = await pool.execute(
      'SELECT COUNT(*) as recently_triggered FROM pm_alert_triggers WHERE triggered_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
      [parseInt(days)]
    );

    res.json({
      period_days: parseInt(days),
      top_risers: risers.map(r => ({ ...r, change_pct: parseFloat(parseFloat(r.change_pct).toFixed(2)) })),
      top_fallers: fallers.map(r => ({ ...r, change_pct: parseFloat(parseFloat(r.change_pct).toFixed(2)) })),
      recently_triggered_alerts: parseInt(recently_triggered),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICE MONITORING REPORT (AI-powered document data)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/report', async (req, res) => {
  try {
    const { commodity_ids = [], market_ids = [], date_from, date_to } = req.body;
    if (!commodity_ids.length) return res.status(400).json({ error: 'At least one commodity_id is required' });

    const dateFilter = date_from && date_to
      ? { label: `${date_from} to ${date_to}`, from: date_from, to: date_to }
      : date_from
        ? { label: `From ${date_from}`, from: date_from, to: null }
        : { label: 'All time', from: null, to: null };

    // Compute days for AI analysis
    const diffDays = (date_from && date_to)
      ? Math.max(1, Math.ceil((new Date(date_to) - new Date(date_from)) / 86400000))
      : 90;

    const reportCommodities = [];

    for (const cid of commodity_ids) {
      // Commodity info
      const [[commodity]] = await pool.execute(
        `SELECT com.*, cat.category_name FROM pm_commodities com
         JOIN pm_commodity_categories cat ON cat.category_id = com.category_id
         WHERE com.commodity_id=?`, [cid]
      );
      if (!commodity) continue;

      // Build WHERE for records
      const where = ['pr.commodity_id = ?'];
      const params = [cid];
      if (market_ids.length) {
        where.push(`pr.market_id IN (${market_ids.map(() => '?').join(',')})`);
        params.push(...market_ids);
      }
      if (date_from) { where.push('pr.recorded_date >= ?'); params.push(date_from); }
      if (date_to)   { where.push('pr.recorded_date <= ?'); params.push(date_to); }

      const [records] = await pool.execute(
        `SELECT pr.price, pr.recorded_date, pr.is_verified, mkt.market_name, mkt.market_type
         FROM pm_price_records pr
         JOIN pm_markets mkt ON mkt.market_id = pr.market_id
         WHERE ${where.join(' AND ')}
         ORDER BY pr.recorded_date ASC`,
        params
      );

      if (!records.length) {
        reportCommodities.push({ commodity, has_data: false, insights: [] });
        continue;
      }

      const prices = records.map(r => parseFloat(r.price));
      const mean  = prices.reduce((a, b) => a + b, 0) / prices.length;
      const min   = Math.min(...prices);
      const max   = Math.max(...prices);
      const std   = Math.sqrt(prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length);
      const volatility = mean > 0 ? (std / mean) * 100 : 0;
      const { slope, r2 } = computeLinearTrend(prices);
      const trendPct = prices.length > 1 ? ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100 : 0;
      const trendDirection = slope > 0.01 ? 'rising' : slope < -0.01 ? 'falling' : 'stable';
      const anomalyFlags = detectAnomalies(prices);
      const anomalies = records.filter((_, i) => anomalyFlags[i]).map(r => ({
        date: r.recorded_date, price: parseFloat(r.price), market: r.market_name,
      }));
      const forecast = forecastNext(prices, 7);
      const ma7  = movingAverage(prices, 7);

      const insights = [];
      if (trendDirection === 'rising') {
        insights.push({ type: 'warning', title: 'Price Increase Detected',
          detail: `${commodity.commodity_name} prices trended upward by ${Math.abs(trendPct).toFixed(1)}% over the report period. Monitor supply chain issues.` });
      } else if (trendDirection === 'falling') {
        insights.push({ type: 'positive', title: 'Price Decrease Detected',
          detail: `${commodity.commodity_name} prices decreased by ${Math.abs(trendPct).toFixed(1)}% over the report period, indicating good market supply.` });
      } else {
        insights.push({ type: 'info', title: 'Price Stable',
          detail: `${commodity.commodity_name} prices were relatively stable with ${Math.abs(trendPct).toFixed(1)}% change over the period.` });
      }
      if (volatility > 20) {
        insights.push({ type: 'warning', title: 'High Price Volatility',
          detail: `Volatility is ${volatility.toFixed(1)}% — prices are fluctuating significantly, which may indicate supply instability.` });
      }
      if (anomalies.length > 0) {
        insights.push({ type: 'alert', title: `${anomalies.length} Price Anomaly${anomalies.length > 1 ? 'ies' : ''} Detected`,
          detail: `Unusual prices on: ${anomalies.map(a => new Date(a.date).toLocaleDateString('en-PH')).join(', ')}. These deviate significantly from the average (₱${mean.toFixed(2)}).` });
      }
      const forecastMax = Math.max(...forecast), forecastMin = Math.min(...forecast);
      insights.push({ type: 'forecast', title: '7-Day Price Forecast',
        detail: `Based on trend, prices are expected to range ₱${forecastMin.toFixed(2)}–₱${forecastMax.toFixed(2)} in the next 7 days.` });
      if (r2 < 0.3 && records.length >= 5) {
        insights.push({ type: 'info', title: 'Irregular Price Pattern',
          detail: 'No clear linear trend. Prices may be influenced by seasonal or external factors.' });
      }

      // Per-establishment stats
      const mktMap = {};
      records.forEach(r => {
        if (!mktMap[r.market_name]) mktMap[r.market_name] = { prices: [], type: r.market_type };
        mktMap[r.market_name].prices.push(parseFloat(r.price));
      });
      const establishmentStats = Object.entries(mktMap).map(([name, v]) => ({
        market_name: name,
        market_type: v.type,
        avg_price: parseFloat((v.prices.reduce((a, b) => a + b, 0) / v.prices.length).toFixed(2)),
        min_price: parseFloat(Math.min(...v.prices).toFixed(2)),
        max_price: parseFloat(Math.max(...v.prices).toFixed(2)),
        record_count: v.prices.length,
      })).sort((a, b) => a.avg_price - b.avg_price);

      // Best/worst establishment insight
      if (establishmentStats.length >= 2) {
        const best = establishmentStats[0], worst = establishmentStats[establishmentStats.length - 1];
        const diff = worst.avg_price - best.avg_price;
        const diffPct = (diff / best.avg_price) * 100;
        insights.push({ type: 'info', title: 'Best Value Establishment',
          detail: `${best.market_name} has the lowest average price at ₱${best.avg_price}/${commodity.unit}${diffPct > 5 ? ` — ${diffPct.toFixed(1)}% less than ${worst.market_name} (₱${worst.avg_price})` : ''}.` });
      }

      reportCommodities.push({
        commodity,
        has_data: true,
        record_count: records.length,
        statistics: {
          mean: parseFloat(mean.toFixed(2)), min: parseFloat(min.toFixed(2)),
          max: parseFloat(max.toFixed(2)), std: parseFloat(std.toFixed(2)),
          volatility: parseFloat(volatility.toFixed(2)),
          trend_direction: trendDirection,
          trend_pct: parseFloat(trendPct.toFixed(2)),
          r2: parseFloat(r2.toFixed(4)),
          latest_price: prices[prices.length - 1],
          first_price: prices[0],
        },
        price_history: records.map((r, i) => ({
          date: r.recorded_date, price: parseFloat(r.price),
          market: r.market_name, ma7: parseFloat((ma7[i] || 0).toFixed(2)),
          is_anomaly: anomalyFlags[i],
        })),
        forecast: forecast.map((p, i) => ({ day: i + 1, price: parseFloat(p.toFixed(2)) })),
        anomalies,
        establishment_stats: establishmentStats,
        insights,
      });
    }

    // Selected establishments
    let selectedMarkets = [];
    if (market_ids.length) {
      const ph = market_ids.map(() => '?').join(',');
      const [mkts] = await pool.execute(`SELECT * FROM pm_markets WHERE market_id IN (${ph})`, market_ids);
      selectedMarkets = mkts;
    } else {
      const [mkts] = await pool.execute('SELECT * FROM pm_markets WHERE is_active=1');
      selectedMarkets = mkts;
    }

    res.json({
      generated_at: new Date().toISOString(),
      generated_by: req.user?.full_name || 'System',
      date_filter: dateFilter,
      selected_establishments: selectedMarkets,
      commodities: reportCommodities,
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
