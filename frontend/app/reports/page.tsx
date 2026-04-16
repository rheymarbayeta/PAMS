'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Application {
  application_id: number;
  application_number: string | null;
  permit_number: string | null;
  entity_name: string;
  permit_type: string;
  permit_type_name: string;
  attribute_name: string;
  status: string;
  creator_name: string;
  assessor_name: string | null;
  approver_name: string | null;
  created_at: string;
  assessed_at?: string;
  approved_at?: string;
}

interface ReportStats {
  total: number;
  pending: number;
  assessed: number;
  pendingApproval: number;
  approved: number;
  paid: number;
  issued: number;
  released: number;
  rejected: number;
}

type ColumnKey = 'permit_number' | 'entity_name' | 'permit_type_name' | 'status' | 'creator_name' | 'assessor_name' | 'approver_name' | 'created_at' | 'assessed_at' | 'approved_at';

const AVAILABLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'permit_number', label: 'Permit Number' },
  { key: 'entity_name', label: 'Permittee' },
  { key: 'permit_type_name', label: 'Permit' },
  { key: 'status', label: 'Status' },
  { key: 'creator_name', label: 'Creator' },
  { key: 'assessor_name', label: 'Assessor' },
  { key: 'approver_name', label: 'Approver' },
  { key: 'created_at', label: 'Created Date' },
  { key: 'assessed_at', label: 'Assessed Date' },
  { key: 'approved_at', label: 'Approved Date' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats>({
    total: 0,
    pending: 0,
    assessed: 0,
    pendingApproval: 0,
    approved: 0,
    paid: 0,
    issued: 0,
    released: 0,
    rejected: 0,
  });

  // Filter states
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [permitTypeFilter, setPermitTypeFilter] = useState<string>('all');
  const [creatorFilter, setCreatorFilter] = useState<string>('all');
  const [assessorFilter, setAssessorFilter] = useState<string>('all');
  const [approverFilter, setApproverFilter] = useState<string>('all');
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Column selection
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    ['permit_number', 'entity_name', 'permit_type_name', 'status', 'created_at']
  );

  // Sorting
  const [sortColumn, setSortColumn] = useState<ColumnKey>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // UI states
  const [permitTypes, setPermitTypes] = useState<string[]>([]);
  const [creators, setCreators] = useState<string[]>([]);
  const [assessors, setAssessors] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<string[]>([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [permitCategories, setPermitCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Report generation state
  const [generatingFormat, setGeneratingFormat] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Financial summary
  const [totalAmountDue, setTotalAmountDue] = useState<number>(0);

  useEffect(() => {
    fetchPermitCategories();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilters, permitTypeFilter, creatorFilter, assessorFilter, approverFilter, dateRangeStart, dateRangeEnd, searchTerm]);

  const fetchPermitCategories = async () => {
    try {
      const response = await api.get('/api/dashboard/permit-categories');
      setPermitCategories(response.data);
    } catch (error) {
      console.error('Error fetching permit categories:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = selectedCategory ? `?permitCategory=${encodeURIComponent(selectedCategory)}` : '';
      const response = await api.get(`/api/applications${params}`);
      const apps = response.data;
      setApplications(apps);

      // Fetch financial summary
      try {
        const summaryParams = new URLSearchParams();
        if (selectedCategory) summaryParams.set('permitCategory', selectedCategory);
        const summaryRes = await api.get(`/api/reports/summary`);
        if (summaryRes.data?.summary?.totalAmount != null) {
          setTotalAmountDue(summaryRes.data.summary.totalAmount);
        }
      } catch {
        // Summary is optional, don't block rendering
      }

      // Extract unique values for filters
      const permitTypeSet = new Set<string>(apps.map((app: Application) => app.attribute_name || app.permit_type_name).filter(Boolean));
      const creatorSet = new Set<string>(apps.map((app: Application) => app.creator_name));
      const assessorSet = new Set<string>(apps.map((app: Application) => app.assessor_name).filter(Boolean) as string[]);
      const approverSet = new Set<string>(apps.map((app: Application) => app.approver_name).filter(Boolean) as string[]);

      setPermitTypes(Array.from(permitTypeSet).sort());
      setCreators(Array.from(creatorSet).sort());
      setAssessors(Array.from(assessorSet).sort());
      setApprovers(Array.from(approverSet).sort());

      // Calculate stats
      calculateStats(apps);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (apps: Application[]) => {
    const stats: ReportStats = {
      total: apps.length,
      pending: apps.filter(app => app.status === 'Pending').length,
      assessed: apps.filter(app => app.status === 'Assessed').length,
      pendingApproval: apps.filter(app => app.status === 'Pending Approval').length,
      approved: apps.filter(app => app.status === 'Approved').length,
      paid: apps.filter(app => app.status === 'Paid').length,
      issued: apps.filter(app => app.status === 'Issued').length,
      released: apps.filter(app => app.status === 'Released').length,
      rejected: apps.filter(app => app.status === 'Rejected').length,
    };
    setStats(stats);
  };

  const getFilteredApplications = () => {
    return applications
      .filter((app: Application) => {
        // Status filter
        if (statusFilters.length > 0 && !statusFilters.includes(app.status)) {
          return false;
        }
        // Permit type filter
        if (permitTypeFilter !== 'all' && (app.attribute_name || app.permit_type_name) !== permitTypeFilter) {
          return false;
        }
        // Creator filter
        if (creatorFilter !== 'all' && app.creator_name !== creatorFilter) {
          return false;
        }
        // Assessor filter
        if (assessorFilter !== 'all' && app.assessor_name !== assessorFilter) {
          return false;
        }
        // Approver filter
        if (approverFilter !== 'all' && app.approver_name !== approverFilter) {
          return false;
        }
        // Date range filter
        if (dateRangeStart) {
          const appDate = new Date(app.created_at);
          const startDate = new Date(dateRangeStart);
          if (appDate < startDate) return false;
        }
        if (dateRangeEnd) {
          const appDate = new Date(app.created_at);
          const endDate = new Date(dateRangeEnd);
          endDate.setHours(23, 59, 59, 999);
          if (appDate > endDate) return false;
        }
        // Search filter
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            (app.permit_number?.toLowerCase().includes(term) ?? false) ||
            app.entity_name.toLowerCase().includes(term) ||
            app.permit_type_name.toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a: Application, b: Application) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        }

        return sortDirection === 'asc'
          ? (aVal as any) - (bVal as any)
          : (bVal as any) - (aVal as any);
      });
  };

  const handleColumnToggle = (column: ColumnKey) => {
    if (visibleColumns.includes(column)) {
      setVisibleColumns(visibleColumns.filter((c: ColumnKey) => c !== column));
    } else {
      setVisibleColumns([...visibleColumns, column]);
    }
  };

  const handleSort = (column: ColumnKey) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleStatusFilter = (status: string) => {
    if (statusFilters.includes(status)) {
      setStatusFilters(statusFilters.filter((s: string) => s !== status));
    } else {
      setStatusFilters([...statusFilters, status]);
    }
  };

  const exportToCSV = () => {
    const filteredData = getFilteredApplications();
    const headers = AVAILABLE_COLUMNS
      .filter(col => visibleColumns.includes(col.key))
      .map(col => col.label);

    const rows = filteredData.map((app: Application) =>
      AVAILABLE_COLUMNS
        .filter(col => visibleColumns.includes(col.key))
        .map(col => {
          let value = app[col.key];
          if (col.key === 'created_at' || col.key === 'assessed_at' || col.key === 'approved_at') {
            value = value ? new Date(value as string).toLocaleDateString() : '';
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Report
  const handleGenerateReport = async (format: 'pdf' | 'html' | 'csv' | 'xlsx') => {
    const filteredData = getFilteredApplications();
    if (filteredData.length === 0) {
      setReportError('No data to export. Please adjust your filters.');
      setTimeout(() => setReportError(null), 3000);
      return;
    }

    try {
      setGeneratingFormat(format);
      setReportError(null);

      // Call the backend report generation endpoint
      const response = await api.post('/reports/generate', {
        templateName: 'applications',
        format: format,
        statusFilter: statusFilters.length > 0 ? statusFilters[0] : undefined,
        startDate: dateRangeStart || undefined,
        endDate: dateRangeEnd || undefined,
      }, {
        responseType: 'blob'
      });

      // Create a blob URL and download
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      let fileName = `report_${new Date().toISOString().split('T')[0]}`;
      const responseHeaders = response.headers['content-disposition'];
      
      if (responseHeaders) {
        const match = responseHeaders.match(/filename="?(.+?)"?$/);
        if (match) fileName = match[1];
      } else {
        fileName += format === 'xlsx' ? '.xlsx' : `.${format}`;
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Report generated successfully in ${format.toUpperCase()} format`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate report';
      setReportError(`Error generating ${format.toUpperCase()} report: ${errorMsg}`);
      console.error('Report generation error:', err);
      setTimeout(() => setReportError(null), 5000);
    } finally {
      setGeneratingFormat(null);
    }
  };

  const clearFilters = () => {
    setStatusFilters([]);
    setPermitTypeFilter('all');
    setCreatorFilter('all');
    setAssessorFilter('all');
    setApproverFilter('all');
    setDateRangeStart('');
    setDateRangeEnd('');
    setSearchTerm('');
  };

  const hasActiveFilters =
    statusFilters.length > 0 ||
    permitTypeFilter !== 'all' ||
    creatorFilter !== 'all' ||
    assessorFilter !== 'all' ||
    approverFilter !== 'all' ||
    dateRangeStart ||
    dateRangeEnd ||
    searchTerm;

  const filteredApplications = getFilteredApplications();
  const totalPages = Math.ceil(filteredApplications.length / pageSize);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Assessed':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Pending Approval':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'Paid':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Issued':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Released':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-slate-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-slate-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-slate-600 font-medium">Loading report data...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                  Reports
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">Comprehensive application analytics and reporting</p>
              </div>
            </div>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 sm:gap-3 mb-6 sm:mb-8">
            {[
              { label: 'Total', value: stats.total, bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800', sub: 'text-slate-500' },
              { label: 'Pending', value: stats.pending, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', sub: 'text-amber-500' },
              { label: 'Assessed', value: stats.assessed, bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', sub: 'text-sky-500' },
              { label: 'Pend. Approval', value: stats.pendingApproval, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', sub: 'text-orange-500' },
              { label: 'Approved', value: stats.approved, bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', sub: 'text-green-500' },
              { label: 'Paid', value: stats.paid, bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', sub: 'text-teal-500' },
              { label: 'Issued', value: stats.issued, bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', sub: 'text-indigo-500' },
              { label: 'Released', value: stats.released, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', sub: 'text-emerald-500' },
              { label: 'Rejected', value: stats.rejected, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', sub: 'text-red-500' },
            ].map(stat => (
              <button
                key={stat.label}
                onClick={() => {
                  if (stat.label === 'Total') {
                    setStatusFilters([]);
                  } else {
                    const statusMap: Record<string, string> = {
                      'Pending': 'Pending', 'Assessed': 'Assessed',
                      'Pend. Approval': 'Pending Approval', 'Approved': 'Approved',
                      'Paid': 'Paid', 'Issued': 'Issued', 'Released': 'Released', 'Rejected': 'Rejected',
                    };
                    const s = statusMap[stat.label];
                    if (s) setStatusFilters((prev: string[]) => prev.includes(s) ? prev.filter((x: string) => x !== s) : [...prev, s]);
                  }
                }}
                className={`rounded-xl border p-2 sm:p-3 text-left transition-all duration-150 hover:shadow-sm ${stat.bg} ${stat.border} ${
                  stat.label !== 'Total' && statusFilters.includes(
                    ({ 'Pending': 'Pending', 'Assessed': 'Assessed', 'Pend. Approval': 'Pending Approval',
                       'Approved': 'Approved', 'Paid': 'Paid', 'Issued': 'Issued',
                       'Released': 'Released', 'Rejected': 'Rejected' } as Record<string, string>)[stat.label] || ''
                  ) ? 'ring-2 ring-offset-1 ring-current' : ''
                }`}
              >
                <div className={`text-xl sm:text-2xl font-bold ${stat.text}`}>{stat.value}</div>
                <div className={`text-[10px] sm:text-xs font-medium mt-0.5 ${stat.sub}`}>{stat.label}</div>
              </button>
            ))}
          </div>

          {/* Status Distribution Bar Chart */}
          {stats.total > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6 sm:mb-8">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Status Distribution</h3>
              <div className="space-y-2">
                {[
                  { label: 'Pending', value: stats.pending, color: 'bg-amber-400' },
                  { label: 'Assessed', value: stats.assessed, color: 'bg-sky-400' },
                  { label: 'Pending Approval', value: stats.pendingApproval, color: 'bg-orange-400' },
                  { label: 'Approved', value: stats.approved, color: 'bg-green-400' },
                  { label: 'Paid', value: stats.paid, color: 'bg-teal-400' },
                  { label: 'Issued', value: stats.issued, color: 'bg-indigo-400' },
                  { label: 'Released', value: stats.released, color: 'bg-emerald-400' },
                  { label: 'Rejected', value: stats.rejected, color: 'bg-red-400' },
                ].filter(s => s.value > 0).map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="w-24 sm:w-32 text-xs text-slate-600 text-right shrink-0">{s.label}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={`${s.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                        style={{ width: `${Math.max((s.value / stats.total) * 100, 2)}%` }}
                      >
                        <span className="text-[10px] font-semibold text-white drop-shadow">{s.value}</span>
                      </div>
                    </div>
                    <div className="w-10 text-xs text-slate-500 text-right shrink-0">
                      {stats.total > 0 ? `${Math.round((s.value / stats.total) * 100)}%` : '0%'}
                    </div>
                  </div>
                ))}
              </div>
              {totalAmountDue > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Amount Due</span>
                  <span className="text-sm font-bold text-teal-700">
                    ₱{totalAmountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6 sm:mb-8">
            <div className="flex flex-col gap-4">
              {/* Category Filter Row */}
              {permitCategories.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category:</span>
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                      selectedCategory === '' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All
                  </button>
                  {permitCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                        selectedCategory === cat ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Top Row - Search and Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by permit number, permittee name, or permit type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 pl-10 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                  />
                  <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200"
                    title="Select columns to display"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    <span className="hidden sm:inline">Columns</span>
                  </button>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      hasActiveFilters
                        ? 'bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="Advanced filters"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="hidden sm:inline">Filters</span>
                    {hasActiveFilters && <span className="ml-1 text-xs font-bold">Active</span>}
                  </button>

                  <button
                    onClick={exportToCSV}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all duration-200"
                    title="Export to CSV"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4m0 0V8m0 4h4m-4 0H8m6-11a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="hidden sm:inline">Export</span>
                  </button>

                  {/* Report Dropdown */}
                  <div className="relative group">
                    <button
                      className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-700 hover:from-indigo-100 hover:to-blue-100 transition-all duration-200"
                      title="Generate Report"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="hidden sm:inline">Report</span>
                      <svg className="h-3 w-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>

                    <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => handleGenerateReport('html')}
                          disabled={generatingFormat !== null}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingFormat === 'html' ? '⏳ Generating HTML...' : '🌐 HTML Report'}
                        </button>
                        <button
                          onClick={() => handleGenerateReport('pdf')}
                          disabled={generatingFormat !== null}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingFormat === 'pdf' ? '⏳ Generating PDF...' : '📕 PDF Report'}
                        </button>
                        <button
                          onClick={() => handleGenerateReport('csv')}
                          disabled={generatingFormat !== null}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingFormat === 'csv' ? '⏳ Generating CSV...' : '📊 CSV Report'}
                        </button>
                        <button
                          onClick={() => handleGenerateReport('xlsx')}
                          disabled={generatingFormat !== null}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {generatingFormat === 'xlsx' ? '⏳ Generating Excel...' : '📗 Excel Report'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {reportError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                  <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{reportError}</span>
                </div>
              )}

              {/* Column Selector */}
              {showColumnSelector && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Select Columns to Display</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {AVAILABLE_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(col.key)}
                          onChange={() => handleColumnToggle(col.key)}
                          className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Advanced Filters */}
              {showFilters && (
                <div className="pt-4 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    {/* Status Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Status</label>
                      <div className="space-y-2">
                        {['Pending', 'Assessed', 'Pending Approval', 'Approved', 'Paid', 'Issued', 'Released', 'Rejected'].map(status => (
                          <label key={status} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={statusFilters.includes(status)}
                              onChange={() => toggleStatusFilter(status)}
                              className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Permit Type Filter */}
                    <div>
                      <label htmlFor="permit-filter" className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Permit Type</label>
                      <select
                        id="permit-filter"
                        value={permitTypeFilter}
                        onChange={(e) => setPermitTypeFilter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                      >
                        <option value="all">All Permit Types</option>
                        {permitTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Creator Filter */}
                    <div>
                      <label htmlFor="creator-filter" className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Creator</label>
                      <select
                        id="creator-filter"
                        value={creatorFilter}
                        onChange={(e) => setCreatorFilter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                      >
                        <option value="all">All Creators</option>
                        {creators.map(creator => (
                          <option key={creator} value={creator}>{creator}</option>
                        ))}
                      </select>
                    </div>

                    {/* Assessor Filter */}
                    <div>
                      <label htmlFor="assessor-filter" className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Assessor</label>
                      <select
                        id="assessor-filter"
                        value={assessorFilter}
                        onChange={(e) => setAssessorFilter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                      >
                        <option value="all">All Assessors</option>
                        {assessors.map(assessor => (
                          <option key={assessor} value={assessor}>{assessor}</option>
                        ))}
                      </select>
                    </div>

                    {/* Approver Filter */}
                    <div>
                      <label htmlFor="approver-filter" className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Approver</label>
                      <select
                        id="approver-filter"
                        value={approverFilter}
                        onChange={(e) => setApproverFilter(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                      >
                        <option value="all">All Approvers</option>
                        {approvers.map(approver => (
                          <option key={approver} value={approver}>{approver}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date Range Start */}
                    <div>
                      <label htmlFor="date-start" className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">From Date</label>
                      <input
                        id="date-start"
                        type="date"
                        value={dateRangeStart}
                        onChange={(e) => setDateRangeStart(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                      />
                    </div>

                    {/* Date Range End */}
                    <div>
                      <label htmlFor="date-end" className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">To Date</label>
                      <input
                        id="date-end"
                        type="date"
                        value={dateRangeEnd}
                        onChange={(e) => setDateRangeEnd(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:text-red-600 transition-colors duration-200"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-800">
                {filteredApplications.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredApplications.length)}
              </span> of <span className="font-semibold text-slate-800">{filteredApplications.length}</span> results
              {applications.length !== filteredApplications.length && (
                <span className="text-teal-600 ml-2">(filtered from {applications.length})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="page-size" className="text-xs text-slate-500">Per page:</label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 bg-white focus:border-teal-500 outline-none"
              >
                {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">No applications found</p>
                <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search term</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-slate-200">
                      {AVAILABLE_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-slate-700 cursor-pointer hover:bg-slate-100/50 transition-colors duration-150 select-none whitespace-nowrap"
                        >
                          <div className="flex items-center gap-2">
                            {col.label}
                            {sortColumn === col.key && (
                              <svg
                                className={`h-3.5 w-3.5 text-teal-600 transition-transform ${
                                  sortDirection === 'desc' ? 'rotate-180' : ''
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                              </svg>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedApplications.map((app, index) => (
                      <tr
                        key={app.application_id}
                        className="hover:bg-slate-50/50 transition-colors duration-150 group"
                      >
                        {AVAILABLE_COLUMNS.filter(col => visibleColumns.includes(col.key)).map(col => {
                          let cellContent: React.ReactNode = '';

                          if (col.key === 'status') {
                            cellContent = (
                              <span className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border ${getStatusColor(app[col.key])}`}>
                                {app[col.key]}
                              </span>
                            );
                          } else if (col.key === 'created_at' || col.key === 'assessed_at' || col.key === 'approved_at') {
                            const dateValue = app[col.key];
                            cellContent = dateValue ? new Date(dateValue as string).toLocaleDateString() : '-';
                          } else if (col.key === 'assessor_name' || col.key === 'approver_name') {
                            cellContent = app[col.key] || '-';
                          } else if (col.key === 'permit_type_name') {
                            cellContent = app.attribute_name || app.permit_type_name || '-';
                          } else {
                            cellContent = app[col.key];
                          }

                          return (
                            <td
                              key={`${app.application_id}-${col.key}`}
                              className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-slate-700 whitespace-nowrap truncate"
                              title={typeof cellContent === 'string' ? cellContent : undefined}
                            >
                              {cellContent}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 px-1">
              <div className="text-xs text-slate-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="First page"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ‹ Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-150 ${
                        currentPage === page
                          ? 'bg-slate-800 text-white border-slate-800 font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Last page"
                >
                  »
                </button>
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-4 text-xs text-slate-500 text-center">
            <p>Click stat cards to filter by status. Click column headers to sort. Use filters and column selector to customize your view.</p>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
