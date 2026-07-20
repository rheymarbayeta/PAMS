const pool = require('../../config/database');
const { recordLedgerEntry } = require('../../utils/paymentLedger');
const {
  getRightsBalanceSnapshot,
  getRightsRunningBalanceStart,
  getRentalTotalCollected,
  getRentalRunningTotalStart,
} = require('../../utils/leaseContractBalances');
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

/**
 * Record rights and/or rental payment for a lease contract (Phase 9).
 */
async function recordLeasePayment(contractId, body, userId) {
  const { payment_date, rights_amount, rental_amount, or_number } = body;

  if (!payment_date || (!rights_amount && !rental_amount)) {
    throw httpError(400, 'Payment date and at least one payment amount are required');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const paymentDate = new Date(payment_date);
    const period_month = paymentDate.getMonth() + 1;
    const period_year = paymentDate.getFullYear();

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
          period_month,
          period_year,
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
          period_month,
          period_year,
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
          notes: `Rights ${period_month}/${period_year}`,
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
          notes: `Rental ${period_month}/${period_year}`,
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
      period_month,
      period_year,
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
  recordLeasePayment,
};
