'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface EnforcerDetail {
  enforcer_id: string;
  badge_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  station?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'On Leave';
  citations_issued: number;
  total_fines: number;
  date_hired?: string;
  notes?: string;
}

interface Citation {
  citation_id: string;
  ticket_number: string;
  driver_name: string;
  plate_number?: string;
  violation_date: string;
  violation_location?: string;
  fine_amount: number;
  payment_status: string;
  created_at: string;
}

interface CitationStats {
  total_issued: number;
  total_fines: number;
  paid_count: number;
  pending_count: number;
  installment_count: number;
}

interface CitationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Inactive: 'bg-slate-100 text-slate-700 border-slate-200',
  Suspended: 'bg-red-100 text-red-700 border-red-200',
  'On Leave': 'bg-amber-100 text-amber-700 border-amber-200',
};

const PAYMENT_COLORS: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  'Partially Paid': 'bg-blue-100 text-blue-700',
  Installment: 'bg-blue-100 text-blue-700',
};

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return '₱' + (amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EnforcerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const enforcerId = params.id as string;

  const [enforcer, setEnforcer] = useState<EnforcerDetail | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [citationStats, setCitationStats] = useState<CitationStats | null>(null);
  const [pagination, setPagination] = useState<CitationPagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [citationsLoading, setCitationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Citation filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchEnforcer = useCallback(async () => {
    try {
      const res = await api.get(`/api/enforcers/${enforcerId}`);
      console.log('[EnforcerDetail] GET /api/enforcers/:id response:', res.data);
      // The endpoint returns { enforcer, citations, statistics }
      const enforcerData = res.data.enforcer ?? res.data;
      console.log('[EnforcerDetail] enforcer data:', enforcerData);
      setEnforcer(enforcerData);
    } catch (err: any) {
      console.error('[EnforcerDetail] fetchEnforcer error:', err);
      setError(err.response?.data?.error || 'Failed to load enforcer details');
    }
  }, [enforcerId]);

  const fetchCitations = useCallback(async (page: number) => {
    setCitationsLoading(true);
    try {
      const queryParams: Record<string, any> = { page, limit: 20 };
      if (statusFilter) queryParams.status = statusFilter;
      console.log('[EnforcerDetail] GET /api/enforcers/:id/citations params:', queryParams);
      const res = await api.get(`/api/enforcers/${enforcerId}/citations`, { params: queryParams });
      console.log('[EnforcerDetail] citations response:', res.data);
      console.log('[EnforcerDetail] statistics:', res.data.statistics);
      console.log('[EnforcerDetail] pagination:', res.data.pagination);
      setCitations(res.data.citations || []);
      setCitationStats(res.data.statistics || null);
      setPagination(res.data.pagination || { page, limit: 20, total: 0, pages: 0 });
    } catch (err) {
      console.error('[EnforcerDetail] fetchCitations error:', err);
      /* silent – show empty state */
    } finally {
      setCitationsLoading(false);
    }
  }, [enforcerId, statusFilter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchEnforcer(), fetchCitations(1)]);
      setLoading(false);
    })();
  }, [fetchEnforcer, fetchCitations]);

  // Re-fetch citations when status filter or page changes
  const handlePageChange = (page: number) => fetchCitations(page);

  // Client-side search filter
  const displayedCitations = search.trim()
    ? citations.filter(
        (c) =>
          c.ticket_number?.toLowerCase().includes(search.toLowerCase()) ||
          c.driver_name?.toLowerCase().includes(search.toLowerCase()) ||
          c.plate_number?.toLowerCase().includes(search.toLowerCase())
      )
    : citations;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-slate-100" />
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-slate-600 border-t-transparent animate-spin" />
            </div>
            <p className="mt-4 text-slate-600 font-medium">Loading enforcer details...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !enforcer) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <p className="text-red-700 font-medium">{error || 'Enforcer not found'}</p>
              <Link href="/admin/enforcers" className="mt-4 inline-block text-sm text-slate-600 hover:text-slate-800 underline">
                ← Back to Enforcers
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">

          {/* Breadcrumb + Back */}
          <div className="flex items-center gap-2 mb-6 text-sm text-slate-500">
            <Link href="/admin/enforcers" className="hover:text-slate-700 transition-colors">
              Enforcers
            </Link>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-slate-700 font-medium">{enforcer.full_name}</span>
          </div>

          {/* Profile Header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">
                  {enforcer.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-800">{enforcer.full_name}</h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      STATUS_COLORS[enforcer.status] ?? STATUS_COLORS.Inactive
                    }`}
                  >
                    {enforcer.status}
                  </span>
                </div>
                <p className="text-slate-500 mt-1 text-sm">
                  Badge #{enforcer.badge_number}
                  {enforcer.position && <> · {enforcer.position}</>}
                  {enforcer.department && <> · {enforcer.department}</>}
                </p>
              </div>
              <button
                onClick={() => router.push('/admin/enforcers')}
                className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all duration-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            </div>
          </div>

          {/* Info Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

            {/* Basic Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Basic Information</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Position</dt>
                  <dd className="font-medium text-slate-800 text-right">{enforcer.position || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Department</dt>
                  <dd className="font-medium text-slate-800 text-right">{enforcer.department || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Station</dt>
                  <dd className="font-medium text-slate-800 text-right">{enforcer.station || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Date Hired</dt>
                  <dd className="font-medium text-slate-800 text-right">{formatDate(enforcer.date_hired)}</dd>
                </div>
                {enforcer.notes && (
                  <div>
                    <dt className="text-slate-500 mb-1">Notes</dt>
                    <dd className="text-slate-700 bg-slate-50 rounded-lg p-3 text-xs leading-relaxed">{enforcer.notes}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Contact Information</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Email</dt>
                  <dd className="font-medium text-slate-800 text-right">{enforcer.email || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="font-medium text-slate-800 text-right">{enforcer.phone || '—'}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Performance Stats */}
          {citationStats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500 font-medium mb-1">Total Issued</p>
                <p className="text-2xl font-bold text-slate-800">{citationStats.total_issued}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500 font-medium mb-1">Paid</p>
                <p className="text-2xl font-bold text-emerald-600">{citationStats.paid_count}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500 font-medium mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{citationStats.pending_count}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500 font-medium mb-1">Installment</p>
                <p className="text-2xl font-bold text-blue-600">{citationStats.installment_count}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 text-center sm:col-span-1 col-span-2">
                <p className="text-xs text-slate-500 font-medium mb-1">Total Fines</p>
                <p className="text-lg font-bold text-purple-600">{formatCurrency(citationStats.total_fines)}</p>
              </div>
            </div>
          )}

          {/* Citations Section */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <svg className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="font-semibold text-slate-800">Citations Issued</h2>
                <span className="ml-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {pagination.total}
                </span>
              </div>
              {/* Filters */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search ticket / driver / plate…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-slate-50 focus:bg-white focus:border-slate-400 outline-none w-52 transition-all"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 bg-slate-50 focus:bg-white focus:border-slate-400 outline-none transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Installment">Installment</option>
                </select>
              </div>
            </div>

            {citationsLoading ? (
              <div className="flex justify-center items-center py-16">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full border-4 border-slate-100" />
                  <div className="absolute top-0 left-0 h-10 w-10 rounded-full border-4 border-slate-500 border-t-transparent animate-spin" />
                </div>
              </div>
            ) : displayedCitations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="font-medium text-slate-500">No citations found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Ticket #</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Driver</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Plate</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Location</th>
                        <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Fine</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedCitations.map((c) => (
                        <tr key={c.citation_id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-800">{c.ticket_number}</td>
                          <td className="px-5 py-3 text-slate-700">{c.driver_name || '—'}</td>
                          <td className="px-5 py-3 text-slate-600">{c.plate_number || '—'}</td>
                          <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                            {c.violation_date
                              ? new Date(c.violation_date).toLocaleDateString('en-PH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : '—'}
                          </td>
                          <td className="px-5 py-3 text-slate-600 max-w-[180px] truncate">{c.violation_location || '—'}</td>
                          <td className="px-5 py-3 text-right font-medium text-slate-800">{formatCurrency(c.fine_amount)}</td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                PAYMENT_COLORS[c.payment_status] ?? 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {c.payment_status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <Link
                              href={`/citations/${c.citation_id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded border border-blue-200 hover:border-blue-600 transition-all duration-200"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && !search && (
                  <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Showing {(pagination.page - 1) * pagination.limit + 1}–
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={pagination.page === 1}
                        onClick={() => handlePageChange(pagination.page - 1)}
                        className="px-3 py-1 text-xs border border-slate-200 rounded-md text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let p: number;
                        if (pagination.pages <= 5) p = i + 1;
                        else if (pagination.page <= 3) p = i + 1;
                        else if (pagination.page >= pagination.pages - 2) p = pagination.pages - 4 + i;
                        else p = pagination.page - 2 + i;
                        return (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                              pagination.page === p
                                ? 'bg-slate-800 text-white'
                                : 'border border-slate-200 text-slate-600 hover:bg-white'
                            }`}
                          >
                            {p}
                          </button>
                        );
                      })}
                      <button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => handlePageChange(pagination.page + 1)}
                        className="px-3 py-1 text-xs border border-slate-200 rounded-md text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </Layout>
    </ProtectedRoute>
  );
}
