const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAction } = require('../utils/auditLogger');
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const { assertReadingTransition } = require('../utils/stateMachines');
const {
  BILLING_MODELS,
  getRateTiersForSupply,
  getSupplyBillingConfig,
} = require('../utils/waterworksBilling');
const {
  buildDefaultWorksheetPayload,
  computeRateWorksheet,
  classificationToProgressiveTiers,
} = require('../utils/waterworksRateComputation');

const router = express.Router();

const WW_MANAGER_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

router.use((req, res, next) => {
  const tokenFromQuery = req.query.token;
  if (tokenFromQuery && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${tokenFromQuery}`;
  }
  next();
});

router.use(authenticate);

function parseDate(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  return dateValue;
}

async function getEntityById(entityId) {
  const [rows] = await pool.execute(
    'SELECT entity_id, entity_name, contact_person, email, phone, address FROM entities WHERE entity_id = ?',
    [entityId]
  );
  return rows[0] || null;
}

function consumerFieldsFromEntity(entity, overrides = {}) {
  return {
    consumer_name: entity.entity_name,
    address: overrides.address !== undefined ? overrides.address : (entity.address || null),
    contact_number: overrides.contact_number !== undefined ? overrides.contact_number : (entity.phone || null),
    email: overrides.email !== undefined ? overrides.email : (entity.email || null),
  };
}

async function resolveAccountConsumerFields(body) {
  const { entity_id, consumer_name, address, contact_number, email } = body;

  if (entity_id) {
    const entity = await getEntityById(entity_id);
    if (!entity) return { error: 'Invalid entity_id' };
    return {
      entity_id,
      ...consumerFieldsFromEntity(entity, { address, contact_number, email }),
    };
  }

  if (!consumer_name || !consumer_name.trim()) {
    return { error: 'Select a consumer from entities or provide consumer name' };
  }

  return {
    entity_id: null,
    consumer_name: consumer_name.trim(),
    address: address || null,
    contact_number: contact_number || null,
    email: email || null,
  };
}

const waterworksAccounts = require('../modules/waterworks/accountsService');
const waterworksBilling = require('../modules/waterworks/billingService');
const { getAccountOutstandingBalance } = waterworksBilling;

const ACCOUNT_SELECT = waterworksAccounts.ACCOUNT_SELECT;
const ACCOUNT_FROM = waterworksAccounts.ACCOUNT_FROM;

function hasAnyRole(user, roles) {
  const userRoles = user.roles || [];
  if (userRoles.includes('SuperAdmin')) return true;
  return roles.some((role) => userRoles.includes(role));
}

function parsePagination(query) {
  return waterworksAccounts.parsePagination(query);
}

const SUPPLY_CODE_PREFIX = 'WS';
const SUPPLY_CODE_LENGTH = 8;
const SUPPLY_CODE_MAX_LENGTH = 20;

const ACCOUNT_TYPES = {
  residential: { code: 'R', label: 'Residential' },
  commercial: { code: 'C', label: 'Commercial' },
  institutional: { code: 'I', label: 'Institutional' },
  others: { code: 'O', label: 'Others' },
};

const ACCOUNT_TYPE_KEYS = Object.keys(ACCOUNT_TYPES);
const ACCOUNT_SERIES_PAD = 4;

function normalizeAccountType(value) {
  const key = String(value || 'residential').trim().toLowerCase();
  return ACCOUNT_TYPE_KEYS.includes(key) ? key : 'residential';
}

function getAccountTypeCode(accountType) {
  return ACCOUNT_TYPES[normalizeAccountType(accountType)].code;
}

function parseUnpaidDues(value) {
  if (value === undefined || value === null || value === '') return 0;
  const amount = parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return parseFloat(amount.toFixed(2));
}

function parseScheduleDay(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return { day: null };
  }
  const day = parseInt(value, 10);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { error: `${fieldName} must be a day between 1 and 31` };
  }
  return { day };
}

function normalizeSupplySchedule(body) {
  const fromResult = parseScheduleDay(body.reading_day_from, 'Reading day from');
  if (fromResult.error) return fromResult;
  const toResult = parseScheduleDay(body.reading_day_to, 'Reading day to');
  if (toResult.error) return toResult;
  const billingResult = parseScheduleDay(body.billing_day, 'Billing day');
  if (billingResult.error) return billingResult;

  if (fromResult.day && toResult.day && fromResult.day > toResult.day) {
    return { error: 'Reading schedule: From day must be on or before To day' };
  }

  return {
    reading_day_from: fromResult.day,
    reading_day_to: toResult.day,
    billing_day: billingResult.day,
  };
}

async function generateNextAccountNumber(connection, supplyId, accountType) {
  const typeKey = normalizeAccountType(accountType);
  const typeCode = getAccountTypeCode(typeKey);

  const [supplies] = await connection.query(
    'SELECT supply_code FROM ww_water_supplies WHERE supply_id = ?',
    [supplyId]
  );
  if (!supplies.length) {
    throw new Error('Invalid supply_id');
  }

  const supplyCode = supplies[0].supply_code;
  const prefix = `${supplyCode}-${typeCode}-`;

  const [rows] = await connection.query(
    `SELECT account_number FROM ww_consumer_accounts
     WHERE supply_id = ? AND account_type = ? AND account_number LIKE ?
     ORDER BY account_number DESC LIMIT 1`,
    [supplyId, typeKey, `${prefix}%`]
  );

  let nextNum = 1;
  if (rows.length) {
    const suffix = rows[0].account_number.slice(prefix.length);
    const parsed = parseInt(suffix, 10);
    if (Number.isFinite(parsed)) nextNum = parsed + 1;
  }

  const maxNum = Math.pow(10, ACCOUNT_SERIES_PAD) - 1;
  for (let num = nextNum; num <= maxNum; num += 1) {
    const accountNumber = `${prefix}${String(num).padStart(ACCOUNT_SERIES_PAD, '0')}`;
    const [existing] = await connection.query(
      'SELECT 1 FROM ww_consumer_accounts WHERE account_number = ? LIMIT 1',
      [accountNumber]
    );
    if (!existing.length) return accountNumber;
  }

  throw new Error('Unable to generate a unique account number');
}

function normalizeSupplyCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function validateSupplyCode(code, { required = true } = {}) {
  const normalized = normalizeSupplyCode(code);
  if (!normalized) {
    return required ? { error: 'supply_code is required' } : { code: null };
  }
  if (normalized.length > SUPPLY_CODE_MAX_LENGTH) {
    return { error: `supply_code must be at most ${SUPPLY_CODE_MAX_LENGTH} characters` };
  }
  if (!/^[A-Z0-9]+$/.test(normalized)) {
    return { error: 'supply_code must contain letters and numbers only' };
  }
  return { code: normalized };
}

async function generateUniqueSupplyCode(connection) {
  const suffixLength = SUPPLY_CODE_LENGTH - SUPPLY_CODE_PREFIX.length;
  const pattern = `${SUPPLY_CODE_PREFIX}[0-9]{${suffixLength}}`;

  const [rows] = await connection.query(
    `SELECT supply_code FROM ww_water_supplies
     WHERE supply_code REGEXP ?
     ORDER BY supply_code DESC LIMIT 1`,
    [`^${pattern}$`]
  );

  let nextNum = 1;
  if (rows.length) {
    const suffix = rows[0].supply_code.slice(SUPPLY_CODE_PREFIX.length);
    const parsed = parseInt(suffix, 10);
    if (Number.isFinite(parsed)) nextNum = parsed + 1;
  }

  const maxNum = Math.pow(10, suffixLength) - 1;
  for (let num = nextNum; num <= maxNum; num += 1) {
    const code = `${SUPPLY_CODE_PREFIX}${String(num).padStart(suffixLength, '0')}`;
    const [existing] = await connection.query(
      'SELECT 1 FROM ww_water_supplies WHERE supply_code = ? LIMIT 1',
      [code]
    );
    if (!existing.length) return code;
  }

  throw new Error('Unable to generate a unique supply code');
}

function normalizeBillingModel(value) {
  const model = String(value || 'progressive').trim();
  return BILLING_MODELS.includes(model) ? model : 'progressive';
}

function buildTierDescription(tier, billingModel = 'progressive') {
  if (tier.charge_type === 'minimum') {
    return tier.to_m3 != null ? `Minimum charge (up to ${tier.to_m3} m³)` : 'Minimum charge';
  }
  if (tier.charge_type === 'deduction') {
    const range = tier.to_m3 != null ? `${tier.from_m3} – ${tier.to_m3} m³` : `${tier.from_m3} m³ and above`;
    return `Deduction (${range})`;
  }
  if (tier.charge_type === 'flat_bracket' || billingModel === 'bracket_flat') {
    const range = tier.to_m3 != null ? `${tier.from_m3} – ${tier.to_m3} m³` : `${tier.from_m3} m³ and above`;
    return `Flat rate (${range})`;
  }
  if (tier.to_m3 == null) {
    return `${tier.from_m3} m³ and above`;
  }
  return `${tier.from_m3} – ${tier.to_m3} m³`;
}

const VALID_CHARGE_TYPES = ['minimum', 'per_cubic', 'flat_bracket', 'deduction'];

function normalizeRateTiersInput(tiers, billingModel = 'progressive', baseUnitRate = 0) {
  const model = normalizeBillingModel(billingModel);

  if (!Array.isArray(tiers) || !tiers.length) {
    return { error: 'At least one rate tier is required' };
  }

  const normalized = tiers
    .map((tier, index) => {
      let chargeType = VALID_CHARGE_TYPES.includes(tier.charge_type) ? tier.charge_type : 'per_cubic';
      if (model === 'bracket_flat') chargeType = 'flat_bracket';
      if (model === 'per_unit_deduction') chargeType = 'deduction';
      if (model === 'minimum_excess') {
        chargeType = index === 0 ? 'minimum' : 'per_cubic';
      }
      if (model === 'progressive' && index === 0 && chargeType !== 'minimum') {
        chargeType = tier.charge_type === 'minimum' ? 'minimum' : chargeType;
      }

      return {
        tier_order: parseInt(tier.tier_order, 10) || index + 1,
        from_m3: parseFloat(tier.from_m3) || 0,
        to_m3: tier.to_m3 === null || tier.to_m3 === undefined || tier.to_m3 === ''
          ? null
          : parseFloat(tier.to_m3),
        charge_type: chargeType,
        rate_amount: parseFloat(tier.rate_amount),
        description: tier.description ? String(tier.description).trim() : null,
      };
    })
    .sort((a, b) => a.tier_order - b.tier_order)
    .map((tier) => ({
      ...tier,
      description: tier.description || buildTierDescription(tier, model),
    }));

  if (normalized.some((tier) => !Number.isFinite(tier.rate_amount) || tier.rate_amount < 0)) {
    return { error: 'Each rate tier must have a valid non-negative rate amount' };
  }

  for (const tier of normalized) {
    if (tier.from_m3 < 0 || (tier.to_m3 != null && tier.to_m3 < 0)) {
      return { error: 'Cubic ranges cannot be negative' };
    }
    if (tier.to_m3 != null && tier.from_m3 > tier.to_m3) {
      return { error: `Invalid cubic range on tier ${tier.tier_order}: From must be less than or equal to To` };
    }
  }

  if (model === 'progressive') {
    const minTier = normalized.find((tier) => tier.charge_type === 'minimum');
    if (!minTier) {
      return { error: 'Progressive billing requires a minimum block tier' };
    }
  }

  if (model === 'bracket_flat') {
    if (normalized.some((tier) => tier.charge_type !== 'flat_bracket')) {
      return { error: 'Bracket-flat billing requires flat bracket tiers only' };
    }
  }

  if (model === 'per_unit_deduction') {
    const baseRate = parseFloat(baseUnitRate);
    if (!Number.isFinite(baseRate) || baseRate <= 0) {
      return { error: 'Per-unit deduction billing requires a base rate per m³' };
    }
    if (normalized.some((tier) => tier.charge_type !== 'deduction')) {
      return { error: 'Per-unit deduction billing requires deduction tiers only' };
    }
  }

  if (model === 'minimum_excess') {
    const minTier = normalized.find((tier) => tier.charge_type === 'minimum');
    const excessTiers = normalized.filter((tier) => tier.charge_type === 'per_cubic');
    if (!minTier) {
      return { error: 'Minimum + excess billing requires a minimum charge tier' };
    }
    if (excessTiers.length !== 1) {
      return { error: 'Minimum + excess billing requires exactly one excess per-m³ tier' };
    }
    const excessFrom = parseFloat(excessTiers[0].from_m3);
    const minTo = minTier.to_m3 != null ? parseFloat(minTier.to_m3) : null;
    if (minTo != null && excessFrom <= minTo) {
      return { error: 'Excess rate must start after the minimum block (from m³ > minimum up to m³)' };
    }
  }

  return { tiers: normalized, billingModel: model };
}

async function saveSupplyRateTiers(connection, supplyId, tiers, billingModel = 'progressive', baseUnitRate = 0) {
  const model = normalizeBillingModel(billingModel);
  await connection.query('DELETE FROM ww_rate_tiers WHERE supply_id = ?', [supplyId]);

  for (const tier of tiers) {
    const tierId = generateId(ID_PREFIXES.WW_TIER);
    await connection.query(
      `INSERT INTO ww_rate_tiers
        (tier_id, supply_id, tier_order, from_m3, to_m3, charge_type, rate_amount, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tierId,
        supplyId,
        tier.tier_order,
        tier.from_m3,
        tier.to_m3,
        tier.charge_type,
        tier.rate_amount,
        tier.description,
      ]
    );
  }

  let minimumCharge = 0;
  let ratePerCubic = 0;

  if (model === 'progressive') {
    const minTier = tiers.find((tier) => tier.charge_type === 'minimum') || tiers[0];
    minimumCharge = minTier.rate_amount;
  } else if (model === 'bracket_flat') {
    minimumCharge = Math.min(...tiers.map((tier) => tier.rate_amount));
  } else if (model === 'minimum_excess') {
    const minTier = tiers.find((tier) => tier.charge_type === 'minimum') || tiers[0];
    minimumCharge = minTier.rate_amount;
  } else if (model === 'per_unit_deduction') {
    ratePerCubic = parseFloat(baseUnitRate) || 0;
  }

  await connection.query(
    'UPDATE ww_water_supplies SET billing_model = ?, minimum_charge = ?, rate_per_cubic_meter = ? WHERE supply_id = ?',
    [model, minimumCharge, ratePerCubic, supplyId]
  );
}

async function copyDefaultTiersToSupply(connection, supplyId) {
  const [defaults] = await connection.query(
    `SELECT tier_order, from_m3, to_m3, charge_type, rate_amount, description
     FROM ww_rate_tiers WHERE supply_id IS NULL ORDER BY tier_order ASC`
  );
  const tiers = defaults.map((tier) => ({
    tier_order: tier.tier_order,
    from_m3: parseFloat(tier.from_m3),
    to_m3: tier.to_m3 != null ? parseFloat(tier.to_m3) : null,
    charge_type: tier.charge_type,
    rate_amount: parseFloat(tier.rate_amount),
    description: tier.description,
  }));
  await saveSupplyRateTiers(connection, supplyId, tiers, 'progressive');
}

async function userCanAccessSupply(userId, supplyId, userRoles) {
  if (hasAnyRole({ roles: userRoles }, WW_MANAGER_ROLES)) return true;
  const [rows] = await pool.execute(
    'SELECT 1 FROM ww_supply_readers WHERE supply_id = ? AND user_id = ?',
    [supplyId, userId]
  );
  return rows.length > 0;
}

// ==================== RATE TIERS ====================

router.get('/rate-tiers', async (req, res) => {
  try {
    const { supply_id } = req.query;
    const connection = await pool.getConnection();
    try {
      const tiers = supply_id
        ? await getRateTiersForSupply(connection, supply_id)
        : (await connection.query(
            `SELECT tier_id, supply_id, tier_order, from_m3, to_m3, charge_type, rate_amount, description
             FROM ww_rate_tiers WHERE supply_id IS NULL ORDER BY tier_order ASC`
          ))[0];
      res.json({ data: tiers });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get rate tiers error:', error);
    res.status(500).json({ error: 'Failed to fetch rate tiers' });
  }
});

// ==================== WATER SUPPLIES ====================

router.get('/water-supplies', async (req, res) => {
  try {
    const { status, search } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      where += ' AND s.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (s.supply_name LIKE ? OR s.supply_code LIKE ? OR s.location LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM ww_water_supplies s ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.execute(
      `SELECT s.*,
        (SELECT COUNT(*) FROM ww_consumer_accounts a WHERE a.supply_id = s.supply_id) AS account_count
       FROM ww_water_supplies s
       ${where}
       ORDER BY s.supply_name ASC
       LIMIT ${offset}, ${limit}`,
      params
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get water supplies error:', error);
    res.status(500).json({ error: 'Failed to fetch water supplies' });
  }
});

router.get('/water-supplies/next-code', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      const supply_code = await generateUniqueSupplyCode(connection);
      res.json({ data: { supply_code } });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get next supply code error:', error);
    res.status(500).json({ error: 'Failed to generate supply code' });
  }
});

router.get('/water-supplies/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*,
        (SELECT COUNT(*) FROM ww_consumer_accounts a WHERE a.supply_id = s.supply_id) AS account_count
       FROM ww_water_supplies s WHERE s.supply_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Water supply not found' });

    const connection = await pool.getConnection();
    try {
      const tiers = await getRateTiersForSupply(connection, req.params.id);
      res.json({ data: { ...rows[0], rate_tiers: tiers } });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get water supply error:', error);
    res.status(500).json({ error: 'Failed to fetch water supply' });
  }
});

router.post('/water-supplies', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const {
      supply_code,
      supply_name,
      location,
      description,
      status,
      billing_model,
      base_unit_rate,
      rate_tiers,
    } = req.body;

    if (!supply_name) {
      return res.status(400).json({ error: 'supply_name is required' });
    }

    const billingModel = normalizeBillingModel(billing_model);
    const tierResult = normalizeRateTiersInput(rate_tiers, billingModel, base_unit_rate);
    if (tierResult.error) return res.status(400).json({ error: tierResult.error });

    const schedule = normalizeSupplySchedule(req.body);
    if (schedule.error) return res.status(400).json({ error: schedule.error });

    const supplyId = generateId(ID_PREFIXES.WW_SUPPLY);
    let finalCode = '';
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (supply_code && String(supply_code).trim()) {
        const codeResult = validateSupplyCode(supply_code);
        if (codeResult.error) {
          await connection.rollback();
          return res.status(400).json({ error: codeResult.error });
        }
        finalCode = codeResult.code;
      } else {
        finalCode = await generateUniqueSupplyCode(connection);
      }

      await connection.query(
        `INSERT INTO ww_water_supplies
          (supply_id, supply_code, supply_name, location, description,
           reading_day_from, reading_day_to, billing_day,
           rate_per_cubic_meter, minimum_charge, billing_model, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          supplyId,
          finalCode,
          supply_name.trim(),
          location || null,
          description || null,
          schedule.reading_day_from,
          schedule.reading_day_to,
          schedule.billing_day,
          billingModel === 'per_unit_deduction' ? parseFloat(base_unit_rate) || 0 : 0,
          billingModel === 'progressive'
            ? tierResult.tiers.find((t) => t.charge_type === 'minimum')?.rate_amount || 0
            : billingModel === 'bracket_flat'
              ? Math.min(...tierResult.tiers.map((t) => t.rate_amount))
              : 0,
          billingModel,
          status || 'active',
        ]
      );
      await saveSupplyRateTiers(
        connection,
        supplyId,
        tierResult.tiers,
        billingModel,
        base_unit_rate
      );
      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    await logAction(req.user.user_id, 'CREATE_WW_SUPPLY', `Created water supply: ${supply_name}`, supplyId);
    res.status(201).json({ data: { supply_id: supplyId, supply_code: finalCode }, message: 'Water supply created' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Supply code already exists' });
    }
    console.error('Create water supply error:', error);
    res.status(500).json({ error: 'Failed to create water supply' });
  }
});

router.put('/water-supplies/:id', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const {
      supply_code,
      supply_name,
      location,
      description,
      status,
      billing_model,
      base_unit_rate,
      rate_tiers,
    } = req.body;

    const [existing] = await pool.execute(
      'SELECT supply_id FROM ww_water_supplies WHERE supply_id = ?',
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Water supply not found' });

    let normalizedCode = null;
    if (supply_code !== undefined) {
      const codeResult = validateSupplyCode(supply_code);
      if (codeResult.error) return res.status(400).json({ error: codeResult.error });
      normalizedCode = codeResult.code;
    }

    let normalizedTiers = null;
    let billingModel = null;
    if (rate_tiers !== undefined) {
      billingModel = normalizeBillingModel(billing_model);
      const tierResult = normalizeRateTiersInput(rate_tiers, billingModel, base_unit_rate);
      if (tierResult.error) return res.status(400).json({ error: tierResult.error });
      normalizedTiers = tierResult.tiers;
    } else if (billing_model !== undefined || base_unit_rate !== undefined) {
      billingModel = normalizeBillingModel(billing_model);
    }

    const schedule = normalizeSupplySchedule(req.body);
    if (schedule.error) return res.status(400).json({ error: schedule.error });

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        `UPDATE ww_water_supplies SET
          supply_code = COALESCE(?, supply_code),
          supply_name = COALESCE(?, supply_name),
          location = COALESCE(?, location),
          description = COALESCE(?, description),
          reading_day_from = ?,
          reading_day_to = ?,
          billing_day = ?,
          status = COALESCE(?, status)
         WHERE supply_id = ?`,
        [
          normalizedCode,
          supply_name || null,
          location !== undefined ? location : null,
          description !== undefined ? description : null,
          schedule.reading_day_from,
          schedule.reading_day_to,
          schedule.billing_day,
          status || null,
          req.params.id,
        ]
      );

      if (normalizedTiers) {
        await saveSupplyRateTiers(
          connection,
          req.params.id,
          normalizedTiers,
          billingModel,
          base_unit_rate
        );
      } else if (billingModel && base_unit_rate !== undefined) {
        await connection.query(
          'UPDATE ww_water_supplies SET billing_model = ?, rate_per_cubic_meter = ? WHERE supply_id = ?',
          [billingModel, parseFloat(base_unit_rate) || 0, req.params.id]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    await logAction(req.user.user_id, 'UPDATE_WW_SUPPLY', `Updated water supply: ${req.params.id}`, req.params.id);
    res.json({ message: 'Water supply updated' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Supply code already exists' });
    }
    console.error('Update water supply error:', error);
    res.status(500).json({ error: 'Failed to update water supply' });
  }
});

router.delete('/water-supplies/:id', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const [accounts] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM ww_consumer_accounts WHERE supply_id = ?',
      [req.params.id]
    );
    if (accounts[0].cnt > 0) {
      return res.status(400).json({ error: 'Cannot delete supply with active consumer accounts' });
    }

    const [result] = await pool.execute(
      'DELETE FROM ww_water_supplies WHERE supply_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Water supply not found' });

    await logAction(req.user.user_id, 'DELETE_WW_SUPPLY', `Deleted water supply: ${req.params.id}`, req.params.id);
    res.json({ message: 'Water supply deleted' });
  } catch (error) {
    console.error('Delete water supply error:', error);
    res.status(500).json({ error: 'Failed to delete water supply' });
  }
});

// ==================== CONSUMER ACCOUNTS ====================

router.get('/accounts/next-number', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const { supply_id, account_type } = req.query;
    if (!supply_id) {
      return res.status(400).json({ error: 'supply_id is required' });
    }

    const connection = await pool.getConnection();
    try {
      const account_number = await generateNextAccountNumber(
        connection,
        supply_id,
        account_type || 'residential'
      );
      res.json({
        data: {
          account_number,
          account_type: normalizeAccountType(account_type),
          type_code: getAccountTypeCode(account_type),
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get next account number error:', error);
    if (error.message === 'Invalid supply_id') {
      return res.status(400).json({ error: 'Invalid supply_id' });
    }
    res.status(500).json({ error: 'Failed to generate account number' });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    if (!hasAnyRole(req.user, [...WW_MANAGER_ROLES, 'Meter Reader'])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await waterworksAccounts.listAccountsForUser(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const account = await waterworksAccounts.getAccount(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: account });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

router.get('/accounts/:id/summary', async (req, res) => {
  try {
    const accountId = req.params.id;
    const [accounts] = await pool.execute(
      `${ACCOUNT_SELECT}, s.rate_per_cubic_meter, s.minimum_charge
       ${ACCOUNT_FROM}
       WHERE a.account_id = ?`,
      [accountId]
    );
    if (!accounts.length) return res.status(404).json({ error: 'Account not found' });

    const connection = await pool.getConnection();
    try {
      const outstandingBalance = await getAccountOutstandingBalance(connection, accountId);

      const [readings] = await connection.query(
        `SELECT r.*, u.full_name AS recorded_by_name
         FROM ww_meter_readings r
         LEFT JOIN users u ON u.user_id = r.recorded_by
         WHERE r.account_id = ?
         ORDER BY r.reading_period_year DESC, r.reading_period_month DESC
         LIMIT 24`,
        [accountId]
      );

      const [bills] = await connection.query(
        `SELECT b.*,
          COALESCE((SELECT SUM(amount_paid) FROM ww_payments p WHERE p.bill_id = b.bill_id), 0) AS total_paid
         FROM ww_bills b
         WHERE b.account_id = ?
         ORDER BY b.billing_year DESC, b.billing_month DESC
         LIMIT 24`,
        [accountId]
      );

      const [payments] = await connection.query(
        `SELECT p.*, u.full_name AS recorded_by_name
         FROM ww_payments p
         LEFT JOIN users u ON u.user_id = p.recorded_by
         WHERE p.account_id = ?
         ORDER BY p.payment_date DESC
         LIMIT 24`,
        [accountId]
      );

      res.json({
        data: {
          account: accounts[0],
          outstanding_balance: outstandingBalance,
          readings,
          bills,
          payments,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get account summary error:', error);
    res.status(500).json({ error: 'Failed to fetch account summary' });
  }
});

router.post('/accounts', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const {
      account_number,
      account_type,
      supply_id,
      entity_id,
      meter_number,
      connection_date,
      status,
      previous_reading,
      unpaid_dues,
      unpaid_dues_notes,
    } = req.body;

    if (!supply_id) {
      return res.status(400).json({ error: 'supply_id is required' });
    }

    const openingDues = parseUnpaidDues(unpaid_dues);
    if (openingDues === null) {
      return res.status(400).json({ error: 'unpaid_dues must be a valid non-negative amount' });
    }

    const normalizedType = normalizeAccountType(account_type);

    const resolved = await resolveAccountConsumerFields(req.body);
    if (resolved.error) {
      return res.status(400).json({ error: resolved.error });
    }

    const connection = await pool.getConnection();
    try {
      const [supply] = await connection.query(
        'SELECT supply_id FROM ww_water_supplies WHERE supply_id = ?',
        [supply_id]
      );
      if (!supply.length) return res.status(400).json({ error: 'Invalid supply_id' });

      let finalAccountNumber = account_number ? String(account_number).trim() : '';
      if (!finalAccountNumber) {
        finalAccountNumber = await generateNextAccountNumber(connection, supply_id, normalizedType);
      }

      const accountId = generateId(ID_PREFIXES.WW_ACCOUNT);
      await connection.query(
        `INSERT INTO ww_consumer_accounts
          (account_id, account_number, account_type, supply_id, entity_id, consumer_name, address, contact_number, email,
           meter_number, connection_date, status, previous_reading, last_reading, unpaid_dues, unpaid_dues_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          finalAccountNumber,
          normalizedType,
          supply_id,
          resolved.entity_id,
          resolved.consumer_name,
          resolved.address,
          resolved.contact_number,
          resolved.email,
          meter_number || null,
          parseDate(connection_date),
          status || 'active',
          parseFloat(previous_reading) || 0,
          parseFloat(previous_reading) || 0,
          openingDues,
          unpaid_dues_notes ? String(unpaid_dues_notes).trim() : null,
        ]
      );

      await logAction(req.user.user_id, 'CREATE_WW_ACCOUNT', `Created account: ${finalAccountNumber}`, accountId);
      res.status(201).json({
        data: { account_id: accountId, account_number: finalAccountNumber },
        message: 'Account created',
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Account number already exists' });
    }
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({
        error: 'Database migration required: run add_waterworks_account_entity.sql, add_waterworks_account_type.sql, and add_waterworks_account_unpaid_dues.sql',
      });
    }
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

router.put('/accounts/:id', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const {
      account_number,
      account_type,
      supply_id,
      entity_id,
      consumer_name,
      address,
      contact_number,
      email,
      meter_number,
      connection_date,
      status,
      previous_reading,
      last_reading,
      unpaid_dues,
      unpaid_dues_notes,
    } = req.body;

    const [existing] = await pool.execute(
      'SELECT account_id, entity_id, last_reading_date FROM ww_consumer_accounts WHERE account_id = ?',
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Account not found' });

    let openingDues = null;
    if (unpaid_dues !== undefined) {
      openingDues = parseUnpaidDues(unpaid_dues);
      if (openingDues === null) {
        return res.status(400).json({ error: 'unpaid_dues must be a valid non-negative amount' });
      }
    }

    let resolvedConsumer = null;
    if (entity_id !== undefined && entity_id) {
      resolvedConsumer = await resolveAccountConsumerFields({
        entity_id,
        consumer_name,
        address,
        contact_number,
        email,
      });
      if (resolvedConsumer.error) {
        return res.status(400).json({ error: resolvedConsumer.error });
      }
    }

    // Initial reading is stored on previous_reading. Display uses last_reading.
    // When no meter reading has been recorded yet, keep both in sync so editing
    // "Initial Reading" actually changes what the list/detail pages show.
    const parsedPrevious =
      previous_reading !== undefined && previous_reading !== null && previous_reading !== ''
        ? parseFloat(previous_reading)
        : null;
    let parsedLast =
      last_reading !== undefined && last_reading !== null && last_reading !== ''
        ? parseFloat(last_reading)
        : null;
    if (parsedLast === null && parsedPrevious !== null && !existing[0].last_reading_date) {
      parsedLast = parsedPrevious;
    }

    await pool.execute(
      `UPDATE ww_consumer_accounts SET
        account_number = COALESCE(?, account_number),
        account_type = COALESCE(?, account_type),
        supply_id = COALESCE(?, supply_id),
        entity_id = COALESCE(?, entity_id),
        consumer_name = COALESCE(?, consumer_name),
        address = COALESCE(?, address),
        contact_number = COALESCE(?, contact_number),
        email = COALESCE(?, email),
        meter_number = COALESCE(?, meter_number),
        connection_date = COALESCE(?, connection_date),
        status = COALESCE(?, status),
        previous_reading = COALESCE(?, previous_reading),
        last_reading = COALESCE(?, last_reading),
        unpaid_dues = COALESCE(?, unpaid_dues),
        unpaid_dues_notes = COALESCE(?, unpaid_dues_notes)
       WHERE account_id = ?`,
      [
        account_number || null,
        account_type ? normalizeAccountType(account_type) : null,
        supply_id || null,
        resolvedConsumer ? resolvedConsumer.entity_id : null,
        resolvedConsumer ? resolvedConsumer.consumer_name : (consumer_name || null),
        resolvedConsumer ? resolvedConsumer.address : (address !== undefined ? address : null),
        resolvedConsumer ? resolvedConsumer.contact_number : (contact_number !== undefined ? contact_number : null),
        resolvedConsumer ? resolvedConsumer.email : (email !== undefined ? email : null),
        meter_number !== undefined ? meter_number : null,
        parseDate(connection_date),
        status || null,
        parsedPrevious,
        parsedLast,
        openingDues,
        unpaid_dues_notes !== undefined ? (unpaid_dues_notes ? String(unpaid_dues_notes).trim() : null) : null,
        req.params.id,
      ]
    );

    await logAction(req.user.user_id, 'UPDATE_WW_ACCOUNT', `Updated account: ${req.params.id}`, req.params.id);
    res.json({ message: 'Account updated' });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

router.delete('/accounts/:id', authorize('SuperAdmin', 'Admin'), async (req, res) => {
  try {
    const [existing] = await pool.execute(
      'SELECT account_id, account_number, consumer_name FROM ww_consumer_accounts WHERE account_id = ?',
      [req.params.id]
    );
    if (!existing.length) return res.status(404).json({ error: 'Account not found' });

    await pool.execute('DELETE FROM ww_consumer_accounts WHERE account_id = ?', [req.params.id]);

    const account = existing[0];
    await logAction(
      req.user.user_id,
      'DELETE_WW_ACCOUNT',
      `Deleted account ${account.account_number} (${account.consumer_name})`,
      req.params.id
    );
    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// ==================== SUPPLY READERS ====================

router.get('/supply-readers', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const { supply_id, user_id } = req.query;
    let where = 'WHERE 1=1';
    const params = [];

    if (supply_id) {
      where += ' AND sr.supply_id = ?';
      params.push(supply_id);
    }
    if (user_id) {
      where += ' AND sr.user_id = ?';
      params.push(user_id);
    }

    const [rows] = await pool.execute(
      `SELECT sr.*, s.supply_name, s.supply_code, u.full_name, u.username
       FROM ww_supply_readers sr
       JOIN ww_water_supplies s ON s.supply_id = sr.supply_id
       JOIN users u ON u.user_id = sr.user_id
       ${where}
       ORDER BY s.supply_name, u.full_name`,
      params
    );

    res.json({ data: rows });
  } catch (error) {
    console.error('Get supply readers error:', error);
    res.status(500).json({ error: 'Failed to fetch supply reader assignments' });
  }
});

router.post('/supply-readers', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const { supply_id, user_id } = req.body;
    if (!supply_id || !user_id) {
      return res.status(400).json({ error: 'supply_id and user_id are required' });
    }

    const assignmentId = generateId(ID_PREFIXES.WW_ASSIGNMENT);
    await pool.execute(
      'INSERT INTO ww_supply_readers (assignment_id, supply_id, user_id) VALUES (?, ?, ?)',
      [assignmentId, supply_id, user_id]
    );

    await logAction(req.user.user_id, 'ASSIGN_WW_READER', `Assigned reader ${user_id} to supply ${supply_id}`, assignmentId);
    res.status(201).json({ data: { assignment_id: assignmentId }, message: 'Reader assigned' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Reader already assigned to this supply' });
    }
    console.error('Assign supply reader error:', error);
    res.status(500).json({ error: 'Failed to assign reader' });
  }
});

router.delete('/supply-readers/:id', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM ww_supply_readers WHERE assignment_id = ?',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Assignment not found' });
    res.json({ message: 'Reader assignment removed' });
  } catch (error) {
    console.error('Remove supply reader error:', error);
    res.status(500).json({ error: 'Failed to remove reader assignment' });
  }
});

// ==================== METER READINGS (ADMIN) ====================

router.get('/readings', async (req, res) => {
  try {
    if (!hasAnyRole(req.user, WW_MANAGER_ROLES)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await waterworksAccounts.listReadingsForUser(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get readings error:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

router.post('/readings', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const result = await createMeterReading({
      ...req.body,
      recorded_by: req.user.user_id,
      auto_verify: true,
    });
    if (result.error) return res.status(result.status).json({ error: result.error });

    await logAction(req.user.user_id, 'CREATE_WW_READING', `Admin created reading for account ${req.body.account_id}`, result.reading_id);
    res.status(201).json({ data: result.data, message: 'Reading recorded and verified' });
  } catch (error) {
    console.error('Create reading error:', error);
    res.status(500).json({ error: 'Failed to create reading' });
  }
});

router.put('/readings/:id/verify', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const { action, rejection_reason } = req.body;
    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be verify or reject' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [readings] = await connection.query(
        'SELECT * FROM ww_meter_readings WHERE reading_id = ?',
        [req.params.id]
      );
      if (!readings.length) {
        await connection.rollback();
        return res.status(404).json({ error: 'Reading not found' });
      }

      const reading = readings[0];
      if (reading.status !== 'pending') {
        await connection.rollback();
        return res.status(400).json({ error: 'Reading is not pending' });
      }

      const nextStatus = action === 'reject' ? 'rejected' : 'verified';
      try {
        assertReadingTransition(reading.status, nextStatus);
      } catch (transitionErr) {
        await connection.rollback();
        return res.status(400).json({ error: transitionErr.message });
      }

      if (action === 'reject') {
        await connection.query(
          `UPDATE ww_meter_readings SET status = 'rejected', verified_by = ?, verified_at = NOW(), rejection_reason = ?
           WHERE reading_id = ?`,
          [req.user.user_id, rejection_reason || null, req.params.id]
        );
      } else {
        await connection.query(
          `UPDATE ww_meter_readings SET status = 'verified', verified_by = ?, verified_at = NOW()
           WHERE reading_id = ?`,
          [req.user.user_id, req.params.id]
        );

        await connection.query(
          `UPDATE ww_consumer_accounts SET
            previous_reading = ?,
            last_reading = ?,
            last_reading_date = ?
           WHERE account_id = ?`,
          [
            reading.previous_reading,
            reading.current_reading,
            reading.reading_date,
            reading.account_id,
          ]
        );
      }

      await connection.commit();
      await logAction(req.user.user_id, `WW_READING_${action.toUpperCase()}`, `Reading ${req.params.id} ${action}ed`, req.params.id);
      res.json({ message: `Reading ${action}ed successfully` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Verify reading error:', error);
    res.status(500).json({ error: 'Failed to verify reading' });
  }
});

async function createMeterReading({
  account_id,
  current_reading,
  reading_date,
  notes,
  period_month,
  period_year,
  recorded_by,
  auto_verify = false,
}) {
  if (!account_id || current_reading === undefined || current_reading === null) {
    return { error: 'account_id and current_reading are required', status: 400 };
  }

  const current = parseFloat(current_reading);
  if (Number.isNaN(current) || current < 0) {
    return { error: 'Invalid current_reading', status: 400 };
  }

  const now = new Date();
  const readingPeriodMonth = parseInt(period_month) || now.getMonth() + 1;
  const readingPeriodYear = parseInt(period_year) || now.getFullYear();
  const finalReadingDate = parseDate(reading_date) || now.toISOString().split('T')[0];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [accounts] = await connection.query(
      'SELECT * FROM ww_consumer_accounts WHERE account_id = ?',
      [account_id]
    );
    if (!accounts.length) {
      await connection.rollback();
      return { error: 'Account not found', status: 404 };
    }

    const account = accounts[0];
    const previousReading = parseFloat(account.last_reading ?? account.previous_reading) || 0;

    if (current < previousReading) {
      await connection.rollback();
      return { error: 'Current reading cannot be less than previous reading', status: 400 };
    }

    const [existing] = await connection.query(
      `SELECT reading_id FROM ww_meter_readings
       WHERE account_id = ? AND reading_period_month = ? AND reading_period_year = ?`,
      [account_id, readingPeriodMonth, readingPeriodYear]
    );
    if (existing.length) {
      await connection.rollback();
      return { error: 'Reading already exists for this billing period', status: 409 };
    }

    const consumption = parseFloat((current - previousReading).toFixed(2));
    const readingId = generateId(ID_PREFIXES.WW_READING);
    const status = auto_verify ? 'verified' : 'pending';

    await connection.query(
      `INSERT INTO ww_meter_readings
        (reading_id, account_id, reading_date, previous_reading, current_reading, consumption,
         reading_period_month, reading_period_year, recorded_by, status, notes, verified_by, verified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        readingId,
        account_id,
        finalReadingDate,
        previousReading,
        current,
        consumption,
        readingPeriodMonth,
        readingPeriodYear,
        recorded_by,
        status,
        notes || null,
        auto_verify ? recorded_by : null,
        auto_verify ? new Date() : null,
      ]
    );

    if (auto_verify) {
      await connection.query(
        `UPDATE ww_consumer_accounts SET previous_reading = ?, last_reading = ?, last_reading_date = ?
         WHERE account_id = ?`,
        [previousReading, current, finalReadingDate, account_id]
      );
    }

    await connection.commit();

    const [created] = await pool.execute(
      'SELECT * FROM ww_meter_readings WHERE reading_id = ?',
      [readingId]
    );

    return { data: created[0], reading_id: readingId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// ==================== BILLING ====================

router.post('/bills/generate', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const { generated, month, year } = await waterworksBilling.generateBills(
      req.body,
      req.user.user_id
    );
    await logAction(
      req.user.user_id,
      'GENERATE_WW_BILLS',
      `Generated ${generated.length} bills for ${month}/${year}`,
      null
    );
    res.status(201).json({
      data: generated,
      message: `Generated ${generated.length} bill(s)`,
    });
  } catch (error) {
    console.error('Generate bills error:', error);
    if (error.status) return res.status(error.status).json({ error: error.message });
    res.status(500).json({ error: 'Failed to generate bills' });
  }
});

router.get('/bills', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const result = await waterworksBilling.listBills(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get bills error:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

router.get('/accounts/:id/billing', async (req, res) => {
  try {
    const accountId = req.params.id;
    const billingMonth = parseInt(req.query.month) || new Date().getMonth() + 1;
    const billingYear = parseInt(req.query.year) || new Date().getFullYear();

    const [accounts] = await pool.execute(
      `SELECT a.*, s.supply_name, s.supply_code, s.location AS supply_location,
              s.rate_per_cubic_meter, s.minimum_charge, s.billing_model
       FROM ww_consumer_accounts a
       JOIN ww_water_supplies s ON s.supply_id = a.supply_id
       WHERE a.account_id = ?`,
      [accountId]
    );
    if (!accounts.length) return res.status(404).json({ error: 'Account not found' });

    const [bills] = await pool.execute(
      `SELECT b.*,
        COALESCE((SELECT SUM(amount_paid) FROM ww_payments p WHERE p.bill_id = b.bill_id), 0) AS total_paid
       FROM ww_bills b
       WHERE b.account_id = ? AND b.billing_month = ? AND b.billing_year = ?`,
      [accountId, billingMonth, billingYear]
    );

    const connection = await pool.getConnection();
    try {
      const outstandingBalance = await getAccountOutstandingBalance(connection, accountId);
      const billingConfig = await getSupplyBillingConfig(connection, accounts[0].supply_id);
      const tiers = billingConfig.tiers;

      let bill = bills[0] || null;
      if (bill && bill.tier_breakdown && typeof bill.tier_breakdown === 'string') {
        try {
          bill = { ...bill, tier_breakdown: JSON.parse(bill.tier_breakdown) };
        } catch {
          /* keep as-is */
        }
      }

      res.json({
        data: {
          account: accounts[0],
          billing_month: billingMonth,
          billing_year: billingYear,
          bill,
          rate_tiers: tiers,
          billing_model: billingConfig.billingModel,
          outstanding_balance: outstandingBalance,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get billing statement error:', error);
    res.status(500).json({ error: 'Failed to fetch billing statement' });
  }
});

// ==================== PAYMENTS ====================

router.get('/payments', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const result = await waterworksBilling.listPayments(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/accounts/:id/payments', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const created = await waterworksBilling.recordPayment(
      req.params.id,
      req.body,
      req.user.user_id
    );
    await logAction(
      req.user.user_id,
      'RECORD_WW_PAYMENT',
      `Recorded payment for account ${created.account_id}`,
      created.payment_id
    );
    res.status(201).json({
      data: { payment_id: created.payment_id },
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Record payment error:', error);
    if (error.status) return res.status(error.status).json({ error: error.message });
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// ==================== REPORTS ====================

router.get('/reports/collection-summary', authorize(...WW_MANAGER_ROLES), async (req, res) => {
  try {
    const { billing_month, billing_year, supply_id } = req.query;

    const billParams = [];
    let billJoinExtra = '';

    if (billing_month) {
      billJoinExtra += ' AND b.billing_month = ?';
      billParams.push(parseInt(billing_month));
    }
    if (billing_year) {
      billJoinExtra += ' AND b.billing_year = ?';
      billParams.push(parseInt(billing_year));
    }

    const supplyParams = supply_id ? [supply_id] : [];
    const supplyFilter = supply_id ? ' AND s.supply_id = ?' : '';

    const [summary] = await pool.execute(
      `SELECT s.supply_id, s.supply_name, s.supply_code,
        COUNT(DISTINCT b.bill_id) AS bill_count,
        COALESCE(SUM(b.total_due), 0) AS total_billed,
        COALESCE(SUM(pay.total_paid), 0) AS total_collected,
        COALESCE(SUM(b.total_due), 0) - COALESCE(SUM(pay.total_paid), 0) AS total_outstanding
       FROM ww_water_supplies s
       LEFT JOIN ww_consumer_accounts a ON a.supply_id = s.supply_id
       LEFT JOIN ww_bills b ON b.account_id = a.account_id${billJoinExtra}
       LEFT JOIN (
         SELECT bill_id, SUM(amount_paid) AS total_paid FROM ww_payments GROUP BY bill_id
       ) pay ON pay.bill_id = b.bill_id
       WHERE s.status = 'active'${supplyFilter}
       GROUP BY s.supply_id, s.supply_name, s.supply_code
       ORDER BY s.supply_name`,
      [...billParams, ...supplyParams]
    );

    const [unpaidAccounts] = await pool.execute(
      `SELECT a.account_id, a.account_number, a.consumer_name, s.supply_name,
        b.total_due, COALESCE(pay.total_paid, 0) AS total_paid,
        b.total_due - COALESCE(pay.total_paid, 0) AS balance_due,
        b.billing_month, b.billing_year
       FROM ww_bills b
       JOIN ww_consumer_accounts a ON a.account_id = b.account_id
       JOIN ww_water_supplies s ON s.supply_id = a.supply_id
       LEFT JOIN (
         SELECT bill_id, SUM(amount_paid) AS total_paid FROM ww_payments GROUP BY bill_id
       ) pay ON pay.bill_id = b.bill_id
       WHERE b.status IN ('unpaid', 'partial')
       ${supply_id ? 'AND a.supply_id = ?' : ''}
       ORDER BY balance_due DESC
       LIMIT 100`,
      supply_id ? [supply_id] : []
    );

    res.json({ data: { by_supply: summary, unpaid_accounts: unpaidAccounts } });
  } catch (error) {
    console.error('Collection summary error:', error);
    res.status(500).json({ error: 'Failed to fetch collection summary' });
  }
});

// ==================== MOBILE API ====================

router.get('/mobile/supplies', async (req, res) => {
  try {
    if (!hasAnyRole(req.user, [...WW_MANAGER_ROLES, 'Meter Reader'])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    let query;
    let params;

    if (hasAnyRole(req.user, WW_MANAGER_ROLES)) {
      query = `SELECT s.supply_id, s.supply_code, s.supply_name, s.location, s.status,
        (SELECT COUNT(*) FROM ww_consumer_accounts a WHERE a.supply_id = s.supply_id AND a.status = 'active') AS account_count
       FROM ww_water_supplies s WHERE s.status = 'active' ORDER BY s.supply_name`;
      params = [];
    } else {
      query = `SELECT s.supply_id, s.supply_code, s.supply_name, s.location, s.status,
        (SELECT COUNT(*) FROM ww_consumer_accounts a WHERE a.supply_id = s.supply_id AND a.status = 'active') AS account_count
       FROM ww_water_supplies s
       INNER JOIN ww_supply_readers sr ON sr.supply_id = s.supply_id AND sr.user_id = ?
       WHERE s.status = 'active'
       ORDER BY s.supply_name`;
      params = [req.user.user_id];
    }

    const [rows] = await pool.execute(query, params);
    res.json({ data: rows });
  } catch (error) {
    console.error('Mobile supplies error:', error);
    res.status(500).json({ error: 'Failed to fetch supplies' });
  }
});

router.get('/mobile/supplies/:id/accounts', async (req, res) => {
  try {
    const supplyId = req.params.id;
    const canAccess = await userCanAccessSupply(req.user.user_id, supplyId, req.user.roles || []);
    if (!canAccess) return res.status(403).json({ error: 'Not assigned to this water supply' });

    const { search, unread_only } = req.query;
    const { page, limit, offset } = parsePagination(req.query);
    const now = new Date();
    const periodMonth = parseInt(req.query.period_month) || now.getMonth() + 1;
    const periodYear = parseInt(req.query.period_year) || now.getFullYear();

    let where = 'WHERE a.supply_id = ? AND a.status = \'active\'';
    const params = [supplyId];

    if (search) {
      where += ' AND (a.account_number LIKE ? OR a.consumer_name LIKE ? OR a.meter_number LIKE ?)';
      const pattern = `%${search}%`;
      params.push(pattern, pattern, pattern);
    }

    if (unread_only === 'true') {
      where += ` AND NOT EXISTS (
        SELECT 1 FROM ww_meter_readings r
        WHERE r.account_id = a.account_id
          AND r.reading_period_month = ? AND r.reading_period_year = ?
      )`;
      params.push(periodMonth, periodYear);
    }

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM ww_consumer_accounts a ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.execute(
      `SELECT a.account_id, a.account_number, a.consumer_name, a.meter_number, a.address,
              a.last_reading, a.last_reading_date, a.previous_reading,
        EXISTS (
          SELECT 1 FROM ww_meter_readings r
          WHERE r.account_id = a.account_id
            AND r.reading_period_month = ? AND r.reading_period_year = ?
        ) AS has_reading_this_period
       FROM ww_consumer_accounts a
       ${where}
       ORDER BY a.account_number ASC
       LIMIT ${offset}, ${limit}`,
      [periodMonth, periodYear, ...params]
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      meta: { period_month: periodMonth, period_year: periodYear },
    });
  } catch (error) {
    console.error('Mobile accounts error:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

router.get('/mobile/accounts/lookup', async (req, res) => {
  try {
    const { account_number, meter_number, supply_id } = req.query;
    if (!supply_id || (!account_number && !meter_number)) {
      return res.status(400).json({ error: 'supply_id and account_number or meter_number required' });
    }

    const canAccess = await userCanAccessSupply(req.user.user_id, supply_id, req.user.roles || []);
    if (!canAccess) return res.status(403).json({ error: 'Not assigned to this water supply' });

    let where = 'WHERE a.supply_id = ? AND a.status = \'active\'';
    const params = [supply_id];

    if (account_number) {
      where += ' AND a.account_number = ?';
      params.push(account_number);
    } else {
      where += ' AND a.meter_number = ?';
      params.push(meter_number);
    }

    const [rows] = await pool.execute(
      `SELECT a.account_id, a.account_number, a.consumer_name, a.meter_number, a.address,
              a.last_reading, a.last_reading_date, a.previous_reading, a.supply_id
       FROM ww_consumer_accounts a ${where} LIMIT 1`,
      params
    );

    if (!rows.length) return res.status(404).json({ error: 'Account not found' });
    res.json({ data: rows[0] });
  } catch (error) {
    console.error('Mobile lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup account' });
  }
});

router.get('/mobile/accounts/:id', async (req, res) => {
  try {
    const [accounts] = await pool.execute(
      `SELECT a.account_id, a.account_number, a.consumer_name, a.meter_number, a.address,
              a.last_reading, a.last_reading_date, a.previous_reading, a.supply_id, a.status,
              s.supply_name
       FROM ww_consumer_accounts a
       JOIN ww_water_supplies s ON s.supply_id = a.supply_id
       WHERE a.account_id = ?`,
      [req.params.id]
    );
    if (!accounts.length) return res.status(404).json({ error: 'Account not found' });

    const canAccess = await userCanAccessSupply(req.user.user_id, accounts[0].supply_id, req.user.roles || []);
    if (!canAccess) return res.status(403).json({ error: 'Not assigned to this water supply' });

    const now = new Date();
    const periodMonth = now.getMonth() + 1;
    const periodYear = now.getFullYear();

    const [periodReading] = await pool.execute(
      `SELECT reading_id, status, current_reading FROM ww_meter_readings
       WHERE account_id = ? AND reading_period_month = ? AND reading_period_year = ?`,
      [req.params.id, periodMonth, periodYear]
    );

    const [latestBill] = await pool.execute(
      `SELECT bill_id, status, total_due, billing_month, billing_year FROM ww_bills
       WHERE account_id = ? ORDER BY billing_year DESC, billing_month DESC LIMIT 1`,
      [req.params.id]
    );

    res.json({
      data: {
        ...accounts[0],
        current_period_reading: periodReading[0] || null,
        latest_bill: latestBill[0] || null,
      },
    });
  } catch (error) {
    console.error('Mobile account detail error:', error);
    res.status(500).json({ error: 'Failed to fetch account' });
  }
});

router.post('/mobile/readings', async (req, res) => {
  try {
    if (!hasAnyRole(req.user, [...WW_MANAGER_ROLES, 'Meter Reader'])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { account_id, supply_id } = req.body;

    const [accounts] = await pool.execute(
      'SELECT supply_id FROM ww_consumer_accounts WHERE account_id = ?',
      [account_id]
    );
    if (!accounts.length) return res.status(404).json({ error: 'Account not found' });

    const effectiveSupplyId = supply_id || accounts[0].supply_id;
    const canAccess = await userCanAccessSupply(req.user.user_id, effectiveSupplyId, req.user.roles || []);
    if (!canAccess) return res.status(403).json({ error: 'Not assigned to this water supply' });

    const result = await createMeterReading({
      ...req.body,
      recorded_by: req.user.user_id,
      auto_verify: false,
    });

    if (result.error) return res.status(result.status).json({ error: result.error });

    await logAction(req.user.user_id, 'MOBILE_WW_READING', `Mobile reading for account ${account_id}`, result.reading_id);
    res.status(201).json({ data: result.data, message: 'Reading submitted for verification' });
  } catch (error) {
    console.error('Mobile submit reading error:', error);
    res.status(500).json({ error: 'Failed to submit reading' });
  }
});

// ========== RATE COMPUTATION (Full Cost Recovery Worksheet) ==========

async function loadWorksheetChildren(connection, worksheetId) {
  const [staff] = await connection.query(
    `SELECT staff_id, role_name, headcount, monthly_rate, sort_order
     FROM ww_rate_worksheet_staff WHERE worksheet_id = ? ORDER BY sort_order ASC, role_name ASC`,
    [worksheetId]
  );
  const [opex] = await connection.query(
    `SELECT opex_id, category_name, amount_monthly, sort_order
     FROM ww_rate_worksheet_opex WHERE worksheet_id = ? ORDER BY sort_order ASC, category_name ASC`,
    [worksheetId]
  );
  const [assets] = await connection.query(
    `SELECT asset_id, component_name, cost, service_life_years, depreciable_percent, sort_order
     FROM ww_rate_worksheet_assets WHERE worksheet_id = ? ORDER BY sort_order ASC, component_name ASC`,
    [worksheetId]
  );
  return { staff, opex, assets };
}

async function replaceWorksheetChildren(connection, worksheetId, staff, opex, assets) {
  await connection.query('DELETE FROM ww_rate_worksheet_staff WHERE worksheet_id = ?', [worksheetId]);
  await connection.query('DELETE FROM ww_rate_worksheet_opex WHERE worksheet_id = ?', [worksheetId]);
  await connection.query('DELETE FROM ww_rate_worksheet_assets WHERE worksheet_id = ?', [worksheetId]);

  for (let i = 0; i < (staff || []).length; i += 1) {
    const row = staff[i];
    await connection.query(
      `INSERT INTO ww_rate_worksheet_staff
        (staff_id, worksheet_id, role_name, headcount, monthly_rate, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        generateId(ID_PREFIXES.WW_RATE_STAFF),
        worksheetId,
        String(row.role_name || '').trim() || `Staff ${i + 1}`,
        Math.max(0, parseInt(row.headcount, 10) || 0),
        parseFloat(row.monthly_rate) || 0,
        parseInt(row.sort_order, 10) || i + 1,
      ]
    );
  }

  for (let i = 0; i < (opex || []).length; i += 1) {
    const row = opex[i];
    await connection.query(
      `INSERT INTO ww_rate_worksheet_opex
        (opex_id, worksheet_id, category_name, amount_monthly, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [
        generateId(ID_PREFIXES.WW_RATE_OPEX),
        worksheetId,
        String(row.category_name || '').trim() || `Expense ${i + 1}`,
        parseFloat(row.amount_monthly) || 0,
        parseInt(row.sort_order, 10) || i + 1,
      ]
    );
  }

  for (let i = 0; i < (assets || []).length; i += 1) {
    const row = assets[i];
    await connection.query(
      `INSERT INTO ww_rate_worksheet_assets
        (asset_id, worksheet_id, component_name, cost, service_life_years, depreciable_percent, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(ID_PREFIXES.WW_RATE_ASSET),
        worksheetId,
        String(row.component_name || '').trim() || `Component ${i + 1}`,
        parseFloat(row.cost) || 0,
        Math.max(0.01, parseFloat(row.service_life_years) || 1),
        parseFloat(row.depreciable_percent) || 0,
        parseInt(row.sort_order, 10) || i + 1,
      ]
    );
  }
}

function parseWorksheetHeader(body, existing = {}) {
  const num = (v, fallback) => {
    if (v === undefined || v === null || v === '') return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const int = (v, fallback) => {
    if (v === undefined || v === null || v === '') return fallback;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  return {
    household_count: int(body.household_count, existing.household_count ?? 0),
    avg_household_size: num(body.avg_household_size, existing.avg_household_size ?? 5),
    liters_per_person_day: num(body.liters_per_person_day, existing.liters_per_person_day ?? 60),
    days_per_month: Math.max(1, int(body.days_per_month, existing.days_per_month ?? 30)),
    inflation_rate_percent: num(body.inflation_rate_percent, existing.inflation_rate_percent ?? 10),
    amortization_monthly: Math.max(0, num(body.amortization_monthly, existing.amortization_monthly ?? 0)),
    expense_benefits: Math.max(0, num(body.expense_benefits, existing.expense_benefits ?? 0)),
    expense_watershed_management: Math.max(0, num(body.expense_watershed_management, existing.expense_watershed_management ?? 0)),
    expense_climate_change: Math.max(0, num(body.expense_climate_change, existing.expense_climate_change ?? 0)),
    expense_capability_building: Math.max(0, num(body.expense_capability_building, existing.expense_capability_building ?? 0)),
    min_volume_m3: Math.max(0, num(body.min_volume_m3, existing.min_volume_m3 ?? 3)),
    excess_block_size_m3: Math.max(0.01, num(body.excess_block_size_m3, existing.excess_block_size_m3 ?? 5)),
    escalation_percent: num(body.escalation_percent, existing.escalation_percent ?? 10),
    markup_tapstand_percent: num(body.markup_tapstand_percent, existing.markup_tapstand_percent ?? 0),
    markup_residential_percent: num(body.markup_residential_percent, existing.markup_residential_percent ?? 10),
    markup_commercial_percent: num(body.markup_commercial_percent, existing.markup_commercial_percent ?? 20),
    notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : (existing.notes || null),
  };
}

router.get('/supplies/:id/rate-computation', async (req, res) => {
  try {
    if (!hasAnyRole(req.user, WW_MANAGER_ROLES)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.params;
    const connection = await pool.getConnection();
    try {
      const [supplies] = await connection.query(
        'SELECT supply_id, supply_code, supply_name FROM ww_water_supplies WHERE supply_id = ?',
        [id]
      );
      if (!supplies.length) {
        return res.status(404).json({ error: 'Water supply not found' });
      }

      const [rows] = await connection.query(
        'SELECT * FROM ww_rate_worksheets WHERE supply_id = ?',
        [id]
      );

      if (!rows.length) {
        const defaults = buildDefaultWorksheetPayload();
        const computation = computeRateWorksheet(defaults, defaults.staff, defaults.opex, defaults.assets);
        return res.json({
          data: {
            supply: supplies[0],
            worksheet: null,
            ...defaults,
            computation,
            is_default: true,
          },
        });
      }

      const worksheet = rows[0];
      const children = await loadWorksheetChildren(connection, worksheet.worksheet_id);
      const computation = computeRateWorksheet(worksheet, children.staff, children.opex, children.assets);

      res.json({
        data: {
          supply: supplies[0],
          worksheet,
          household_count: worksheet.household_count,
          avg_household_size: worksheet.avg_household_size,
          liters_per_person_day: worksheet.liters_per_person_day,
          days_per_month: worksheet.days_per_month,
          inflation_rate_percent: worksheet.inflation_rate_percent,
          amortization_monthly: worksheet.amortization_monthly,
          expense_benefits: worksheet.expense_benefits,
          expense_watershed_management: worksheet.expense_watershed_management,
          expense_climate_change: worksheet.expense_climate_change,
          expense_capability_building: worksheet.expense_capability_building,
          min_volume_m3: worksheet.min_volume_m3,
          excess_block_size_m3: worksheet.excess_block_size_m3,
          escalation_percent: worksheet.escalation_percent,
          markup_tapstand_percent: worksheet.markup_tapstand_percent,
          markup_residential_percent: worksheet.markup_residential_percent,
          markup_commercial_percent: worksheet.markup_commercial_percent,
          notes: worksheet.notes,
          staff: children.staff,
          opex: children.opex,
          assets: children.assets,
          computation,
          is_default: false,
        },
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Get rate computation error:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        error: 'Rate computation tables missing. Run database/migrations/add_waterworks_rate_computation.sql',
      });
    }
    res.status(500).json({ error: 'Failed to load rate computation' });
  }
});

router.put('/supplies/:id/rate-computation', async (req, res) => {
  try {
    authorize(...WW_MANAGER_ROLES)(req, res, async () => {
      const { id } = req.params;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [supplies] = await connection.query(
          'SELECT supply_id, supply_code, supply_name FROM ww_water_supplies WHERE supply_id = ?',
          [id]
        );
        if (!supplies.length) {
          await connection.rollback();
          return res.status(404).json({ error: 'Water supply not found' });
        }

        const [existingRows] = await connection.query(
          'SELECT * FROM ww_rate_worksheets WHERE supply_id = ?',
          [id]
        );

        const header = parseWorksheetHeader(req.body, existingRows[0] || {});
        let worksheetId = existingRows[0]?.worksheet_id;

        if (!worksheetId) {
          worksheetId = generateId(ID_PREFIXES.WW_RATE_WS);
          await connection.query(
            `INSERT INTO ww_rate_worksheets (
              worksheet_id, supply_id, household_count, avg_household_size, liters_per_person_day,
              days_per_month, inflation_rate_percent, amortization_monthly,
              expense_benefits, expense_watershed_management, expense_climate_change, expense_capability_building,
              min_volume_m3, excess_block_size_m3, escalation_percent, markup_tapstand_percent,
              markup_residential_percent, markup_commercial_percent, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              worksheetId, id, header.household_count, header.avg_household_size, header.liters_per_person_day,
              header.days_per_month, header.inflation_rate_percent, header.amortization_monthly,
              header.expense_benefits, header.expense_watershed_management, header.expense_climate_change, header.expense_capability_building,
              header.min_volume_m3, header.excess_block_size_m3, header.escalation_percent, header.markup_tapstand_percent,
              header.markup_residential_percent, header.markup_commercial_percent, header.notes,
            ]
          );
        } else {
          await connection.query(
            `UPDATE ww_rate_worksheets SET
              household_count = ?, avg_household_size = ?, liters_per_person_day = ?,
              days_per_month = ?, inflation_rate_percent = ?, amortization_monthly = ?,
              expense_benefits = ?, expense_watershed_management = ?, expense_climate_change = ?, expense_capability_building = ?,
              min_volume_m3 = ?, excess_block_size_m3 = ?, escalation_percent = ?,
              markup_tapstand_percent = ?, markup_residential_percent = ?, markup_commercial_percent = ?,
              notes = ?
             WHERE worksheet_id = ?`,
            [
              header.household_count, header.avg_household_size, header.liters_per_person_day,
              header.days_per_month, header.inflation_rate_percent, header.amortization_monthly,
              header.expense_benefits, header.expense_watershed_management, header.expense_climate_change, header.expense_capability_building,
              header.min_volume_m3, header.excess_block_size_m3, header.escalation_percent,
              header.markup_tapstand_percent, header.markup_residential_percent, header.markup_commercial_percent,
              header.notes, worksheetId,
            ]
          );
        }

        const defaults = buildDefaultWorksheetPayload();
        const staff = Array.isArray(req.body.staff) ? req.body.staff : defaults.staff;
        const opex = Array.isArray(req.body.opex) ? req.body.opex : defaults.opex;
        const assets = Array.isArray(req.body.assets) ? req.body.assets : defaults.assets;

        await replaceWorksheetChildren(connection, worksheetId, staff, opex, assets);

        await logAction(
          req.user.user_id,
          existingRows.length ? 'UPDATE' : 'CREATE',
          'ww_rate_worksheets',
          worksheetId,
          `Saved rate computation for supply ${supplies[0].supply_code}`
        );

        await connection.commit();

        const [worksheetRows] = await connection.query(
          'SELECT * FROM ww_rate_worksheets WHERE worksheet_id = ?',
          [worksheetId]
        );
        const children = await loadWorksheetChildren(connection, worksheetId);
        const computation = computeRateWorksheet(
          worksheetRows[0],
          children.staff,
          children.opex,
          children.assets
        );

        res.json({
          data: {
            supply: supplies[0],
            worksheet: worksheetRows[0],
            staff: children.staff,
            opex: children.opex,
            assets: children.assets,
            computation,
            is_default: false,
          },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Save rate computation error:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({
        error: 'Rate computation tables missing. Run database/migrations/add_waterworks_rate_computation.sql',
      });
    }
    res.status(500).json({ error: 'Failed to save rate computation' });
  }
});

router.post('/supplies/:id/rate-computation/apply', async (req, res) => {
  try {
    authorize(...WW_MANAGER_ROLES)(req, res, async () => {
      const { id } = req.params;
      const classificationKey = String(req.body.classification || 'residential').toLowerCase();
      const allowed = ['tapstand', 'residential', 'commercial'];
      if (!allowed.includes(classificationKey)) {
        return res.status(400).json({ error: 'classification must be tapstand, residential, or commercial' });
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const [supplies] = await connection.query(
          'SELECT supply_id, supply_code, supply_name FROM ww_water_supplies WHERE supply_id = ?',
          [id]
        );
        if (!supplies.length) {
          await connection.rollback();
          return res.status(404).json({ error: 'Water supply not found' });
        }

        const [rows] = await connection.query(
          'SELECT * FROM ww_rate_worksheets WHERE supply_id = ?',
          [id]
        );
        if (!rows.length) {
          await connection.rollback();
          return res.status(400).json({ error: 'Save the rate computation worksheet before applying rates' });
        }

        const children = await loadWorksheetChildren(connection, rows[0].worksheet_id);
        const computation = computeRateWorksheet(rows[0], children.staff, children.opex, children.assets);
        const classification = computation.classifications[classificationKey];
        if (!classification || !computation.base_rate) {
          await connection.rollback();
          return res.status(400).json({
            error: 'Cannot apply rates: projected volume or expenses are zero. Complete demand and cost entries first.',
          });
        }

        const tiers = classificationToProgressiveTiers(classification);
        const normalized = normalizeRateTiersInput(tiers, 'progressive');
        if (normalized.error) {
          await connection.rollback();
          return res.status(400).json({ error: normalized.error });
        }

        await saveSupplyRateTiers(connection, id, normalized.tiers, 'progressive');

        await logAction(
          req.user.user_id,
          'UPDATE',
          'ww_water_supplies',
          id,
          `Applied ${classificationKey} rate schedule from cost-recovery worksheet (base ₱${computation.base_rate}/m³)`
        );

        await connection.commit();

        const rateTiers = await getRateTiersForSupply(connection, id);

        res.json({
          message: `Applied ${classificationKey} schedule to supply rates (progressive billing)`,
          data: {
            supply_id: id,
            classification: classificationKey,
            base_rate: computation.base_rate,
            basic_rate: classification.basic_rate,
            minimum_bill: classification.minimum_bill,
            billing_model: 'progressive',
            rate_tiers: rateTiers,
          },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error('Apply rate computation error:', error);
    res.status(500).json({ error: 'Failed to apply computed rates to supply' });
  }
});

router.get('/mobile/readings/my-recent', async (req, res) => {
  try {
    if (!hasAnyRole(req.user, [...WW_MANAGER_ROLES, 'Meter Reader'])) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { page, limit, offset } = parsePagination(req.query);

    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS total FROM ww_meter_readings WHERE recorded_by = ?',
      [req.user.user_id]
    );
    const total = countRows[0]?.total || 0;

    const [rows] = await pool.execute(
      `SELECT r.reading_id, r.account_id, r.reading_date, r.previous_reading, r.current_reading,
              r.consumption, r.reading_period_month, r.reading_period_year, r.status, r.notes, r.created_at,
              a.account_number, a.consumer_name, a.meter_number, s.supply_name
       FROM ww_meter_readings r
       JOIN ww_consumer_accounts a ON a.account_id = r.account_id
       JOIN ww_water_supplies s ON s.supply_id = a.supply_id
       WHERE r.recorded_by = ?
       ORDER BY r.created_at DESC
       LIMIT ${offset}, ${limit}`,
      [req.user.user_id]
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Mobile recent readings error:', error);
    res.status(500).json({ error: 'Failed to fetch recent readings' });
  }
});

module.exports = router;
