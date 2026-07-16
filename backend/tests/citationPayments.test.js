const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateCitationPaymentAmount,
  resolvePaymentStatus,
} = require('../modules/citations/paymentValidation');

describe('citation payment helpers', () => {
  it('rejects missing or non-positive amounts', () => {
    assert.throws(() => validateCitationPaymentAmount(undefined), (e) => e.status === 400);
    assert.throws(() => validateCitationPaymentAmount(0), (e) => e.status === 400);
  });

  it('parses valid amount', () => {
    assert.equal(validateCitationPaymentAmount('250.00'), 250);
  });

  it('resolves Paid vs Partially Paid', () => {
    assert.equal(resolvePaymentStatus(500, 500), 'Paid');
    assert.equal(resolvePaymentStatus(100, 500), 'Partially Paid');
  });
});
