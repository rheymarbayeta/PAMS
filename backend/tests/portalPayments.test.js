const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { validatePaymentInput } = require('../modules/permits/paymentValidation');

describe('portal / application payment validation', () => {
  it('rejects missing receipt fields', () => {
    assert.throws(
      () => validatePaymentInput({ official_receipt_no: '', payment_date: '2026-07-16', amount: 100 }),
      (err) => err.status === 400
    );
  });

  it('rejects non-positive amounts', () => {
    assert.throws(
      () =>
        validatePaymentInput({
          official_receipt_no: 'OR-1',
          payment_date: '2026-07-16',
          amount: 0,
        }),
      (err) => err.status === 400 && /positive/i.test(err.message)
    );
  });

  it('normalizes valid amount to two decimals', () => {
    const out = validatePaymentInput({
      official_receipt_no: 'OR-99',
      payment_date: '2026-07-16',
      amount: '150.5',
    });
    assert.equal(out.decimalAmount, '150.50');
    assert.equal(out.amountNum, 150.5);
  });
});
