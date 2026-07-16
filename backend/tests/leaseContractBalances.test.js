const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  getRightsBalanceSnapshot,
  getNetPrincipal,
  normalizeLegacyAccountInput,
} = require('../utils/leaseContractBalances');

describe('leaseContractBalances', () => {
  it('computes net principal after downpayment', () => {
    assert.equal(getNetPrincipal({ principal_amount: 100000, downpayment: 10000 }), 90000);
  });

  it('computes rights balance for standard accounts', () => {
    const snap = getRightsBalanceSnapshot(
      { principal_amount: 100000, downpayment: 0, opening_rights_paid: 0, opening_rights_balance: 0 },
      25000
    );
    assert.equal(snap.rightsBalance, 75000);
  });

  it('requires opening balance for legacy accounts', () => {
    const result = normalizeLegacyAccountInput({ is_legacy_account: 1, opening_rights_paid: 0 });
    assert.ok(result.error);
  });

  it('accepts legacy account with balance', () => {
    const result = normalizeLegacyAccountInput({
      is_legacy_account: 1,
      opening_rights_paid: 1000,
      opening_rights_balance: 5000,
      opening_rental_paid: 0,
    });
    assert.equal(result.is_legacy_account, 1);
    assert.equal(result.opening_rights_balance, 5000);
  });
});
