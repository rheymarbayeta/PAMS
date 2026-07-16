'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import waterworksService, {
  WaterSupply,
  RateTier,
  BillingModel,
  SupplyReader,
} from '@/services/waterworksService';
import { formatPeso } from '@/utils/formatters';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  progressive: 'Progressive (minimum + per m³ blocks)',
  minimum_excess: 'Minimum + excess per m³',
  bracket_flat: 'Bracket flat (one charge by consumption range)',
  per_unit_deduction: 'Per m³ with deduction',
};

function formatOrdinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatReadingSchedule(supply: Pick<WaterSupply, 'reading_day_from' | 'reading_day_to'>): string {
  const from = supply.reading_day_from;
  const to = supply.reading_day_to;
  if (!from && !to) return '—';
  if (from && to) {
    return from === to
      ? `${formatOrdinal(from)} of the month`
      : `${formatOrdinal(from)} – ${formatOrdinal(to)} of the month`;
  }
  if (from) return `From ${formatOrdinal(from)} of the month`;
  return `Until ${formatOrdinal(to!)} of the month`;
}

function formatBillingSchedule(supply: Pick<WaterSupply, 'billing_day'>): string {
  return supply.billing_day ? `${formatOrdinal(supply.billing_day)} of the month` : '—';
}

function formatTierRate(tier: RateTier, billingModel: BillingModel = 'progressive'): string {
  if (tier.charge_type === 'minimum') {
    return `${formatPeso(tier.rate_amount)} (up to ${tier.to_m3} m³)`;
  }
  if (tier.charge_type === 'flat_bracket') {
    const range = tier.to_m3 ? `${tier.from_m3}–${tier.to_m3} m³` : `${tier.from_m3}+ m³`;
    return `${range} → ${formatPeso(tier.rate_amount)} flat`;
  }
  if (tier.charge_type === 'deduction') {
    const range = tier.to_m3 ? `${tier.from_m3}–${tier.to_m3} m³` : `${tier.from_m3}+ m³`;
    return `${range} → −${formatPeso(tier.rate_amount)}`;
  }
  const range = tier.to_m3 ? `${tier.from_m3}–${tier.to_m3} m³` : `${tier.from_m3}+ m³`;
  return `${range} @ ${formatPeso(tier.rate_amount)}/m³`;
}

function statusBadgeClass(status: WaterSupply['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'maintenance':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default function WaterSupplyDetailPage() {
  const params = useParams();
  const supplyId = params.id as string;

  const [supply, setSupply] = useState<WaterSupply | null>(null);
  const [readers, setReaders] = useState<SupplyReader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplyId) return;

    const load = async () => {
      try {
        setLoading(true);
        const [supplyData, readersData] = await Promise.all([
          waterworksService.getSupply(supplyId),
          waterworksService.getSupplyReaders({ supply_id: supplyId }).catch(() => [] as SupplyReader[]),
        ]);
        setSupply(supplyData);
        setReaders(readersData || []);
      } catch (e) {
        console.error(e);
        setSupply(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supplyId]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={WW_ROLES}>
        <Layout>
          <div className="p-8 text-center text-gray-500">Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!supply) {
    return (
      <ProtectedRoute allowedRoles={WW_ROLES}>
        <Layout>
          <div className="px-4 py-8 max-w-7xl mx-auto">
            <div className="text-center text-red-600 mb-4">Water supply not found</div>
            <div className="text-center">
              <Link href="/admin/waterworks" className="text-blue-600 hover:underline text-sm">
                ← Back to Supplies
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const billingModel = (supply.billing_model || 'progressive') as BillingModel;
  const tiers = supply.rate_tiers || [];

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <div className="mb-6">
            <Link href="/admin/waterworks" className="text-blue-600 text-sm hover:underline">
              ← Back to Supplies
            </Link>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{supply.supply_name}</h1>
                <p className="text-gray-600 font-mono text-sm mt-1">{supply.supply_code}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${statusBadgeClass(supply.status)}`}
              >
                {supply.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-sm text-gray-500">Consumer Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{supply.account_count ?? 0}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-sm text-gray-500">Minimum Charge</p>
              <p className="text-2xl font-bold text-gray-900">{formatPeso(supply.minimum_charge)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-sm text-gray-500">Rate / m³</p>
              <p className="text-2xl font-bold text-gray-900">
                {Number(supply.rate_per_cubic_meter) > 0
                  ? formatPeso(supply.rate_per_cubic_meter)
                  : '—'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            <Link
              href={`/admin/waterworks?edit=${supply.supply_id}&returnTo=${encodeURIComponent(`/admin/waterworks/${supply.supply_id}`)}`}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Edit Supply
            </Link>
            <Link
              href={`/admin/waterworks/accounts?supply_id=${supply.supply_id}`}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Accounts
            </Link>
            <Link
              href={`/admin/waterworks/rate-computation?supply=${supply.supply_id}`}
              className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Rate Computation
            </Link>
            <Link
              href="/admin/waterworks"
              className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
            >
              Back to List
            </Link>
          </div>

          <div className="space-y-6">
            <section className="bg-white rounded-xl border overflow-hidden shadow-sm">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Supply Details</h2>
              <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Supply Code</dt>
                  <dd className="font-mono font-medium text-gray-900">{supply.supply_code}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Supply Name</dt>
                  <dd className="font-medium text-gray-900">{supply.supply_name}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Location</dt>
                  <dd className="text-gray-900">{supply.location || '—'}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Status</dt>
                  <dd className="capitalize text-gray-900">{supply.status}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Description</dt>
                  <dd className="text-gray-900">{supply.description || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="bg-white rounded-xl border overflow-hidden shadow-sm">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Reading & Billing Schedule</h2>
              <dl className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500">Reading Schedule</dt>
                  <dd className="font-medium text-gray-900">{formatReadingSchedule(supply)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Billing Day</dt>
                  <dd className="font-medium text-gray-900">{formatBillingSchedule(supply)}</dd>
                </div>
              </dl>
            </section>

            <section className="bg-white rounded-xl border overflow-hidden shadow-sm">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Billing Model & Rates</h2>
              <div className="p-4 space-y-4">
                <div className="text-sm">
                  <p className="text-gray-500">Billing Model</p>
                  <p className="font-medium text-gray-900">{BILLING_MODEL_LABELS[billingModel]}</p>
                </div>

                {tiers.length === 0 ? (
                  <p className="text-sm text-gray-500">No rate tiers configured for this supply.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Order</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">From (m³)</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">To (m³)</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Type</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600">Amount</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tiers
                          .slice()
                          .sort((a, b) => a.tier_order - b.tier_order)
                          .map((tier) => (
                            <tr key={tier.tier_id} className="border-b last:border-0">
                              <td className="px-3 py-2">{tier.tier_order}</td>
                              <td className="px-3 py-2">{tier.from_m3}</td>
                              <td className="px-3 py-2">{tier.to_m3 ?? '∞'}</td>
                              <td className="px-3 py-2 capitalize">{tier.charge_type.replace(/_/g, ' ')}</td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatPeso(tier.rate_amount)}
                              </td>
                              <td className="px-3 py-2 text-gray-600">
                                {tier.description || formatTierRate(tier, billingModel)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-xl border overflow-hidden shadow-sm">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Assigned Readers</h2>
              {readers.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No readers assigned to this supply.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Name</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Username</th>
                    </tr>
                  </thead>
                  <tbody>
                    {readers.map((reader) => (
                      <tr key={reader.assignment_id} className="border-b last:border-0">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {reader.full_name || '—'}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{reader.username || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
