const pool = require('../../config/database');

/**
 * Applications data access (permits module — Phase 1 pilot).
 */

async function countApplications({ whereClause, params }) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM applications a
    LEFT JOIN entities e ON a.entity_id = e.entity_id
    ${whereClause}
  `;
  const [rows] = await pool.execute(sql, params);
  return rows[0]?.total || 0;
}

async function listApplications({ whereClause, params, limit, offset }) {
  const sql = `
    SELECT
      a.application_id,
      a.application_number,
      a.permit_number,
      a.entity_id,
      a.creator_id,
      a.assessor_id,
      a.approver_id,
      a.permit_type,
      CASE
        WHEN a.permit_type LIKE '% - %' THEN TRIM(SUBSTRING_INDEX(a.permit_type, ' - ', 1))
        ELSE a.permit_type
      END AS permit_type_name,
      CASE
        WHEN a.permit_type LIKE '% - %' THEN TRIM(SUBSTRING_INDEX(a.permit_type, ' - ', -1))
        ELSE ''
      END AS attribute_name,
      a.status,
      a.created_at,
      a.updated_at,
      a.issued_at AS permit_date,
      a.validity_date,
      COALESCE(e.entity_name, 'Unknown Entity') AS entity_name,
      TRIM(CONCAT_WS(', ',
        NULLIF(TRIM(addr.street), ''),
        NULLIF(TRIM(addr.barangay), ''),
        NULLIF(TRIM(addr.municipality), ''),
        NULLIF(TRIM(addr.province), '')
      )) AS entity_address,
      COALESCE(loc.location_value, e.address) AS location,
      COALESCE(u1.full_name, 'Unknown User') AS creator_name,
      u2.full_name AS assessor_name,
      u3.full_name AS approver_name
    FROM applications a
    LEFT JOIN entities e ON a.entity_id = e.entity_id
    LEFT JOIN users u1 ON a.creator_id = u1.user_id
    LEFT JOIN users u2 ON a.assessor_id = u2.user_id
    LEFT JOIN users u3 ON a.approver_id = u3.user_id
    LEFT JOIN (
      SELECT
        application_id,
        MAX(CASE WHEN param_name = 'Street/Sitio' THEN param_value END) AS street,
        MAX(CASE WHEN param_name = 'Barangay' THEN param_value END) AS barangay,
        MAX(CASE WHEN param_name = 'Municipality' THEN param_value END) AS municipality,
        MAX(CASE WHEN param_name = 'Province' THEN param_value END) AS province
      FROM application_parameters
      WHERE param_name IN ('Street/Sitio', 'Barangay', 'Municipality', 'Province')
      GROUP BY application_id
    ) addr ON addr.application_id = a.application_id
    LEFT JOIN (
      SELECT application_id, MAX(param_value) AS location_value
      FROM application_parameters
      WHERE param_name = 'Location'
      GROUP BY application_id
    ) loc ON loc.application_id = a.application_id
    ${whereClause}
    ORDER BY a.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function findById(applicationId) {
  const [rows] = await pool.execute(
    `SELECT a.*, e.entity_name
     FROM applications a
     LEFT JOIN entities e ON a.entity_id = e.entity_id
     WHERE a.application_id = ?`,
    [applicationId]
  );
  return rows[0] || null;
}

module.exports = {
  countApplications,
  listApplications,
  findById,
};
