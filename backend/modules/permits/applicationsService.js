const repo = require('./applicationsRepository');
const { orgUnitFilterClause } = require('../../utils/orgScope');
const { generateId, ID_PREFIXES } = require('../../utils/idGenerator');
const { recordLedgerEntry } = require('../../utils/paymentLedger');
const { assertPermitTransition } = require('../../utils/stateMachines');
const { validatePaymentInput, httpError } = require('./paymentValidation');

/**
 * Applications domain service (permits module — Phase 1 pilot / Phase 6 payments).
 */

function buildListFilters(user, query) {
  const conditions = [];
  const params = [];
  const { status, search, permit_type, org_unit_id } = query;

  const roles = user.roles || [];
  const seesAll = roles.some((r) => ['SuperAdmin', 'Admin', 'Viewer'].includes(r));

  if (!seesAll) {
    const roleConditions = [];
    if (roles.includes('Application Creator')) {
      roleConditions.push('a.creator_id = ?');
      params.push(user.user_id);
    }
    if (roles.includes('Assessor')) {
      roleConditions.push('(a.status = ? OR a.assessor_id = ?)');
      params.push('Pending', user.user_id);
    }
    if (roles.includes('Approver')) {
      roleConditions.push('(a.status = ? OR a.approver_id = ?)');
      params.push('Pending Approval', user.user_id);
    }
    if (roleConditions.length > 0) {
      conditions.push('(' + roleConditions.join(' OR ') + ')');
    } else {
      conditions.push('a.creator_id = ?');
      params.push(user.user_id);
    }
  }

  if (status && status !== 'all') {
    if (status === 'Issued') {
      conditions.push("a.status IN ('Issued', 'Released')");
    } else {
      conditions.push('a.status = ?');
      params.push(status);
    }
  }

  if (permit_type && permit_type !== 'all') {
    conditions.push(`(
      CASE
        WHEN a.permit_type LIKE '% - %' THEN TRIM(SUBSTRING_INDEX(a.permit_type, ' - ', 1))
        ELSE a.permit_type
      END
    ) = ?`);
    params.push(permit_type);
  }

  if (search && String(search).trim()) {
    const term = `%${String(search).trim()}%`;
    conditions.push(`(
      a.application_number LIKE ? OR
      a.permit_type LIKE ? OR
      e.entity_name LIKE ?
    )`);
    params.push(term, term, term);
  }

  if (org_unit_id) {
    conditions.push('a.org_unit_id = ?');
    params.push(org_unit_id);
  } else {
    const orgFilter = orgUnitFilterClause(user, 'a.org_unit_id');
    if (orgFilter.sql) {
      // orgUnitFilterClause returns " AND (...)" — strip leading AND for conditions array
      conditions.push(orgFilter.sql.replace(/^\s*AND\s+/i, ''));
      params.push(...orgFilter.params);
    }
  }

  const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  return { whereClause, params };
}

async function listForUser(user, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(5000, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;

  // Accept legacy query aliases used by older frontend pages
  const normalizedQuery = {
    ...query,
    permit_type: query.permit_type || query.permitType || query.permitCategory,
  };

  const { whereClause, params } = buildListFilters(user, normalizedQuery);
  const total = await repo.countApplications({ whereClause, params });
  const data = await repo.listApplications({ whereClause, params, limit, offset });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

/**
 * Record an application payment + ledger dual-write + Paid transition when fully paid.
 * Shared by staff POST /applications/:id/payment and portal intent confirm.
 */
async function recordPayment(applicationId, body, userId) {
  const { official_receipt_no, payment_date, address, amount } = body;
  const { decimalAmount } = validatePaymentInput({
    official_receipt_no,
    payment_date,
    amount,
  });

  const app = await repo.findById(applicationId);
  if (!app) throw httpError(404, 'Application not found');

  if (app.status !== 'Approved' && app.status !== 'Paid') {
    throw httpError(400, 'Payment can only be recorded for approved or paid applications');
  }

  const paymentId = generateId(ID_PREFIXES.PAYMENT);

  try {
    await repo.insertPayment({
      paymentId,
      applicationId,
      officialReceiptNo: official_receipt_no,
      paymentDate: payment_date,
      address: address || null,
      amount: decimalAmount,
      recordedByUserId: userId,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw httpError(400, 'This official receipt number has already been recorded for this application');
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      throw httpError(400, 'Foreign key constraint error. Please verify the application and user IDs.');
    }
    throw error;
  }

  try {
    await recordLedgerEntry({
      module: 'permits',
      referenceType: 'application',
      referenceId: applicationId,
      entityId: app.entity_id || null,
      amount: decimalAmount,
      paymentDate: payment_date,
      receiptNo: official_receipt_no,
      recordedBy: userId,
      sourceTable: 'payments',
      sourceId: paymentId,
    });
  } catch (ledgerErr) {
    console.error('[Payment] Ledger write failed (non-fatal):', ledgerErr.message);
  }

  let markedPaid = false;
  const totalAmountDue = await repo.getAssessmentTotalDue(applicationId);
  if (totalAmountDue !== null && totalAmountDue > 0) {
    const totalPaid = await repo.getTotalPaid(applicationId);
    if (totalPaid >= totalAmountDue) {
      assertPermitTransition(app.status, 'Paid');
      await repo.updateStatus(applicationId, 'Paid');
      markedPaid = true;
    }
  }

  return {
    payment_id: paymentId,
    application_id: applicationId,
    application_number: app.application_number,
    entity_name: app.entity_name || 'Unknown',
    amount: decimalAmount,
    official_receipt_no,
    marked_paid: markedPaid,
  };
}

module.exports = {
  listForUser,
  buildListFilters,
  validatePaymentInput,
  recordPayment,
};
