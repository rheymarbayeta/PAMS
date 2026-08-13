'use client';

import {
  RentalScheduleRow,
  computeScheduleAmounts,
  formatMoney,
  formatRatePercent,
} from '@/components/RentalScheduleEditor';

interface RentalScheduleTableProps {
  rows: RentalScheduleRow[];
  title?: string;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function RentalScheduleTable({
  rows,
  title = 'The monthly rental for the entire term of this Contract shall be computed as follows:',
}: RentalScheduleTableProps) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 print:shadow-none print:p-0">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Rental Computation Schedule</h2>
      <p className="text-sm text-gray-600 mb-4">{title}</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px] sm:text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-2 py-2 text-left font-semibold">Month &amp; Year</th>
              <th className="border border-gray-400 px-2 py-2 text-left font-semibold">From</th>
              <th className="border border-gray-400 px-2 py-2 text-left font-semibold">To</th>
              <th className="border border-gray-400 px-2 py-2 text-right font-semibold">Basic Monthly rent</th>
              <th className="border border-gray-400 px-2 py-2 text-right font-semibold">
                12% VAT on Basic Monthly Rent
              </th>
              <th className="border border-gray-400 px-2 py-2 text-right font-semibold">Total monthly rent</th>
              <th className="border border-gray-400 px-2 py-2 text-right font-semibold">
                Less 5% withholding tax on basic monthly rate
              </th>
              <th className="border border-gray-400 px-2 py-2 text-right font-semibold">
                Net Monthly Rent due to LESSOR + VAT
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const c = computeScheduleAmounts(row);
              const isFree = row.rent_type === 'free';
              const vatLabel = formatRatePercent(c.vat_rate);
              const whtLabel = formatRatePercent(c.wht_rate);
              const basicDisplay = isFree
                ? 'Free'
                : `Php${formatMoney(c.basic_monthly_rent)} + Php${formatMoney(c.vat_amount)}`;

              return (
                <tr key={row.id ?? idx} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-400 px-2 py-2 font-medium text-gray-900">
                    {row.period_label}
                    {row.notes ? (
                      <span className="block text-[10px] font-normal text-gray-500">{row.notes}</span>
                    ) : null}
                  </td>
                  <td className="border border-gray-400 px-2 py-2">{formatDate(row.date_from)}</td>
                  <td className="border border-gray-400 px-2 py-2">{formatDate(row.date_to)}</td>
                  <td className="border border-gray-400 px-2 py-2 text-right">
                    {isFree ? 'Free' : basicDisplay}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-right">
                    {isFree ? '—' : `Php${formatMoney(c.vat_amount)}`}
                    {!isFree && (
                      <span className="block text-[10px] text-gray-500">({vatLabel})</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-right font-medium">
                    {isFree ? '—' : `Php${formatMoney(c.total_monthly_rent)}`}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-right">
                    {isFree ? '—' : `Php${formatMoney(c.wht_amount)}`}
                    {!isFree && (
                      <span className="block text-[10px] text-gray-500">({whtLabel})</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-2 py-2 text-right font-semibold text-indigo-800">
                    {isFree ? '—' : `Php${formatMoney(c.net_monthly_rent)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
        LESSEE shall withhold and remit to the Bureau of Internal Revenue (&quot;BIR&quot;) the applicable
        creditable expanded withholding tax, and shall furnish LESSOR with the corresponding BIR
        forms / certificates as required.
      </p>
    </div>
  );
}
