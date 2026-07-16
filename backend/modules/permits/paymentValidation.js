/**
 * Pure payment input validation (no DB) — Phase 6.
 */

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validatePaymentInput({ official_receipt_no, payment_date, amount }) {
  if (!official_receipt_no || !payment_date || amount === undefined || amount === null || amount === '') {
    throw httpError(400, 'Missing required fields: official_receipt_no, payment_date, amount');
  }
  const amountNum = parseFloat(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    throw httpError(400, 'Amount must be a positive number');
  }
  return { amountNum, decimalAmount: amountNum.toFixed(2) };
}

module.exports = { validatePaymentInput, httpError };
