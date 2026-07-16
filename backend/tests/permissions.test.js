const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  resolvePermissionsForRoles,
  userHasPermission,
  mergePermissions,
  parsePermissions,
  DEFAULT_PERMISSIONS,
} = require('../config/permissions');

describe('permissions', () => {
  it('parses JSON permission strings', () => {
    assert.deepEqual(parsePermissions('["applications","chat"]'), ['applications', 'chat']);
    assert.equal(parsePermissions(null), null);
  });

  it('merges role permissions with defaults', () => {
    const perms = resolvePermissionsForRoles([
      { role_name: 'Assessor', permissions: null },
      { role_name: 'Approver', permissions: null },
    ]);
    assert.ok(perms.includes('assess_fees'));
    assert.ok(perms.includes('approve_applications'));
  });

  it('grants SuperAdmin all access via userHasPermission', () => {
    const user = { roles: ['SuperAdmin'], permissions: [] };
    assert.equal(userHasPermission(user, 'settings'), true);
  });

  it('checks explicit permissions', () => {
    const user = { roles: ['Assessor'], permissions: ['applications', 'assess_fees'] };
    assert.equal(userHasPermission(user, 'assess_fees'), true);
    assert.equal(userHasPermission(user, 'settings'), false);
  });

  it('includes Solar Designer defaults', () => {
    assert.ok(DEFAULT_PERMISSIONS['Solar Designer'].includes('solar_designer'));
  });

  it('mergePermissions unions lists', () => {
    assert.deepEqual(
      mergePermissions([['a'], ['b', 'a']]).sort(),
      ['a', 'b']
    );
  });
});
