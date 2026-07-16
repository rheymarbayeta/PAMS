const pool = require('../../config/database');

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
      lc.status,
      lc.created_at
    FROM lease_contracts lc
    JOIN lessees l ON lc.lessee_id = l.id
    JOIN properties p ON lc.property_id = p.id
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
    result.push({ ...contract, property_units: units });
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
