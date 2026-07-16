/**
 * Shared permission catalog and role defaults for PAMS RBAC (Phase 1).
 */

const DEFAULT_PERMISSIONS = {
  SuperAdmin: ['all'],
  Admin: [
    'dashboard_view',
    'permits',
    'applications',
    'create_applications',
    'assess_fees',
    'approve_applications',
    'entities',
    'citations',
    'create_citations',
    'view_citations',
    'delete_citations',
    'reports',
    'view_reports',
    'users',
    'settings',
    'enforcers',
    'chat',
    'price_monitoring',
    'rights_rentals_view',
    'rights_rentals_record_payment',
    'rights_rentals_view_reports',
    'waterworks_view',
    'waterworks_manage',
    'waterworks_billing',
    'waterworks_payments',
    'waterworks_reports',
    'tasks_view',
  ],
  'Rights and Rentals Manager': [
    'dashboard_view',
    'rights_rentals_view',
    'rights_rentals_record_payment',
    'rights_rentals_view_reports',
    'tasks_view',
  ],
  Assessor: [
    'dashboard_view',
    'applications',
    'assess_fees',
    'view_reports',
    'citations',
    'view_citations',
    'create_citations',
    'chat',
    'price_monitoring',
    'tasks_view',
  ],
  Approver: [
    'dashboard_view',
    'applications',
    'approve_applications',
    'chat',
    'tasks_view',
  ],
  'Traffic Officer': [
    'dashboard_view',
    'citations',
    'create_citations',
    'view_citations',
    'tasks_view',
  ],
  'Citation Manager': [
    'dashboard_view',
    'citations',
    'create_citations',
    'view_citations',
    'delete_citations',
    'tasks_view',
  ],
  'Waterworks Manager': [
    'dashboard_view',
    'waterworks_view',
    'waterworks_manage',
    'waterworks_billing',
    'waterworks_payments',
    'waterworks_reports',
    'tasks_view',
  ],
  'Meter Reader': ['waterworks_mobile_read', 'tasks_view'],
  'Application Creator': [
    'dashboard_view',
    'applications',
    'create_applications',
    'chat',
    'tasks_view',
  ],
  Viewer: ['dashboard_view', 'applications', 'view_reports', 'entities'],
  'Solar Designer': ['dashboard_view', 'solar_designer'],
};

/**
 * Parse permissions column from DB (JSON string, array, or null).
 */
function parsePermissions(raw) {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Merge permission lists from multiple roles (union).
 */
function mergePermissions(permissionLists) {
  const set = new Set();
  for (const list of permissionLists) {
    for (const p of list || []) {
      set.add(p);
    }
  }
  return Array.from(set);
}

/**
 * Resolve effective permissions for a set of role names + optional DB values.
 * @param {Array<{ role_name: string, permissions?: any }>} roles
 */
function resolvePermissionsForRoles(roles) {
  const lists = (roles || []).map((role) => {
    const fromDb = parsePermissions(role.permissions);
    if (fromDb && fromDb.length > 0) return fromDb;
    return DEFAULT_PERMISSIONS[role.role_name] || [];
  });
  return mergePermissions(lists);
}

function userHasPermission(user, permission) {
  if (!user) return false;
  const roles = user.roles || [];
  if (roles.includes('SuperAdmin')) return true;
  const perms = user.permissions || [];
  if (perms.includes('all')) return true;
  if (Array.isArray(permission)) {
    return permission.some((p) => perms.includes(p));
  }
  return perms.includes(permission);
}

module.exports = {
  DEFAULT_PERMISSIONS,
  parsePermissions,
  mergePermissions,
  resolvePermissionsForRoles,
  userHasPermission,
};
