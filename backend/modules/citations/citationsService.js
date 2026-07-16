const { generateId, ID_PREFIXES } = require('../../utils/idGenerator');
const { recordLedgerEntry } = require('../../utils/paymentLedger');
const repo = require('./citationsRepository');
const {
  httpError,
  validateCitationPaymentAmount,
  resolvePaymentStatus,
} = require('./paymentValidation');

async function listForUser(query) {
  return repo.listCitations(query);
}

async function create(body, userId) {
  return repo.createCitation(body, userId);
}

async function recordPayment(citationId, body, userId) {
  const { amountPaid, paymentMethod, receiptNumber, notes, paymentDate } = body;
  const amount = validateCitationPaymentAmount(amountPaid);

  const citation = await repo.findById(citationId);
  if (!citation) throw httpError(404, 'Citation not found');

  const paymentId = generateId(ID_PREFIXES.CITATION_PAYMENT);
  const finalPaymentDate = paymentDate
    ? new Date(paymentDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  await repo.insertPayment({
    paymentId,
    citationId,
    amountPaid: amount,
    paymentMethod,
    receiptNumber,
    notes,
    paymentDate: finalPaymentDate,
  });

  try {
    await recordLedgerEntry({
      module: 'citations',
      referenceType: 'citation',
      referenceId: citationId,
      entityId: citation.entity_id || null,
      amount,
      paymentDate: finalPaymentDate,
      receiptNo: receiptNumber || null,
      method: paymentMethod || null,
      recordedBy: userId,
      sourceTable: 'citation_payments',
      sourceId: paymentId,
      notes: notes || null,
    });
  } catch (ledgerErr) {
    console.error('[Citation Payment] Ledger write failed (non-fatal):', ledgerErr.message);
  }

  const totalPaid = await repo.getTotalPaid(citationId);
  const status = resolvePaymentStatus(totalPaid, citation.fine_amount);
  await repo.updatePaymentStatus(citationId, status);

  return { payment_id: paymentId, status, citation_id: citationId };
}

async function updatePayment(citationId, paymentId, body) {
  const citation = await repo.findById(citationId);
  if (!citation) throw httpError(404, 'Citation not found');

  const existing = await repo.findPayment(paymentId, citationId);
  if (!existing) throw httpError(404, 'Payment record not found');

  const { receiptNumber, amountPaid, paymentDate } = body;
  const fields = [];
  const values = [];

  if (receiptNumber !== undefined) {
    fields.push('receipt_number = ?');
    values.push(receiptNumber || null);
  }
  if (amountPaid !== undefined) {
    fields.push('amount_paid = ?');
    values.push(validateCitationPaymentAmount(amountPaid));
  }
  if (paymentDate !== undefined) {
    fields.push('payment_date = ?');
    values.push(new Date(paymentDate).toISOString().split('T')[0]);
  }

  if (!fields.length) throw httpError(400, 'No fields to update');

  await repo.updatePaymentFields(paymentId, citationId, fields, values);

  const totalPaid = await repo.getTotalPaid(citationId);
  const status = resolvePaymentStatus(totalPaid, citation.fine_amount);
  await repo.updatePaymentStatus(citationId, status);

  return { status, citation_id: citationId, payment_id: paymentId };
}

module.exports = {
  listForUser,
  create,
  recordPayment,
  updatePayment,
};
