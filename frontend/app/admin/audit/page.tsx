'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader, Button } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import Pagination from '@/components/Pagination';
import api from '@/services/api';

export default function AuditLogPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/audit', {
        params: { page, limit: 50, search: search || undefined },
      });
      setRows(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  return (
    <ProtectedRoute allowedPermissions={['settings', 'users']}>
      <Layout>
        <div className="max-w-6xl mx-auto">
          <PageHeader
            title="Audit Log"
            description="System activity trail with export"
            actions={
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/audit/export.csv`}
                className="inline-flex items-center px-4 py-2 text-sm rounded-lg text-white"
                style={{ backgroundColor: 'var(--primary)' }}
                onClick={(e) => {
                  e.preventDefault();
                  const token = localStorage.getItem('token');
                  fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/audit/export.csv`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                    .then((r) => r.blob())
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'audit-trail.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                }}
              >
                Export CSV
              </a>
            }
          />

          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Search action, details, user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (setPage(1), load())}
            />
            <Button
              onClick={() => {
                setPage(1);
                load();
              }}
            >
              Search
            </Button>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No audit entries" />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">When</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.log_id} className="border-t border-slate-100">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">{row.full_name || row.username || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.action}</td>
                      <td className="px-4 py-3 text-slate-600 max-w-md truncate">{row.details}</td>
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
