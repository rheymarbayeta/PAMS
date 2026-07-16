'use client';

/** Citation domain presentational helpers (Phase 2 page split). */

export const CITATION_STATUS_TONES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Partial: 'bg-sky-50 text-sky-700 border-sky-200',
  Cancelled: 'bg-slate-50 text-slate-600 border-slate-200',
};

export function formatCitationMoney(amount: number | string | null | undefined) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  return `₱ ${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
