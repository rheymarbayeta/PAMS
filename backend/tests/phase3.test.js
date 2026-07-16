const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { nextRunFrom } = require('../utils/reportScheduler');
const { orgUnitFilterClause } = require('../utils/orgScope');

describe('phase3 helpers', () => {
  it('computes next daily run', () => {
    const from = new Date('2026-07-16T00:00:00Z');
    const next = nextRunFrom('daily', from);
    assert.equal(next.getUTCDate(), 17);
  });

  it('skips org filter for Admin', () => {
    const f = orgUnitFilterClause({ roles: ['Admin'], permissions: [], org_unit_ids: ['x'] });
    assert.equal(f.sql, '');
  });

  it('applies org filter for scoped user', () => {
    const f = orgUnitFilterClause({
      roles: ['Assessor'],
      permissions: ['applications'],
      org_unit_ids: ['org1', 'org2'],
    });
    assert.match(f.sql, /IN/);
    assert.deepEqual(f.params, ['org1', 'org2']);
  });
});
