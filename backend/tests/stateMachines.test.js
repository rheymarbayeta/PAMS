const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  assertPermitTransition,
  assertReadingTransition,
  nextPermitStatuses,
  canTransition,
  PERMIT_TRANSITIONS,
} = require('../utils/stateMachines');

describe('stateMachines', () => {
  it('allows Approved → Paid', () => {
    assert.doesNotThrow(() => assertPermitTransition('Approved', 'Paid'));
  });

  it('rejects Issued → Approved', () => {
    assert.throws(() => assertPermitTransition('Issued', 'Approved'), /Invalid permit/);
  });

  it('lists next statuses for Paid', () => {
    assert.deepEqual(nextPermitStatuses('Paid'), ['Issued']);
  });

  it('allows pending → verified reading', () => {
    assert.doesNotThrow(() => assertReadingTransition('pending', 'verified'));
  });

  it('rejects verified → pending', () => {
    assert.throws(() => assertReadingTransition('verified', 'pending'), /Invalid reading/);
  });

  it('uses canTransition helper', () => {
    assert.equal(canTransition(PERMIT_TRANSITIONS, 'Paid', 'Issued'), true);
    assert.equal(canTransition(PERMIT_TRANSITIONS, 'Released', 'Paid'), false);
  });
});
