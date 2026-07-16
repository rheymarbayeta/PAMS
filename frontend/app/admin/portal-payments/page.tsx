'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader, Button, StatusBadge } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import Pagination from '@/components/Pagination';
import api from '@/services/api';

export default function PortalPaymentsAdminPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('submitted');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/portal-payments', {
        params: { page, limit: 50, status: status === 'all' ? undefined : status },
      });
      setRows(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, status]);

  const confirm = async (id: string) => {
    const ref = window.prompt('Official receipt / reference number (required)');
    if (!ref || !ref.trim()) {
      alert('Official receipt number is required to confirm');
      return;
    }
    try {
      const res = await api.put(`/api/portal-payments/${id}/confirm`, { reference_no: ref.trim() });
      if (res.data?.payment_id) {
        alert(
          `Confirmed. Payment ${res.data.payment_id}${
            res.data.marked_paid ? ' — application marked Paid' : ''
          }`
        );
      }
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Confirm failed');
    }
  };

  const cancel = async (id: string) => {
    if (!window.confirm('Cancel this payment intent?')) return;
    try {
      await api.put(`/api/portal-payments/${id}/cancel`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Cancel failed');
    }
  };

  return (
    <ProtectedRoute allowedPermissions={['settings', 'reports', 'view_reports', 'applications']}>
      <Layout>
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="Portal Payment Intents"
            description="Citizen-submitted payment intents awaiting cashier confirmation"
          />

          <div className="flex gap-2 mb-4">
            {['submitted', 'confirmed', 'cancelled', 'all'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-sm rounded-lg border ${
                  status === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-700 border-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
            <Button type="button" variant="secondary" onClick={load}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading intents…" />
          ) : rows.length === 0 ? (
            <EmptyState title="No payment intents" description="Nothing in this filter yet." />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    <th className="px-4 py-2 text-left">Created</th>
                    <th className="px-4 py-2 text-left">Application</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Payer</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.intent_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 whitespace-nowrap">
                        {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{r.application_number}</div>
                        <div className="text-xs text-slate-400 font-mono">{r.intent_id}</div>
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
                      <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                        {(r.status === 'submitted' || r.status === 'pending') && (
                          <>
                            <button
                              type="button"
                              className="text-teal-700 hover:underline"
                              onClick={() => confirm(r.intent_id)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="text-red-600 hover:underline"
                              onClick={() => cancel(r.intent_id)}
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {r.reference_no && (
                          <span className="text-xs text-slate-500">OR: {r.reference_no}</span>
                        )}
                        {r.payment_id && (
                          <div className="text-xs text-slate-400 font-mono mt-1">{r.payment_id}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
