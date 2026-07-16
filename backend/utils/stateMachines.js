/**
 * Explicit workflow state machines (Phase 2).
 */

const PERMIT_TRANSITIONS = {
  Pending: ['Pending Approval', 'Assessed', 'Rejected'],
  Assessed: ['Pending Approval', 'Pending'],
  'Pending Approval': ['Approved', 'Rejected', 'Assessed'],
  Approved: ['Paid', 'Assessed'],
  Paid: ['Issued'],
  Issued: ['Released'],
  Released: [],
  Rejected: [],
};

const WATERWORKS_READING_TRANSITIONS = {
  pending: ['verified', 'rejected'],
  verified: [],
  rejected: ['pending'],
};

function canTransition(machine, from, to) {
  const allowed = machine[from] || [];
  return allowed.includes(to);
}

function assertPermitTransition(from, to) {
  if (!canTransition(PERMIT_TRANSITIONS, from, to)) {
    const err = new Error(`Invalid permit status transition: ${from} → ${to}`);
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
}

function assertReadingTransition(from, to) {
  if (!canTransition(WATERWORKS_READING_TRANSITIONS, from, to)) {
    const err = new Error(`Invalid reading status transition: ${from} → ${to}`);
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
}

function nextPermitStatuses(from) {
  return [...(PERMIT_TRANSITIONS[from] || [])];
}

module.exports = {
  PERMIT_TRANSITIONS,
  WATERWORKS_READING_TRANSITIONS,
  canTransition,
  assertPermitTransition,
  assertReadingTransition,
  nextPermitStatuses,
};
