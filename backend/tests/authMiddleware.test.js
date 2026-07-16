const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { userHasPermission } = require('../config/permissions');

describe('auth permission checks', () => {
  it('SuperAdmin bypasses permission lists', () => {
    assert.equal(
      userHasPermission({ roles: ['SuperAdmin'], permissions: [] }, 'settings'),
      true
    );
  });

  it('all permission grants access', () => {
    assert.equal(
      userHasPermission({ roles: ['Admin'], permissions: ['all'] }, 'users'),
      true
    );
  });

  it('denies when permission missing', () => {
    assert.equal(
      userHasPermission({ roles: ['Assessor'], permissions: ['applications'] }, 'settings'),
      false
    );
  });

  it('allows any of multiple required permissions', () => {
    assert.equal(
      userHasPermission(
        { roles: ['Assessor'], permissions: ['assess_fees'] },
        ['assess_fees', 'approve_applications']
      ),
      true
    );
  });
});
