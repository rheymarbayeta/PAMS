/**
 * Pure citation payment validation (no DB) — Phase 7.
 */

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validateCitationPaymentAmount(amountPaid) {
  if (amountPaid === undefined || amountPaid === null || amountPaid === '') {
    throw httpError(400, 'amountPaid is required');
  }
  const amount = parseFloat(amountPaid);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw httpError(400, 'Invalid amount');
  }
  return amount;
}

function resolvePaymentStatus(totalPaid, fineAmount) {
  return totalPaid >= (parseFloat(fineAmount) || 0) ? 'Paid' : 'Partially Paid';
}

module.exports = {
  httpError,
  validateCitationPaymentAmount,
  resolvePaymentStatus,
};
