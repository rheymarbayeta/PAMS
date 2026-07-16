const { userHasPermission } = require('../config/permissions');

/**
 * Org-unit scoping helpers (Phase 3).
 */

async function getUserOrgUnitIds(userId) {
  try {
    const pool = require('../config/database');
    const [rows] = await pool.execute(
      'SELECT org_unit_id FROM user_org_units WHERE user_id = ?',
      [userId]
    );
    return rows.map((r) => r.org_unit_id);
  } catch {
    return [];
  }
}

async function attachOrgUnitsToUser(user) {
  if (!user) return user;
  user.org_unit_ids = await getUserOrgUnitIds(user.user_id);
  return user;
}

/**
 * Returns SQL fragment + params to restrict by org units.
 * SuperAdmin / Admin / users with no assignments → no filter (see all).
 * Users with assignments → only those org units OR null org_unit_id (legacy unscoped).
 */
function orgUnitFilterClause(user, column = 'a.org_unit_id') {
  if (!user) return { sql: '', params: [] };
  if (userHasPermission(user, 'all') || (user.roles || []).includes('Admin')) {
    return { sql: '', params: [] };
  }
  const ids = user.org_unit_ids || [];
  if (!ids.length) {
    return { sql: '', params: [] };
  }
  const placeholders = ids.map(() => '?').join(',');
  return {
    sql: ` AND (${column} IN (${placeholders}) OR ${column} IS NULL)`,
    params: ids,
  };
}

module.exports = {
  getUserOrgUnitIds,
  attachOrgUnitsToUser,
  orgUnitFilterClause,
};
