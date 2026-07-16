/**
 * Frontend feature-module registry (Phase 2).
 * Add a module here to surface nav items without hard-coding Layout conditionals.
 */

export type NavItem = {
  id: string;
  href: string;
  label: string;
  section: 'main' | 'admin';
  /** Permission(s) required (any match). Empty = always for authenticated users. */
  permissions?: string[];
  /** Hide when user only has these scoped modules */
  hideWhenOnly?: Array<'waterworks' | 'rentals'>;
  activePaths?: string[];
  order?: number;
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
  {
    id: 'payments-ledger',
    href: '/admin/payments-ledger',
    label: 'Payments Ledger',
    section: 'admin',
    permissions: ['reports', 'view_reports', 'settings'],
    order: 46,
  },
  { id: 'org-units', href: '/admin/org-units', label: 'Org Units', section: 'admin', permissions: ['settings', 'users', 'org_units_manage'], order: 47 },
  { id: 'approval-chains', href: '/admin/approval-chains', label: 'Approval Chains', section: 'admin', permissions: ['settings', 'permits'], order: 48 },
  { id: 'scheduled-reports', href: '/admin/scheduled-reports', label: 'Scheduled Reports', section: 'admin', permissions: ['reports', 'view_reports', 'settings'], order: 49 },
  { id: 'integrations', href: '/admin/integrations', label: 'Integrations', section: 'admin', permissions: ['settings', 'integrations_manage'], order: 51 },
  { id: 'health', href: '/admin/health', label: 'System Health', section: 'admin', permissions: ['settings'], order: 52 },
  {
    id: 'settings',
    href: '/admin/settings',
    label: 'Settings',
    section: 'admin',
    permissions: ['settings'],
    activePaths: ['/admin/settings'],
    order: 50,
  },
];

export function resolveNavItems(
  hasPermission: (p: string | string[]) => boolean,
  opts: { isWaterworksOnly: boolean; isRrOnly: boolean }
): { main: NavItem[]; admin: NavItem[] } {
  const visible = (item: NavItem) => {
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
