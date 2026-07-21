'use client';

/** Citation domain presentational helpers (Phase 2 page split). */

export const CITATION_STATUS_TONES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Partial: 'bg-sky-50 text-sky-700 border-sky-200',
  'Partially Paid': 'bg-orange-50 text-orange-700 border-orange-200',
  Installment: 'bg-orange-50 text-orange-700 border-orange-200',
  Cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
};

/** Statuses treated as partial payment. */
export const PARTIAL_PAYMENT_STATUSES = ['Partially Paid', 'Installment', 'Partial'];

/**
 * Match a citation's computed payment_status against a report/list filter value.
 * - Partial → Partially Paid / Installment / Partial
 * - Paid → Paid + all partial statuses (tickets with any payment toward the fine)
 */
export function matchesPaymentStatusFilter(
  citationStatus: string | null | undefined,
  filter: string | null | undefined
): boolean {
  if (!filter || filter === 'all') return true;
  const status = (citationStatus || '').trim();
  if (filter === 'Partial') {
    return PARTIAL_PAYMENT_STATUSES.includes(status);
  }
  if (filter === 'Paid') {
    return status === 'Paid' || PARTIAL_PAYMENT_STATUSES.includes(status);
  }
  return status === filter;
}

export function formatCitationMoney(amount: number | string | null | undefined) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  return `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
