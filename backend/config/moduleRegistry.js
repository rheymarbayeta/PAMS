/**
 * Backend module registry (Phase 2).
 * Each entry documents mount path and domain ownership.
 */

module.exports = {
  modules: [
    {
      id: 'platform',
      description: 'Auth, users, roles, settings, notifications, chat, audit, jobs, tasks',
      routes: ['/api/auth', '/api/users', '/api/roles', '/api/settings', '/api/notifications', '/api/messages', '/api/tasks', '/api/jobs', '/api/audit', '/api/payments-ledger'],
    },
    {
      id: 'permits',
      description: 'Applications, fees, rules, permit types, report templates',
      routes: ['/api/applications', '/api/fees', '/api/permit-types', '/api/assessment-rules', '/api/quantity-fees', '/api/reports', '/api/report-templates'],
      code: 'modules/permits',
    },
    {
      id: 'citations',
      description: 'Citations and enforcers',
      routes: ['/api/citations', '/api/enforcers'],
      code: 'modules/citations',
    },
    {
      id: 'rentals',
      description: 'Rights and rentals',
      routes: ['/api/rights-and-rentals'],
      code: 'modules/rentals',
    },
    {
      id: 'waterworks',
      description: 'Water supplies, readings, billing',
      routes: ['/api/waterworks'],
      code: 'modules/waterworks',
    },
    {
      id: 'markets',
      description: 'Price monitoring',
      routes: ['/api/price-monitoring'],
      code: 'modules/markets',
    },
    {
      id: 'integrations',
      description: 'ETRACS and external systems',
      routes: [],
      code: 'utils/etracsService',
    },
  ],
};
