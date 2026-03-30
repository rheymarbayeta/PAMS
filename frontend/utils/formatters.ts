/**
 * Format a number as Philippine Peso currency with comma separators
 * @param amount - The amount to format
 * @returns Formatted string like "1,000.00"
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
