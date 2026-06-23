/**
 * Format a number with thousands separators and two decimal places (e.g. 1,234.56)
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '0.00';
  return n.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Philippine peso display: ₱1,234.56 */
export function formatPeso(amount: number | string | null | undefined): string {
  return `₱${formatCurrency(amount)}`;
}
