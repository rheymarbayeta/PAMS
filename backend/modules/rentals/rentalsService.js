const pool = require('../../config/database');
const { recordLedgerEntry } = require('../../utils/paymentLedger');
const {
  getRightsBalanceSnapshot,
  getRightsRunningBalanceStart,
  getRentalTotalCollected,
  getRentalRunningTotalStart,
} = require('../../utils/leaseContractBalances');
const {
  resolveMonthlyRentalForPeriod,
  sumRentalDueThroughPrev,
} = require('../../utils/rentalSchedule');
const repo = require('./rentalsRepository');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function listLeaseContracts() {
  return repo.listLeaseContractsWithUnits();
}

async function listLessees() {
  return repo.listLessees();
}

async function recalculateRightsPaymentBalances(connection, contractId) {
  const [contract] = await connection.query(
    `SELECT principal_amount, downpayment, is_legacy_account, opening_rights_paid, opening_rights_balance
     FROM lease_contracts WHERE id = ?`,
    [contractId]
  );
  if (!contract.length) return;

  const [payments] = await connection.query(
    `SELECT id, amount_paid FROM payment_history_rights
     WHERE lease_contract_id = ? ORDER BY payment_date ASC, id ASC`,
    [contractId]
  );

  let runningBalance = getRightsRunningBalanceStart(contract[0]);
  for (const payment of payments) {
    runningBalance -= parseFloat(payment.amount_paid) || 0;
    await connection.query(
      'UPDATE payment_history_rights SET balance = ?, collectible = ? WHERE id = ?',
      [runningBalance, parseFloat(payment.amount_paid) || 0, payment.id]
    );
  }
}

async function recalculateRentalPaymentBalances(connection, contractId) {
  const [contract] = await connection.query(
    `SELECT opening_rental_paid, is_legacy_account FROM lease_contracts WHERE id = ?`,
    [contractId]
  );

  const [payments] = await connection.query(
    `SELECT id, amount_paid FROM payment_history_rental
     WHERE lease_contract_id = ? ORDER BY payment_date ASC, id ASC`,
    [contractId]
  );

  let runningTotal = contract.length ? getRentalRunningTotalStart(contract[0]) : 0;
  for (const payment of payments) {
    runningTotal += parseFloat(payment.amount_paid) || 0;
    await connection.query(
      'UPDATE payment_history_rental SET balance = ?, collectible = ? WHERE id = ?',
      [runningTotal, parseFloat(payment.amount_paid) || 0, payment.id]
    );
  }
}

async function getRentalPaidThrough(connection, contractId, throughMonth, throughYear, openingRentalPaid = 0) {
  const [rows] = await connection.query(
    `
    SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM payment_history_rental
    WHERE lease_contract_id = ?
      AND (
        period_year < ?
        OR (period_year = ? AND period_month <= ?)
      )
  `,
    [contractId, throughYear, throughYear, throughMonth]
  );
  return getRentalTotalCollected({ opening_rental_paid: openingRentalPaid }, parseFloat(rows[0].total_paid) || 0);
}

async function getRentalPaidForPeriod(connection, contractId, month, year) {
  const [rows] = await connection.query(
    `
    SELECT COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM payment_history_rental
    WHERE lease_contract_id = ? AND period_month = ? AND period_year = ?
  `,
    [contractId, month, year]
  );
  return parseFloat(rows[0].total_paid) || 0;
}

/**
 * Preview amounts for recording a payment against a billing month.
 * Uses rental computation schedule when present.
 */
async function getPaymentPreview(contractId, month, year) {
  const billingMonth = parseInt(month, 10);
  const billingYear = parseInt(year, 10);

  if (!billingMonth || billingMonth < 1 || billingMonth > 12 || !billingYear || billingYear < 2000) {
    throw httpError(400, 'Valid billing month and year are required');
  }

  const connection = await pool.getConnection();
  try {
    const [contracts] = await connection.query(
      `
      SELECT
        id,
        contract_effective_date,
        monthly_rights_amount,
        monthly_rental_amount,
        outstanding_rental_balance,
        opening_rental_paid,
        is_legacy_account
      FROM lease_contracts
      WHERE id = ?
    `,
      [contractId]
    );

    if (!contracts.length) {
      throw httpError(404, 'Lease contract not found');
    }

    const contract = contracts[0];
    const prevMonth = billingMonth === 1 ? 12 : billingMonth - 1;
    const prevYear = billingMonth === 1 ? billingYear - 1 : billingYear;

    const resolved = await resolveMonthlyRentalForPeriod(
      connection,
      contractId,
      billingMonth,
      billingYear,
      contract.monthly_rental_amount
    );

    const totalDueThroughPrev = await sumRentalDueThroughPrev(
      connection,
      contract,
      prevMonth,
      prevYear
    );
    const totalPaidThroughPrev = await getRentalPaidThrough(
      connection,
      contractId,
      prevMonth,
      prevYear,
      contract.opening_rental_paid
    );
    const outstandingBalance = Math.max(
      0,
      parseFloat((totalDueThroughPrev - totalPaidThroughPrev).toFixed(2))
    );

    const paidThisMonth = await getRentalPaidForPeriod(
      connection,
      contractId,
      billingMonth,
      billingYear
    );
    const thisMonthRental = parseFloat(resolved.monthlyRental) || 0;
    const remainingThisMonth = Math.max(
      0,
      parseFloat((thisMonthRental - paidThisMonth).toFixed(2))
    );
    const suggestedRentalAmount =
      remainingThisMonth > 0 ? remainingThisMonth : thisMonthRental;

    const scheduleRow = resolved.scheduleRow
      ? {
          period_label: resolved.scheduleRow.period_label,
          rent_type: resolved.scheduleRow.rent_type,
          basic_monthly_rent: parseFloat(resolved.scheduleRow.basic_monthly_rent) || 0,
          vat_amount: parseFloat(resolved.scheduleRow.vat_amount) || 0,
          total_monthly_rent: parseFloat(resolved.scheduleRow.total_monthly_rent) || 0,
          wht_amount: parseFloat(resolved.scheduleRow.wht_amount) || 0,
          net_monthly_rent: parseFloat(resolved.scheduleRow.net_monthly_rent) || 0,
          date_from: resolved.scheduleRow.date_from,
          date_to: resolved.scheduleRow.date_to,
        }
      : null;

    return {
      billing_month: billingMonth,
      billing_year: billingYear,
      has_schedule: !!resolved.hasSchedule,
      schedule_row: scheduleRow,
      monthly_rights_amount: parseFloat(contract.monthly_rights_amount) || 0,
      this_month_rental: thisMonthRental,
      paid_this_month: paidThisMonth,
      remaining_this_month: remainingThisMonth,
      suggested_rental_amount: suggestedRentalAmount,
      outstanding_balance: outstandingBalance,
      total_due_through_prev: totalDueThroughPrev,
      total_paid_through_prev: totalPaidThroughPrev,
    };
  } finally {
    connection.release();
  }
}

/**
 * Record rights and/or rental payment for a lease contract (Phase 9).
 */
async function recordLeasePayment(contractId, body, userId) {
  const { payment_date, rights_amount, rental_amount, or_number, period_month, period_year } = body;

  if (!payment_date || (!rights_amount && !rental_amount)) {
    throw httpError(400, 'Payment date and at least one payment amount are required');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const paymentDate = new Date(payment_date);
    let nextPeriodMonth = paymentDate.getMonth() + 1;
    let nextPeriodYear = paymentDate.getFullYear();

    if (period_month !== undefined && period_month !== null && period_month !== '') {
      nextPeriodMonth = parseInt(period_month, 10);
    }
    if (period_year !== undefined && period_year !== null && period_year !== '') {
      nextPeriodYear = parseInt(period_year, 10);
    }

    if (!nextPeriodMonth || nextPeriodMonth < 1 || nextPeriodMonth > 12) {
      throw httpError(400, 'Billing month must be between 1 and 12');
    }
    if (!nextPeriodYear || nextPeriodYear < 2000) {
      throw httpError(400, 'Billing year is invalid');
    }

    const period_month_value = nextPeriodMonth;
    const period_year_value = nextPeriodYear;

    const [leaseContract] = await connection.query(
      `
      SELECT
        principal_amount,
        downpayment,
        is_legacy_account,
        opening_rights_paid,
        opening_rights_balance,
        opening_rental_paid
      FROM lease_contracts
      WHERE id = ?
    `,
      [contractId]
    );

    if (!leaseContract || leaseContract.length === 0) {
      throw httpError(404, 'Lease contract not found');
    }

    const contract = leaseContract[0];
    let recordedRights = false;
    let recordedRental = false;

    if (rights_amount && parseFloat(rights_amount) > 0) {
      const rightsPaymentAmount = parseFloat(rights_amount);
      await connection.query(
        `
        INSERT INTO payment_history_rights
        (lease_contract_id, period_month, period_year, or_number, payment_date, amount_paid, collectible, delinquent, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          contractId,
          period_month_value,
          period_year_value,
          or_number || null,
          payment_date,
          rightsPaymentAmount,
          rightsPaymentAmount,
          0,
          0,
        ]
      );
      recordedRights = true;
    }

    if (rental_amount && parseFloat(rental_amount) > 0) {
      const rentalPaymentAmount = parseFloat(rental_amount);
      await connection.query(
        `
        INSERT INTO payment_history_rental
        (lease_contract_id, period_month, period_year, or_number, payment_date, amount_paid, collectible, delinquent, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          contractId,
          period_month_value,
          period_year_value,
          or_number || null,
          payment_date,
          rentalPaymentAmount,
          rentalPaymentAmount,
          0,
          0,
        ]
      );
      recordedRental = true;
    }

    if (recordedRights) {
      await recalculateRightsPaymentBalances(connection, contractId);
      try {
        await recordLedgerEntry({
          module: 'rentals',
          referenceType: 'lease_rights',
          referenceId: String(contractId),
          amount: parseFloat(rights_amount),
          paymentDate: payment_date,
          receiptNo: or_number || null,
          recordedBy: userId,
          sourceTable: 'payment_history_rights',
          sourceId: String(contractId),
          notes: `Rights ${period_month_value}/${period_year_value}`,
          connection,
        });
      } catch (ledgerErr) {
        console.error('[RR Payment] Rights ledger write failed (non-fatal):', ledgerErr.message);
      }
    }

    if (recordedRental) {
      await recalculateRentalPaymentBalances(connection, contractId);
      try {
        await recordLedgerEntry({
          module: 'rentals',
          referenceType: 'lease_rental',
          referenceId: String(contractId),
          amount: parseFloat(rental_amount),
          paymentDate: payment_date,
          receiptNo: or_number || null,
          recordedBy: userId,
          sourceTable: 'payment_history_rental',
          sourceId: String(contractId),
          notes: `Rental ${period_month_value}/${period_year_value}`,
          connection,
        });
      } catch (ledgerErr) {
        console.error('[RR Payment] Rental ledger write failed (non-fatal):', ledgerErr.message);
      }
    }

    const [rightsPaid] = await connection.query(
      `
      SELECT COALESCE(SUM(amount_paid), 0) as total_paid
      FROM payment_history_rights
      WHERE lease_contract_id = ?
    `,
      [contractId]
    );
    const rightsSnapshot = getRightsBalanceSnapshot(
      contract,
      parseFloat(rightsPaid[0].total_paid) || 0
    );
    const currentRightsBalance = rightsSnapshot.rightsBalance;

    const [rentalPaid] = await connection.query(
      `
      SELECT COALESCE(SUM(amount_paid), 0) as total_paid
      FROM payment_history_rental
      WHERE lease_contract_id = ?
    `,
      [contractId]
    );
    const currentRentalBalance = getRentalTotalCollected(
      contract,
      parseFloat(rentalPaid[0].total_paid) || 0
    );

    await connection.commit();

    return {
      contract_id: contractId,
      period_month: period_month_value,
      period_year: period_year_value,
      rights_amount: rights_amount ? parseFloat(rights_amount) : null,
      rental_amount: rental_amount ? parseFloat(rental_amount) : null,
      or_number,
      payment_date,
      remaining_balance: {
        rights: currentRightsBalance,
        rental: currentRentalBalance,
        total: currentRightsBalance + currentRentalBalance,
      },
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  listLeaseContracts,
  listLessees,
  getRightsBalanceSnapshot,
  getRentalTotalCollected,
  recalculateRightsPaymentBalances,
  recalculateRentalPaymentBalances,
  getPaymentPreview,
  recordLeasePayment,
};
