const repo = require('./applicationsRepository');
const { orgUnitFilterClause } = require('../../utils/orgScope');

/**
 * Applications domain service (permits module — Phase 1 pilot).
 */

function buildListFilters(user, query) {
  const conditions = [];
  const params = [];
  const { status, search, permit_type, org_unit_id } = query;

  const roles = user.roles || [];
  const seesAll = roles.some((r) => ['SuperAdmin', 'Admin', 'Viewer'].includes(r));

  if (!seesAll) {
    const roleConditions = [];
    if (roles.includes('Application Creator')) {
      roleConditions.push('a.creator_id = ?');
      params.push(user.user_id);
    }
    if (roles.includes('Assessor')) {
      roleConditions.push('(a.status = ? OR a.assessor_id = ?)');
      params.push('Pending', user.user_id);
    }
    if (roles.includes('Approver')) {
      roleConditions.push('(a.status = ? OR a.approver_id = ?)');
      params.push('Pending Approval', user.user_id);
    }
    if (roleConditions.length > 0) {
      conditions.push('(' + roleConditions.join(' OR ') + ')');
    } else {
      conditions.push('a.creator_id = ?');
      params.push(user.user_id);
    }
  }

  if (status && status !== 'all') {
    if (status === 'Issued') {
      conditions.push("a.status IN ('Issued', 'Released')");
    } else {
      conditions.push('a.status = ?');
      params.push(status);
    }
  }

  if (permit_type && permit_type !== 'all') {
    conditions.push(`(
      CASE
        WHEN a.permit_type LIKE '% - %' THEN TRIM(SUBSTRING_INDEX(a.permit_type, ' - ', 1))
        ELSE a.permit_type
      END
    ) = ?`);
    params.push(permit_type);
  }

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    conditions.push(`(
      a.application_number LIKE ? OR
      a.permit_type LIKE ? OR
      e.entity_name LIKE ?
    )`);
    params.push(term, term, term);
  }

  if (org_unit_id) {
    conditions.push('a.org_unit_id = ?');
    params.push(org_unit_id);
  } else {
    const orgFilter = orgUnitFilterClause(user, 'a.org_unit_id');
    if (orgFilter.sql) {
      // orgUnitFilterClause returns " AND (...)" — strip leading AND for conditions array
      conditions.push(orgFilter.sql.replace(/^\s*AND\s+/i, ''));
      params.push(...orgFilter.params);
    }
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  return { whereClause, params };
}

async function listForUser(user, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(5000, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  // Accept legacy query aliases used by older frontend pages
  const normalizedQuery = {
    ...query,
    permit_type: query.permit_type || query.permitType || query.permitCategory,
  };

  const { whereClause, params } = buildListFilters(user, normalizedQuery);
  const total = await repo.countApplications({ whereClause, params });
  const data = await repo.listApplications({ whereClause, params, limit, offset });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

module.exports = {
  listForUser,
  buildListFilters,
};
