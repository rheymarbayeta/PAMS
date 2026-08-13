'use client';

export type RentType = 'free' | 'half' | 'full' | 'custom';

export interface RentalScheduleRow {
  id?: number;
  sort_order?: number;
  period_label: string;
  date_from: string;
  date_to: string;
  rent_type: RentType;
  basic_monthly_rent: number | string;
  vat_rate: number | string;
  wht_rate: number | string;
  vat_amount?: number;
  total_monthly_rent?: number;
  wht_amount?: number;
  net_monthly_rent?: number;
  notes?: string | null;
}

function parseMoney(value: number | string | undefined | null): number {
  const n = parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** Accept 0.12 or 12 as percent */
export function parseRate(value: number | string | undefined | null, fallback: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = parseFloat(String(value));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n > 1 ? n / 100 : n;
}

export function computeScheduleAmounts(row: Partial<RentalScheduleRow>) {
  const rentType = (row.rent_type || 'full') as RentType;
  const vatRate = parseRate(row.vat_rate, 0.12);
  const whtRate = parseRate(row.wht_rate, 0.05);

  if (rentType === 'free') {
    return {
      basic_monthly_rent: 0,
      vat_rate: vatRate,
      wht_rate: whtRate,
      vat_amount: 0,
      total_monthly_rent: 0,
      wht_amount: 0,
      net_monthly_rent: 0,
    };
  }

  const basic = parseMoney(row.basic_monthly_rent);
  const vat = parseFloat((basic * vatRate).toFixed(2));
  const total = parseFloat((basic + vat).toFixed(2));
  const wht = parseFloat((basic * whtRate).toFixed(2));
  const net = parseFloat((total - wht).toFixed(2));

  return {
    basic_monthly_rent: basic,
    vat_rate: vatRate,
    wht_rate: whtRate,
    vat_amount: vat,
    total_monthly_rent: total,
    wht_amount: wht,
    net_monthly_rent: net,
  };
}

export function formatMoney(n: number | string | undefined | null): string {
  return parseMoney(n).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRatePercent(rate: number | string | undefined | null): string {
  const r = parseRate(rate, 0);
  return `${(r * 100).toFixed(r * 100 % 1 === 0 ? 0 : 2)}%`;
}

export function emptyScheduleRow(index = 0): RentalScheduleRow {
  return {
    sort_order: index,
    period_label: `Period ${index + 1}`,
    date_from: '',
    date_to: '',
    rent_type: 'full',
    basic_monthly_rent: '',
    vat_rate: 0.12,
    wht_rate: 0.05,
    notes: '',
  };
}

interface RentalScheduleEditorProps {
  rows: RentalScheduleRow[];
  onChange: (rows: RentalScheduleRow[]) => void;
  disabled?: boolean;
}

export default function RentalScheduleEditor({
  rows,
  onChange,
  disabled = false,
}: RentalScheduleEditorProps) {
  const updateRow = (index: number, patch: Partial<RentalScheduleRow>) => {
    const next = rows.map((row, i) => {
      if (i !== index) return row;
      const merged = { ...row, ...patch };
      if (merged.rent_type === 'free') {
        merged.basic_monthly_rent = 0;
        merged.notes = merged.notes || 'Free';
      }
      return merged;
    });
    onChange(next);
  };

  const addRow = () => {
    onChange([...rows, emptyScheduleRow(rows.length)]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index).map((r, i) => ({ ...r, sort_order: i })));
  };

  const moveRow = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onChange(next.map((r, i) => ({ ...r, sort_order: i })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Rental Computation Schedule</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Tabulated periods with 12% VAT and 5% withholding tax. Leave empty to use the single monthly rental amount above.
          </p>
        </div>
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg disabled:opacity-50"
        >
          + Add period
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No schedule rows. Billing will use the Monthly Rental Amount.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Period</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">From</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">To</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Type</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Basic rent</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">VAT %</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">VAT</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Total</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">WHT %</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">WHT</th>
                <th className="px-2 py-2 text-right font-semibold whitespace-nowrap">Net</th>
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Notes</th>
                <th className="px-2 py-2 text-center font-semibold"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row, index) => {
                const computed = computeScheduleAmounts(row);
                const isFree = row.rent_type === 'free';
                return (
                  <tr key={row.id ?? `new-${index}`} className="align-top">
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.period_label}
                        disabled={disabled}
                        onChange={(e) => updateRow(index, { period_label: e.target.value })}
                        className="w-28 border border-gray-200 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={row.date_from || ''}
                        disabled={disabled}
                        onChange={(e) => updateRow(index, { date_from: e.target.value })}
                        className="border border-gray-200 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={row.date_to || ''}
                        disabled={disabled}
                        onChange={(e) => updateRow(index, { date_to: e.target.value })}
                        className="border border-gray-200 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={row.rent_type}
                        disabled={disabled}
                        onChange={(e) =>
                          updateRow(index, { rent_type: e.target.value as RentType })
                        }
                        className="border border-gray-200 rounded px-1.5 py-1"
                      >
                        <option value="free">Free</option>
                        <option value="half">Half</option>
                        <option value="full">Full</option>
                        <option value="custom">Custom</option>
                      </select>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={isFree ? 0 : row.basic_monthly_rent}
                        disabled={disabled || isFree}
                        onChange={(e) =>
                          updateRow(index, { basic_monthly_rent: e.target.value })
                        }
                        className="w-24 border border-gray-200 rounded px-1.5 py-1 text-right disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number((parseRate(row.vat_rate, 0.12) * 100).toFixed(4))}
                        disabled={disabled || isFree}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value);
                          updateRow(index, {
                            vat_rate: Number.isFinite(pct) ? pct / 100 : 0.12,
                          });
                        }}
                        className="w-16 border border-gray-200 rounded px-1.5 py-1 text-right disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">
                      ₱ {formatMoney(computed.vat_amount)}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                      ₱ {formatMoney(computed.total_monthly_rent)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={Number((parseRate(row.wht_rate, 0.05) * 100).toFixed(4))}
                        disabled={disabled || isFree}
                        onChange={(e) => {
                          const pct = parseFloat(e.target.value);
                          updateRow(index, {
                            wht_rate: Number.isFinite(pct) ? pct / 100 : 0.05,
                          });
                        }}
                        className="w-16 border border-gray-200 rounded px-1.5 py-1 text-right disabled:bg-gray-50"
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">
                      ₱ {formatMoney(computed.wht_amount)}
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-indigo-700 whitespace-nowrap">
                      ₱ {formatMoney(computed.net_monthly_rent)}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.notes || ''}
                        disabled={disabled}
                        onChange={(e) => updateRow(index, { notes: e.target.value })}
                        placeholder="e.g. Half Rent"
                        className="w-28 border border-gray-200 rounded px-1.5 py-1"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1 justify-center">
                        <button
                          type="button"
                          title="Move up"
                          disabled={disabled || index === 0}
                          onClick={() => moveRow(index, -1)}
                          className="px-1.5 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={disabled || index === rows.length - 1}
                          onClick={() => moveRow(index, 1)}
                          className="px-1.5 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          title="Remove"
                          disabled={disabled}
                          onClick={() => removeRow(index)}
                          className="px-1.5 py-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
