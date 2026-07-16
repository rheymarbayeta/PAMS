'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import Pagination from '@/components/Pagination';
import api from '@/services/api';

export default function PaymentsLedgerPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/payments-ledger', {
          params: {
            page,
            limit: 50,
            module: moduleFilter === 'all' ? undefined : moduleFilter,
          },
        });
        setRows(res.data.data || []);
        setSummary(res.data.summary?.total_amount || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } catch (err) {
        console.error(err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, moduleFilter]);

  return (
    <ProtectedRoute allowedPermissions={['reports', 'view_reports', 'settings']}>
      <Layout>
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="Payment Ledger"
            description="Unified cross-module payments for reconciliation"
          />

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={moduleFilter}
              onChange={(e) => {
                setPage(1);
                setModuleFilter(e.target.value);
              }}
            >
              <option value="all">All modules</option>
              <option value="permits">Permits</option>
              <option value="citations">Citations</option>
              <option value="rentals">Rentals</option>
              <option value="waterworks">Waterworks</option>
            </select>
            <p className="text-sm text-slate-600">
              Filtered total:{' '}
              <span className="font-semibold">
                ₱ {Number(summary).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState
              title="No ledger entries yet"
              description="New permit payments are written here automatically. Legacy payments can be backfilled later."
            />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Module</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Receipt</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.ledger_id} className="border-t border-slate-100">
                      <td className="px-4 py-3">{row.payment_date}</td>
                      <td className="px-4 py-3 capitalize">{row.module}</td>
                      <td className="px-4 py-3">
                        {row.reference_type}/{row.reference_id}
                      </td>
                      <td className="px-4 py-3">{row.receipt_no || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        ₱ {Number(row.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
