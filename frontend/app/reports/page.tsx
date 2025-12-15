'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Application {
  application_id: number;
  application_number: string | null;
  entity_name: string;
  permit_type: string;
  permit_type_name: string;
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

type ColumnKey = 'application_number' | 'entity_name' | 'permit_type_name' | 'status' | 'creator_name' | 'assessor_name' | 'approver_name' | 'created_at' | 'assessed_at' | 'approved_at';

const AVAILABLE_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'application_number', label: 'Application #' },
  { key: 'entity_name', label: 'Entity Name' },
  { key: 'permit_type_name', label: 'Permit Type' },
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
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>([
    'application_number',
    'entity_name',
    'permit_type_name',
    'status',
    'created_at',
  ]);

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/applications');
      const apps = response.data;
      setApplications(apps);

      // Extract unique values for filters
      const permitTypeSet = new Set(apps.map((app: Application) => app.permit_type_name));
      const creatorSet = new Set(apps.map((app: Application) => app.creator_name));
      const assessorSet = new Set(apps.map((app: Application) => app.assessor_name).filter(Boolean));
      const approverSet = new Set(apps.map((app: Application) => app.approver_name).filter(Boolean));

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
        if (permitTypeFilter !== 'all' && app.permit_type_name !== permitTypeFilter) {
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
            (app.application_number?.toLowerCase().includes(term) ?? false) ||
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

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 sm:grid-cols-3 xl:grid-cols-5 mb-6 sm:mb-8">
            {/* Total Applications */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.total}</p>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-700">{stats.pending}</p>
            </div>

            {/* Assessed */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Assessed</p>
              <p className="text-xl sm:text-2xl font-bold text-sky-700">{stats.assessed}</p>
            </div>

            {/* Approved */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Approved</p>
              <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.approved}</p>
            </div>

            {/* Paid */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-5">
              <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-teal-700">{stats.paid}</p>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6 sm:mb-8">
            <div className="flex flex-col gap-4">
              {/* Top Row - Search and Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search by application number, entity name, or permit type..."
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
                </div>
              </div>

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
          <div className="text-sm text-slate-600 mb-4">
            Showing <span className="font-semibold text-slate-800">{filteredApplications.length}</span> of <span className="font-semibold text-slate-800">{applications.length}</span> applications
            {hasActiveFilters && <span className="text-teal-600 ml-2">(filtered)</span>}
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
                    {filteredApplications.map((app, index) => (
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
                            cellContent = app[col.key] ? new Date(app[col.key]).toLocaleDateString() : '-';
                          } else if (col.key === 'assessor_name' || col.key === 'approver_name') {
                            cellContent = app[col.key] || '-';
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

          {/* Footer Info */}
          <div className="mt-4 text-xs text-slate-500 text-center">
            <p>Click column headers to sort. Use filters and column selector to customize your view.</p>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
