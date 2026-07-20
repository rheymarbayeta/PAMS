'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import api from '@/services/api';

/**
 * Cashier / Finance workspace (Phase 9).
 * Unified entry for portal intents, ledger, and citation payments.
 */
export default function FinanceCashierPage() {
  const [intents, setIntents] = useState<any[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<{ total_amount?: number; total?: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [intentRes, ledgerRes] = await Promise.all([
        api.get('/api/portal-payments', { params: { page: 1, limit: 10, status: 'submitted' } }),
        api.get('/api/payments-ledger', { params: { page: 1, limit: 1 } }).catch(() => null),
      ]);
      setIntents(intentRes.data?.data || []);
      setLedgerSummary({
        total_amount: ledgerRes?.data?.summary?.total_amount,
        total: ledgerRes?.data?.pagination?.total,
      });
    } catch {
      setIntents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirm = async (id: string) => {
    const ref = window.prompt('Official receipt / reference number (required)');
    if (!ref?.trim()) {
      alert('Official receipt number is required');
      return;
    }
    try {
      await api.put(`/api/portal-payments/${id}/confirm`, { reference_no: ref.trim() });
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Confirm failed');
    }
  };

  return (
    <ProtectedRoute
      allowedPermissions={[
        'settings',
        'reports',
        'view_reports',
        'applications',
        'rights_rentals_record_payment',
      ]}
    >
      <Layout>
        <div className="max-w-6xl mx-auto space-y-6">
          <PageHeader
            title="Cashier"
            description="Confirm citizen portal payments and jump to ledger or citation collections"
            actions={
              <Button type="button" variant="secondary" onClick={load}>
                Refresh
              </Button>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/portal-payments"
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition-colors"
            >
              <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Portal intents</div>
              <div className="text-2xl font-semibold text-slate-800">{intents.length}</div>
              <div className="text-sm text-slate-500 mt-1">Awaiting confirmation (top 10)</div>
            </Link>
            <Link
              href="/admin/payments-ledger"
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition-colors"
            >
              <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Ledger entries</div>
              <div className="text-2xl font-semibold text-slate-800">
                {ledgerSummary?.total != null ? Number(ledgerSummary.total).toLocaleString() : '—'}
              </div>
              <div className="text-sm text-slate-500 mt-1">
                {ledgerSummary?.total_amount != null
                  ? `₱${Number(ledgerSummary.total_amount).toLocaleString('en-PH', {
                      minimumFractionDigits: 2,
                    })} total`
                  : 'Open full ledger'}
              </div>
            </Link>
            <Link
              href="/citations/payments"
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-400 transition-colors"
            >
              <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Citations</div>
              <div className="text-lg font-semibold text-slate-800">Payment portal</div>
              <div className="text-sm text-slate-500 mt-1">Record citation fine payments</div>
            </Link>
          </div>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">Submitted portal payment intents</h2>
              <Link href="/admin/portal-payments" className="text-sm text-teal-700 hover:underline">
                View all
              </Link>
            </div>

            {loading ? (
              <LoadingSpinner label="Loading intents…" />
            ) : intents.length === 0 ? (
              <EmptyState
                title="No submitted intents"
                description="Citizen portal payment intents appear here when awaiting cashier confirmation."
              />
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="px-4 py-2 text-left">Application</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Payer</th>
                      <th className="px-4 py-2 text-left">Status</th>
                      <th className="px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {intents.map((r) => (
                      <tr key={r.intent_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <div className="font-medium">{r.application_number}</div>
                          <div className="text-xs text-slate-400">
                            {r.created_at ? new Date(r.created_at).toLocaleString() : ''}
                          </div>
                        </td>
                        <td className="px-4 py-2 font-semibold">
                          ₱{Number(r.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2">
                          <div>{r.payer_name || '—'}</div>
                          <div className="text-xs text-slate-500">{r.payer_contact || ''}</div>
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            className="text-teal-700 hover:underline"
                            onClick={() => confirm(r.intent_id)}
                          >
                            Confirm
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
