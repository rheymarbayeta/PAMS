/**
 * Frontend feature-module registry (Phase 2 / Phase 9).
 * Nav items + page-group subnav tabs — Layout reads from here only.
 */

export type NavItem = {
  id: string;
  href: string;
  label: string;
  section: 'main' | 'admin';
  /** Permission(s) required (any match). Empty = always for authenticated users. */
  permissions?: string[];
  /** Role(s) required (any match). When set, user must have at least one. */
  roles?: string[];
  /** Hide when user only has these scoped modules */
  hideWhenOnly?: Array<'waterworks' | 'rentals'>;
  activePaths?: string[];
  order?: number;
};

export type PageGroupTab = { href: string; label: string };

export type PageGroup = {
  id: string;
  /** Path prefixes that activate this group's subnav */
  paths: string[];
  tabs: PageGroupTab[];
};

export const MODULE_NAV: NavItem[] = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard', section: 'main', order: 10 },
  { id: 'tasks', href: '/tasks', label: 'My Work', section: 'main', permissions: ['tasks_view', 'applications', 'waterworks_view', 'dashboard_view'], order: 20 },
  { id: 'applications', href: '/applications', label: 'Applications', section: 'main', permissions: ['applications'], hideWhenOnly: ['waterworks', 'rentals'], order: 30 },
  { id: 'entities', href: '/admin/entities', label: 'Entities', section: 'main', permissions: ['entities'], hideWhenOnly: ['waterworks', 'rentals'], order: 40 },
  { id: 'citations', href: '/citations', label: 'Citations', section: 'main', permissions: ['citations', 'view_citations', 'create_citations'], hideWhenOnly: ['waterworks', 'rentals'], order: 50 },
  { id: 'anomalies', href: '/admin/anomalies', label: 'Anomalies', section: 'main', permissions: ['dashboard_view', 'waterworks_view', 'settings'], order: 55 },
  { id: 'rentals', href: '/admin/rights-and-rentals', label: 'Rights & Rentals', section: 'main', permissions: ['rights_rentals_view'], hideWhenOnly: ['waterworks'], order: 60 },
  { id: 'waterworks', href: '/admin/waterworks', label: 'Waterworks', section: 'main', permissions: ['waterworks_view'], order: 70 },
  {
    id: 'cashier',
    href: '/finance',
    label: 'Cashier',
    section: 'main',
    permissions: ['settings', 'reports', 'view_reports', 'applications', 'rights_rentals_record_payment'],
    activePaths: ['/finance', '/admin/portal-payments', '/admin/payments-ledger', '/citations/payments'],
    order: 75,
  },
  { id: 'chat', href: '/chat', label: 'Chat', section: 'main', permissions: ['chat'], hideWhenOnly: ['waterworks', 'rentals'], order: 80 },
  { id: 'price', href: '/price-monitoring', label: 'Price Monitoring', section: 'main', permissions: ['price_monitoring'], hideWhenOnly: ['waterworks', 'rentals'], order: 90 },
  { id: 'solar', href: '/solar', label: 'Solar Designer', section: 'main', permissions: ['solar_designer'], order: 100 },
  {
    id: 'permit-setup',
    href: '/admin/permit-types',
    label: 'Permit Setup',
    section: 'admin',
    permissions: ['permits', 'settings'],
    activePaths: ['/admin/permit-types', '/admin/attributes', '/admin/rules', '/admin/fees', '/admin/quantity-fees'],
    order: 10,
  },
  { id: 'enforcers', href: '/admin/enforcers', label: 'Enforcers', section: 'admin', permissions: ['enforcers'], order: 20 },
  { id: 'users', href: '/admin/users', label: 'Users', section: 'admin', permissions: ['users'], order: 30 },
  {
    id: 'reports-hub',
    href: '/reports/hub',
    label: 'Reports',
    section: 'admin',
    permissions: ['reports', 'view_reports', 'waterworks_reports', 'rights_rentals_view_reports'],
    activePaths: ['/reports', '/admin/reports', '/admin/templates', '/admin/report-templates', '/admin/waterworks/reports', '/admin/rights-and-rentals/reports'],
    order: 40,
  },
  { id: 'audit', href: '/admin/audit', label: 'Audit Log', section: 'admin', permissions: ['settings', 'users'], order: 45 },
  { id: 'org-units', href: '/admin/org-units', label: 'Org Units', section: 'admin', permissions: ['settings', 'users', 'org_units_manage'], order: 48 },
  { id: 'approval-chains', href: '/admin/approval-chains', label: 'Approval Chains', section: 'admin', permissions: ['settings', 'permits'], order: 49 },
  { id: 'scheduled-reports', href: '/admin/scheduled-reports', label: 'Scheduled Reports', section: 'admin', permissions: ['reports', 'view_reports', 'settings'], order: 50 },
  {
    id: 'settings',
    href: '/admin/settings',
    label: 'Settings',
    section: 'admin',
    permissions: ['settings'],
    activePaths: ['/admin/settings'],
    order: 51,
  },
  { id: 'integrations', href: '/admin/integrations', label: 'Integrations', section: 'admin', permissions: ['settings', 'integrations_manage'], order: 52 },
  { id: 'health', href: '/admin/health', label: 'System Health', section: 'admin', permissions: ['settings'], order: 53 },
];

/** Horizontal subnav tabs by module area (Phase 9 — moved out of Layout). */
export const PAGE_GROUPS: PageGroup[] = [
  {
    id: 'permit-setup',
    paths: ['/admin/permit-types', '/admin/attributes', '/admin/rules', '/admin/fees', '/admin/quantity-fees'],
    tabs: [
      { href: '/admin/permit-types', label: 'Permit Types' },
      { href: '/admin/attributes', label: 'Attributes' },
      { href: '/admin/rules', label: 'Assessment Rules' },
      { href: '/admin/fees', label: 'Fees' },
      { href: '/admin/quantity-fees', label: 'Quantity Fees' },
    ],
  },
  {
    id: 'rentals',
    paths: ['/admin/rights-and-rentals'],
    tabs: [
      { href: '/admin/rights-and-rentals', label: 'Lessees' },
      { href: '/admin/rights-and-rentals/properties', label: 'Properties' },
      { href: '/admin/rights-and-rentals/lease-contracts', label: 'Lease Contracts' },
      { href: '/admin/rights-and-rentals/reports', label: 'Reports' },
    ],
  },
  {
    id: 'waterworks',
    paths: ['/admin/waterworks'],
    tabs: [
      { href: '/admin/waterworks', label: 'Supplies' },
      { href: '/admin/waterworks/accounts', label: 'Accounts' },
      { href: '/admin/waterworks/readings', label: 'Readings' },
      { href: '/admin/waterworks/billing', label: 'Billing' },
      { href: '/admin/waterworks/payments', label: 'Payments' },
      { href: '/admin/waterworks/rate-computation', label: 'Rate Computation' },
      { href: '/admin/waterworks/reports', label: 'Reports' },
    ],
  },
  {
    id: 'finance',
    paths: ['/finance', '/admin/portal-payments', '/admin/payments-ledger', '/citations/payments'],
    tabs: [
      { href: '/finance', label: 'Overview' },
      { href: '/admin/portal-payments', label: 'Portal Intents' },
      { href: '/admin/payments-ledger', label: 'Ledger' },
      { href: '/citations/payments', label: 'Citation Payments' },
    ],
  },
  {
    id: 'reports',
    paths: ['/reports'],
    tabs: [{ href: '/reports', label: 'Permit Reports' }],
  },
  {
    id: 'settings',
    paths: ['/admin/settings'],
    tabs: [
      { href: '/admin/settings', label: 'General' },
      { href: '/admin/settings/permit-display', label: 'Permit Display' },
      { href: '/admin/settings/role-permissions', label: 'Role Permissions' },
      { href: '/admin/settings/theme', label: 'Theme' },
    ],
  },
];

export function resolvePageGroup(pathname: string): PageGroup | undefined {
  // Prefer longer/more specific path matches first
  const sorted = [...PAGE_GROUPS].sort(
    (a, b) => Math.max(...b.paths.map((p) => p.length)) - Math.max(...a.paths.map((p) => p.length))
  );
  return sorted.find((g) =>
    g.paths.some((p) => pathname === p || pathname.startsWith(p + '/'))
  );
}

export function resolveNavItems(
  hasPermission: (p: string | string[]) => boolean,
  opts: {
    isWaterworksOnly: boolean;
    isRrOnly: boolean;
    hasRole?: (role: string | string[]) => boolean;
  }
): { main: NavItem[]; admin: NavItem[] } {
  const visible = (item: NavItem) => {
    if (item.roles && item.roles.length > 0) {
      if (!opts.hasRole || !opts.hasRole(item.roles)) return false;
    }
    if (item.permissions && item.permissions.length > 0 && !hasPermission(item.permissions)) {
      return false;
    }
    if (item.hideWhenOnly?.includes('waterworks') && opts.isWaterworksOnly) return false;
    if (item.hideWhenOnly?.includes('rentals') && opts.isRrOnly) return false;
    return true;
  };

  const main = MODULE_NAV.filter((i) => i.section === 'main' && visible(i)).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );
  const admin = MODULE_NAV.filter((i) => i.section === 'admin' && visible(i)).sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  );
  return { main, admin };
}
