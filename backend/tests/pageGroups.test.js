const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/** Mirrors frontend/config/moduleRegistry resolvePageGroup (Phase 9). */
function resolvePageGroup(pathname, groups) {
  const sorted = [...groups].sort(
    (a, b) => Math.max(...b.paths.map((p) => p.length)) - Math.max(...a.paths.map((p) => p.length))
  );
  return sorted.find((g) =>
    g.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

describe('page group resolution (Phase 9)', () => {
  const groups = [
    { id: 'finance', paths: ['/finance', '/admin/portal-payments'], tabs: [] },
    { id: 'settings', paths: ['/admin/settings'], tabs: [] },
    { id: 'waterworks', paths: ['/admin/waterworks'], tabs: [] },
  ];

  it('matches finance hub and nested portal payments', () => {
    assert.equal(resolvePageGroup('/finance', groups)?.id, 'finance');
    assert.equal(resolvePageGroup('/admin/portal-payments', groups)?.id, 'finance');
  });

  it('matches nested waterworks paths', () => {
    assert.equal(resolvePageGroup('/admin/waterworks/billing', groups)?.id, 'waterworks');
  });

  it('matches settings subpages', () => {
    assert.equal(resolvePageGroup('/admin/settings/theme', groups)?.id, 'settings');
  });
});
