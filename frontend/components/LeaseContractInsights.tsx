'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/services/api';

type PaymentRow = {
  id: number;
  payment_date: string;
  amount_paid: number | string;
  payment_type: 'rights' | 'rental';
  or_number?: string | null;
};

type BalanceInfo = {
  initial?: number;
  rights?: number;
  rental?: number;
  total?: number;
  total_rights_paid?: number;
  total_rental_paid?: number;
  opening_rights_paid?: number;
  opening_rental_paid?: number;
};

type ContractInsightProps = {
  contractId: string | number;
  principalAmount: number;
  downpayment: number;
  monthlyRights: number;
  monthlyRental: number;
  outstandingRentalBalance?: number;
  contractEffectiveDate?: string | null;
  contractTerminationDate?: string | null;
  status?: string;
};

function peso(n: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function pesoExact(n: number) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

/** Last N calendar months ending this month (oldest → newest). */
function lastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const t = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(monthKey(t));
  }
  return keys;
}

export default function LeaseContractInsights({
  contractId,
  principalAmount,
  downpayment,
  monthlyRights,
  monthlyRental,
  outstandingRentalBalance = 0,
  contractEffectiveDate,
  contractTerminationDate,
  status,
}: ContractInsightProps) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/api/rights-and-rentals/lease-contracts/${contractId}/payments`);
        if (cancelled) return;
        setPayments(res.data?.payments || []);
        setBalance(res.data?.current_balance || null);
      } catch (e: any) {
        if (!cancelled) setError(e.response?.data?.error || 'Failed to load insights');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contractId]);

  const stats = useMemo(() => {
    const rightsPaidHistory = payments
      .filter((p) => p.payment_type === 'rights')
      .reduce((s, p) => s + (parseFloat(String(p.amount_paid)) || 0), 0);
    const rentalPaidHistory = payments
      .filter((p) => p.payment_type === 'rental')
      .reduce((s, p) => s + (parseFloat(String(p.amount_paid)) || 0), 0);

    const totalRightsPaid = balance?.total_rights_paid ?? rightsPaidHistory + (balance?.opening_rights_paid || 0);
    const totalRentalPaid = balance?.total_rental_paid ?? rentalPaidHistory + (balance?.opening_rental_paid || 0);
    const totalCollected = totalRightsPaid + totalRentalPaid;

    const netPrincipal = Math.max(0, (principalAmount || 0) - (downpayment || 0));
    const rightsRemaining = Math.max(0, balance?.rights ?? Math.max(0, netPrincipal - rightsPaidHistory));
    const rightsPaidPct =
      netPrincipal > 0 ? Math.min(100, Math.round((totalRightsPaid / (netPrincipal + (downpayment || 0) || netPrincipal)) * 100)) : 0;
    // Prefer principal progress: (downpayment + rights history) / principal
    const principalPaid = Math.min(principalAmount || 0, (downpayment || 0) + rightsPaidHistory);
    const principalPct =
      principalAmount > 0 ? Math.min(100, Math.round((principalPaid / principalAmount) * 100)) : 0;

    const months = lastNMonthKeys(12);
    const byMonth: Record<string, { rights: number; rental: number }> = {};
    months.forEach((k) => {
      byMonth[k] = { rights: 0, rental: 0 };
    });
    payments.forEach((p) => {
      const d = new Date(p.payment_date);
      if (isNaN(d.getTime())) return;
      const k = monthKey(d);
      if (!byMonth[k]) return;
      const amt = parseFloat(String(p.amount_paid)) || 0;
      if (p.payment_type === 'rights') byMonth[k].rights += amt;
      else byMonth[k].rental += amt;
    });

    const trend = months.map((k) => ({
      key: k,
      label: monthLabel(k),
      rights: byMonth[k].rights,
      rental: byMonth[k].rental,
      total: byMonth[k].rights + byMonth[k].rental,
    }));
    const maxBar = Math.max(1, ...trend.map((t) => t.total));

    const paymentCount = payments.length;
    const lastPayment = payments[0]
      ? new Date(payments[0].payment_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : null;

    let termProgress = 0;
    if (contractEffectiveDate) {
      const start = new Date(contractEffectiveDate).getTime();
      const end = contractTerminationDate
        ? new Date(contractTerminationDate).getTime()
        : Date.now() + 365 * 24 * 3600 * 1000;
      const now = Date.now();
      if (!isNaN(start) && end > start) {
        termProgress = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
      }
    }

    return {
      totalCollected,
      totalRightsPaid,
      totalRentalPaid,
      rightsRemaining,
      outstandingRental: outstandingRentalBalance || 0,
      principalPct,
      principalPaid,
      termProgress,
      trend,
      maxBar,
      paymentCount,
      lastPayment,
      monthlyDue: (monthlyRights || 0) + (monthlyRental || 0),
    };
  }, [
    payments,
    balance,
    principalAmount,
    downpayment,
    monthlyRights,
    monthlyRental,
    outstandingRentalBalance,
    contractEffectiveDate,
    contractTerminationDate,
  ]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
        <div className="h-5 w-40 bg-slate-100 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-50 rounded-lg" />
          ))}
        </div>
        <div className="mt-4 h-40 bg-slate-50 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        Insights unavailable: {error}
      </div>
    );
  }

  const chartH = 140;
  const chartW = 560;
  const padL = 8;
  const padB = 28;
  const padT = 8;
  const plotH = chartH - padB - padT;
  const barGroupW = (chartW - padL) / stats.trend.length;
  const barW = Math.max(4, (barGroupW - 6) / 2);

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </span>
            Contract Insights
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Collections and balance snapshot
            {status ? ` · ${status}` : ''}
            {stats.lastPayment ? ` · Last payment ${stats.lastPayment}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Rights
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" /> Rental
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-emerald-50 to-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-700/80">Total collected</p>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{peso(stats.totalCollected)}</p>
            <p className="text-[11px] text-slate-500 mt-1">{stats.paymentCount} payment record{stats.paymentCount === 1 ? '' : 's'}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-violet-50 to-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-violet-700/80">Rights paid</p>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{peso(stats.totalRightsPaid)}</p>
            <p className="text-[11px] text-slate-500 mt-1">Remaining {pesoExact(stats.rightsRemaining)}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-sky-50 to-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-sky-700/80">Rental paid</p>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{peso(stats.totalRentalPaid)}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Outstanding {pesoExact(stats.outstandingRental)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-gradient-to-br from-amber-50 to-white p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700/80">Monthly dues</p>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{peso(stats.monthlyDue)}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {pesoExact(monthlyRights)} + {pesoExact(monthlyRental)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-5">
          {/* Monthly collections chart */}
          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800">Collections (last 12 months)</h3>
              <p className="text-[11px] text-slate-400">By payment date</p>
            </div>
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full min-w-[420px] h-[160px]"
                role="img"
                aria-label="Monthly rights and rental collections chart"
              >
                {/* baseline */}
                <line
                  x1={padL}
                  y1={padT + plotH}
                  x2={chartW}
                  y2={padT + plotH}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                {stats.trend.map((t, i) => {
                  const gx = padL + i * barGroupW + 2;
                  const rightsH = (t.rights / stats.maxBar) * plotH;
                  const rentalH = (t.rental / stats.maxBar) * plotH;
                  return (
                    <g key={t.key}>
                      <title>
                        {t.label}: Rights {pesoExact(t.rights)}, Rental {pesoExact(t.rental)}
                      </title>
                      <rect
                        x={gx}
                        y={padT + plotH - rightsH}
                        width={barW}
                        height={Math.max(t.rights > 0 ? 2 : 0, rightsH)}
                        rx="2"
                        fill="#8b5cf6"
                        opacity={0.9}
                      />
                      <rect
                        x={gx + barW + 2}
                        y={padT + plotH - rentalH}
                        width={barW}
                        height={Math.max(t.rental > 0 ? 2 : 0, rentalH)}
                        rx="2"
                        fill="#0ea5e9"
                        opacity={0.9}
                      />
                      <text
                        x={gx + barGroupW / 2 - 2}
                        y={chartH - 8}
                        textAnchor="middle"
                        className="fill-slate-400"
                        style={{ fontSize: 9 }}
                      >
                        {t.label.split(' ')[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            {!stats.trend.some((t) => t.total > 0) && (
              <p className="text-center text-xs text-slate-400 -mt-2">No payments in the last 12 months</p>
            )}
          </div>

          {/* Principal progress + mix */}
          <div className="rounded-xl border border-slate-100 p-4 flex flex-col gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Principal progress</h3>
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-2xl font-bold text-slate-900 tabular-nums">{stats.principalPct}%</span>
                <span className="text-[11px] text-slate-500">
                  {peso(stats.principalPaid)} / {peso(principalAmount)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
                  style={{ width: `${stats.principalPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">Downpayment + rights payments toward principal</p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-2">Collection mix</h3>
              {stats.totalCollected > 0 ? (
                <>
                  <div
                    className="h-3 rounded-full overflow-hidden flex"
                    title={`Rights ${pesoExact(stats.totalRightsPaid)} · Rental ${pesoExact(stats.totalRentalPaid)}`}
                  >
                    <div
                      className="bg-violet-500"
                      style={{
                        width: `${(stats.totalRightsPaid / stats.totalCollected) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-sky-500"
                      style={{
                        width: `${(stats.totalRentalPaid / stats.totalCollected) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-[11px] text-slate-600">
                    <span>
                      Rights {Math.round((stats.totalRightsPaid / stats.totalCollected) * 100)}%
                    </span>
                    <span>
                      Rental {Math.round((stats.totalRentalPaid / stats.totalCollected) * 100)}%
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">No collections yet</p>
              )}
            </div>

            {contractEffectiveDate && (
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Contract term</h3>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-400"
                    style={{ width: `${stats.termProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {stats.termProgress}% of term elapsed
                  {contractTerminationDate ? '' : ' (open-ended estimate)'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
