const pool = require('../../config/database');
const { generateId, ID_PREFIXES } = require('../../utils/idGenerator');
const { recordLedgerEntry } = require('../../utils/paymentLedger');
const {
  calculateBillAmounts,
  getRateTiersForSupply,
} = require('../../utils/waterworksBilling');
const billingRepo = require('./billingRepository');
const accountsService = require('./accountsService');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseDate(dateValue) {
  if (!dateValue) return null;
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  return dateValue;
}

async function listBills(query) {
  return billingRepo.listBills(query);
}

async function listPayments(query) {
  return billingRepo.listPayments(query);
}

/**
 * Generate bills for verified readings in a billing period (Phase 7).
 */
async function generateBills(body, userId) {
  const { billing_month, billing_year, supply_id, account_ids } = body;
  const month = parseInt(billing_month, 10);
  const year = parseInt(billing_year, 10);

  if (!month || !year) {
    throw httpError(400, 'billing_month and billing_year are required');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const surchargeSettings = await billingRepo.getBillingSurchargeSettings(connection);

    let accountFilter = `AND r.reading_period_month = ? AND r.reading_period_year = ? AND r.status = 'verified'`;
    const params = [month, year];

    if (supply_id) {
      accountFilter += ' AND a.supply_id = ?';
      params.push(supply_id);
    }

    let accountIdsClause = '';
    if (Array.isArray(account_ids) && account_ids.length) {
      accountIdsClause = ` AND a.account_id IN (${account_ids.map(() => '?').join(',')})`;
      params.push(...account_ids);
    }

    const [readings] = await connection.query(
      `SELECT r.*, a.account_id, a.supply_id, s.rate_per_cubic_meter, s.minimum_charge, s.billing_model
       FROM ww_meter_readings r
       JOIN ww_consumer_accounts a ON a.account_id = r.account_id
       JOIN ww_water_supplies s ON s.supply_id = a.supply_id
       WHERE 1=1 ${accountFilter}${accountIdsClause}
         AND NOT EXISTS (
           SELECT 1 FROM ww_bills b
           WHERE b.account_id = a.account_id AND b.billing_month = ? AND b.billing_year = ?
         )`,
      [...params, month, year]
    );

    const generated = [];

    for (const reading of readings) {
      const previousBalance = await billingRepo.getAccountOutstandingBalance(
        connection,
        reading.account_id
      );
      const rate = parseFloat(reading.rate_per_cubic_meter) || 0;
      const minimumCharge = parseFloat(reading.minimum_charge) || 100.6;
      const consumption = parseFloat(reading.consumption) || 0;
      const tiers = await getRateTiersForSupply(connection, reading.supply_id);

      const { amountDue, surchargeAmount, totalDue, tierBreakdown, effectiveRate } =
        calculateBillAmounts({
          consumption,
          rate,
          minimumCharge,
          previousBalance,
          surchargeSettings,
          tiers,
          billingModel: reading.billing_model || 'progressive',
        });

      const billId = generateId(ID_PREFIXES.WW_BILL);
      await connection.query(
        `INSERT INTO ww_bills
          (bill_id, account_id, reading_id, billing_month, billing_year,
           previous_reading, current_reading, consumption, rate_applied,
           amount_due, tier_breakdown, previous_balance, surcharge_amount, total_due, status, generated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?)`,
        [
          billId,
          reading.account_id,
          reading.reading_id,
          month,
          year,
          reading.previous_reading,
          reading.current_reading,
          consumption,
          effectiveRate,
          amountDue,
          tierBreakdown.length ? JSON.stringify(tierBreakdown) : null,
          previousBalance,
          surchargeAmount,
          totalDue,
          userId,
        ]
      );

      generated.push({ bill_id: billId, account_id: reading.account_id, total_due: totalDue });

      const [acctRows] = await connection.query(
        'SELECT unpaid_dues FROM ww_consumer_accounts WHERE account_id = ?',
        [reading.account_id]
      );
      if (parseFloat(acctRows[0]?.unpaid_dues) > 0) {
        await connection.query(
          'UPDATE ww_consumer_accounts SET unpaid_dues = 0 WHERE account_id = ?',
          [reading.account_id]
        );
      }
    }

    await connection.commit();
    return { generated, month, year };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Record a waterworks payment + ledger dual-write (Phase 7).
 */
async function recordPayment(accountId, body, userId) {
  const { amount_paid, bill_id, payment_date, or_number, payment_method, notes } = body;

  const amount = parseFloat(amount_paid);
  if (Number.isNaN(amount) || amount <= 0) {
    throw httpError(400, 'Valid amount_paid is required');
  }

  const account = await billingRepo.findAccountForPayment(accountId);
  if (!account) throw httpError(404, 'Account not found');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const paymentId = generateId(ID_PREFIXES.WW_PAYMENT);
    const finalDate = parseDate(payment_date) || new Date().toISOString().split('T')[0];

    await connection.query(
      `INSERT INTO ww_payments
        (payment_id, account_id, bill_id, payment_date, amount_paid, or_number, payment_method, recorded_by, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentId,
        accountId,
        bill_id || null,
        finalDate,
        amount,
        or_number || null,
        payment_method || 'cash',
        userId,
        notes || null,
      ]
    );

    if (bill_id) {
      await billingRepo.updateBillStatus(connection, bill_id);
    } else {
      const [acctRows] = await connection.query(
        'SELECT unpaid_dues FROM ww_consumer_accounts WHERE account_id = ?',
        [accountId]
      );
      const openingDues = parseFloat(acctRows[0]?.unpaid_dues) || 0;
      if (openingDues > 0) {
        await connection.query(
          'UPDATE ww_consumer_accounts SET unpaid_dues = GREATEST(0, unpaid_dues - ?) WHERE account_id = ?',
          [Math.min(amount, openingDues), accountId]
        );
      }
    }

    try {
      await recordLedgerEntry({
        module: 'waterworks',
        referenceType: bill_id ? 'bill' : 'account',
        referenceId: bill_id || accountId,
        entityId: account.entity_id || null,
        amount,
        paymentDate: finalDate,
        receiptNo: or_number || null,
        method: payment_method || 'cash',
        recordedBy: userId,
        sourceTable: 'ww_payments',
        sourceId: paymentId,
        notes: notes || null,
        connection,
      });
    } catch (ledgerErr) {
      console.error('[WW Payment] Ledger write failed (non-fatal):', ledgerErr.message);
    }

    await connection.commit();
    return { payment_id: paymentId, account_id: accountId };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

module.exports = {
  listBills,
  listPayments,
  generateBills,
  recordPayment,
  getBillingSurchargeSettings: billingRepo.getBillingSurchargeSettings,
  getAccountOutstandingBalance: billingRepo.getAccountOutstandingBalance,
  updateBillStatus: billingRepo.updateBillStatus,
  listAccountsForUser: accountsService.listAccountsForUser,
  getAccount: accountsService.getAccount,
  listReadingsForUser: accountsService.listReadingsForUser,
};
