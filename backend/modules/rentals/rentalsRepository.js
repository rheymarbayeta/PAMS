const pool = require('../../config/database');
const {
  getRightsBalanceSnapshot,
  getRentalTotalCollected,
} = require('../../utils/leaseContractBalances');

/**
 * Rights & Rentals data access (Phase 4 domain extract).
 */

async function listLeaseContractsWithUnits() {
  const [contracts] = await pool.execute(`
    SELECT
      lc.id,
      lc.lessee_id,
      l.name as lessee_name,
      l.contact_number,
      lc.property_id,
      p.property_name,
      p.property_code,
      lc.contract_effective_date,
      lc.contract_termination_date,
      lc.principal_amount,
      lc.monthly_rights_amount,
      lc.monthly_rental_amount,
      lc.downpayment,
      lc.is_legacy_account,
      lc.opening_rights_paid,
      lc.opening_rights_balance,
      lc.opening_rental_paid,
      lc.status,
      lc.created_at,
      COALESCE(rp.history_rights_paid, 0) AS history_rights_paid,
      COALESCE(rt.history_rental_paid, 0) AS history_rental_paid
    FROM lease_contracts lc
    JOIN lessees l ON lc.lessee_id = l.id
    JOIN properties p ON lc.property_id = p.id
    LEFT JOIN (
      SELECT lease_contract_id, SUM(amount_paid) AS history_rights_paid
      FROM payment_history_rights
      GROUP BY lease_contract_id
    ) rp ON rp.lease_contract_id = lc.id
    LEFT JOIN (
      SELECT lease_contract_id, SUM(amount_paid) AS history_rental_paid
      FROM payment_history_rental
      GROUP BY lease_contract_id
    ) rt ON rt.lease_contract_id = lc.id
    ORDER BY lc.contract_effective_date DESC
  `);

  const result = [];
  for (const contract of contracts) {
    let units = [];
    try {
      const [rows] = await pool.execute(
        `SELECT
           pu.id,
           pu.stall_number,
           pu.floor_level,
           pu.unit_description,
           pu.area_sqm,
           pu.status
         FROM lease_contract_units lcu
         JOIN property_units pu ON lcu.property_unit_id = pu.id
         WHERE lcu.lease_contract_id = ?`,
        [contract.id]
      );
      units = rows;
    } catch {
      units = [];
    }

    const historyRights = parseFloat(contract.history_rights_paid) || 0;
    const historyRental = parseFloat(contract.history_rental_paid) || 0;
    const rightsSnapshot = getRightsBalanceSnapshot(contract, historyRights);
    const totalRentalPaid = getRentalTotalCollected(contract, historyRental);

    const {
      history_rights_paid,
      history_rental_paid,
      is_legacy_account,
      opening_rights_paid,
      opening_rights_balance,
      opening_rental_paid,
      ...publicContract
    } = contract;

    result.push({
      ...publicContract,
      property_units: units,
      total_rights_paid: rightsSnapshot.totalRightsPaid,
      total_rental_paid: totalRentalPaid,
      total_paid: parseFloat((rightsSnapshot.totalRightsPaid + totalRentalPaid).toFixed(2)),
    });
  }
  return result;
}

async function listLessees() {
  const [rows] = await pool.execute(
    `SELECT l.id, l.name, l.contact_number, l.email,
            COUNT(lc.id) AS contract_count
     FROM lessees l
     LEFT JOIN lease_contracts lc ON lc.lessee_id = l.id
     GROUP BY l.id, l.name, l.contact_number, l.email
     ORDER BY l.name ASC
  `
  );
  return rows;
}

module.exports = { listLeaseContractsWithUnits, listLessees };
