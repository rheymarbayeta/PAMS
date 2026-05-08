'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import enforcerService from '@/services/enforcerService';

interface Enforcer {
  enforcer_id: string;
  badge_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  station?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'On Leave';
  citations_issued: number;
  total_fines: number;
  date_hired?: string;
}

interface EnforcerStats {
  total_enforcer: number;
  active_count: number;
  inactive_count: number;
  suspended_count: number;
  total_citations: number;
  total_fines: number;
}

interface FilterOptions {
  departments: string[];
  stations: string[];
  positions: string[];
}

export default function EnforcersPage() {
  const { hasRole } = useAuth();
  const router = useRouter();
  const [enforcers, setEnforcers] = useState<Enforcer[]>([]);
  const [stats, setStats] = useState<EnforcerStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEnforcer, setEditingEnforcer] = useState<Enforcer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEnforcer, setSelectedEnforcer] = useState<any>(null);
  const [enforcerCitations, setEnforcerCitations] = useState<any[]>([]);
  const [citationsLoading, setCitationsLoading] = useState(false);
  const [etracsSearching, setEtracsSearching] = useState(false);
  const [etracsResults, setEtracsResults] = useState<any[]>([]);
  const [showEtracsModal, setShowEtracsModal] = useState(false);
  
  const [formData, setFormData] = useState({
    badge_number: '',
    full_name: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    station: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Suspended' | 'On Leave',
    date_hired: '',
  });

  const [filters, setFilters] = useState({
    status: '',
    department: '',
    station: '',
    search: '',
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
  });

  useEffect(() => {
    fetchData();
  }, [filters, pagination.page, pagination.limit]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [enforcersResponse, statsResponse, filterResponse] = await Promise.all([
        enforcerService.getEnforcers({
          ...filters,
          page: pagination.page,
          limit: pagination.limit,
        }),
        enforcerService.getEnforcerStats(),
        enforcerService.getFilterOptions(),
      ]);

      setEnforcers(enforcersResponse.data || []);
      setPagination((prev) => ({
        ...prev,
        total: enforcersResponse.total || 0,
      }));
      setStats(statsResponse);
      setFilterOptions(filterResponse);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error fetching enforcers data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.badge_number || !formData.full_name) {
        alert('Badge number and full name are required');
        return;
      }

      if (editingEnforcer) {
        await enforcerService.updateEnforcer(editingEnforcer.enforcer_id, formData);
        alert('Enforcer updated successfully');
      } else {
        await enforcerService.createEnforcer(formData);
        alert('Enforcer created successfully');
      }

      setShowModal(false);
      setEditingEnforcer(null);
      setFormData({
        badge_number: '',
        full_name: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        station: '',
        status: 'Active',
        date_hired: '',
      });
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error saving enforcer';
      alert(errorMessage);
    }
  };

  const handleEdit = (enforcer: Enforcer) => {
    setEditingEnforcer(enforcer);
    setFormData({
      badge_number: enforcer.badge_number,
      full_name: enforcer.full_name,
      email: enforcer.email || '',
      phone: enforcer.phone || '',
      position: enforcer.position || '',
      department: enforcer.department || '',
      station: enforcer.station || '',
      status: enforcer.status,
      date_hired: enforcer.date_hired || '',
    });
    setShowModal(true);
  };

  const handleViewDetail = async (enforcerId: string) => {
    try {
      const response = await enforcerService.getEnforcer(enforcerId);
      setSelectedEnforcer(response);
      setShowDetailModal(true);

      // Fetch citations for this enforcer
      setCitationsLoading(true);
      try {
        const citationsResponse = await fetch(`/api/enforcers/${enforcerId}/citations?limit=10`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (citationsResponse.ok) {
          const citationsData = await citationsResponse.json();
          setEnforcerCitations(citationsData.citations || []);
        }
      } catch (error) {
        console.error('Error fetching citations:', error);
      } finally {
        setCitationsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching enforcer details:', error);
      alert('Error loading enforcer details');
    }
  };

  const handleDelete = async (enforcerId: string) => {
    if (!confirm('Are you sure you want to delete this enforcer? This will remove their record and citations association.')) {
      return;
    }
    try {
      await enforcerService.deleteEnforcer(enforcerId);
      alert('Enforcer deleted successfully');
      fetchData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Error deleting enforcer';
      alert(errorMessage);
    }
  };

  const handleVerifyName = async () => {
    if (!formData.full_name?.trim()) {
      alert('Please enter a name to verify');
      return;
    }

    try {
      setEtracsSearching(true);
      
      // Parse full name into firstname and lastname
      const nameParts = formData.full_name.trim().split(/\s+/);
      const firstname = nameParts[0] || '';
      const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Call the enforcers etracs verify-driver endpoint
      const response = await fetch(`/api/enforcers/etracs/verify-driver?firstname=${encodeURIComponent(firstname)}&lastname=${encodeURIComponent(lastname)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to verify name');
      }

      const results = await response.json();

      // Show results if there are any matches
      if (results?.all_results && results.all_results.length > 0) {
        setEtracsResults(results.all_results);
        setShowEtracsModal(true);
      } else {
        alert('No matches found in eTracs system');
      }
    } catch (error) {
      console.error('Error verifying name:', error);
      alert('Error searching eTracs system');
    } finally {
      setEtracsSearching(false);
    }
  };

  const handleSelectEtracsMatch = (match: any) => {
    // Extract name from eTracs individual data
    const firstName = match.firstname || match.first_name || '';
    const lastName = match.lastname || match.last_name || '';
    const middleName = match.middlename || match.middle_name || '';
    
    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Auto-fill form with eTracs data
    setFormData({
      ...formData,
      full_name: fullName || formData.full_name,
      email: match.email || formData.email,
      phone: match.mobile_no || match.mobile || match.phone || formData.phone,
      position: formData.position || 'Traffic Enforcer',
    });
    setShowEtracsModal(false);
    setEtracsResults([]);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Inactive':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Suspended':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'On Leave':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  if (loading && enforcers.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-slate-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-slate-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-slate-600 font-medium">Loading enforcers...</p>
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
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  Enforcer Management
                </h1>
                <p className="text-sm text-slate-500">{stats?.total_enforcer || 0} enforcers registered</p>
              </div>
            </div>
            {hasRole('Admin') || hasRole('SuperAdmin') ? (
              <button
                onClick={() => {
                  setEditingEnforcer(null);
                  setFormData({
                    badge_number: '',
                    full_name: '',
                    email: '',
                    phone: '',
                    position: '',
                    department: '',
                    station: '',
                    status: 'Active',
                    date_hired: '',
                  });
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-slate-700 focus:ring-4 focus:ring-slate-300 transition-all duration-200"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Enforcer
              </button>
            ) : null}
          </div>

          {/* Statistics Dashboard */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {/* Total Enforcers */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Enforcers</p>
                    <p className="mt-2 text-3xl font-bold text-slate-800">{stats.total_enforcer}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a7 7 0 1114 0" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Active */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Active</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.active_count}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Suspended */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Suspended</p>
                    <p className="mt-2 text-3xl font-bold text-red-600">{stats.suspended_count}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Citations Issued */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Citations</p>
                    <p className="mt-2 text-3xl font-bold text-purple-600">{stats.total_citations}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Total Fines */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Fines</p>
                    <p className="mt-2 text-3xl font-bold text-amber-600">₱{(stats.total_fines || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Name or Badge #"
                  value={filters.search}
                  onChange={(e) => {
                    setFilters({ ...filters, search: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none text-sm"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none text-sm"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => {
                    setFilters({ ...filters, department: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none text-sm"
                >
                  <option value="">All Departments</option>
                  {filterOptions?.departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Station Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Station
                </label>
                <select
                  value={filters.station}
                  onChange={(e) => {
                    setFilters({ ...filters, station: e.target.value });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none text-sm"
                >
                  <option value="">All Stations</option>
                  {filterOptions?.stations.map((station) => (
                    <option key={station} value={station}>
                      {station}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ status: '', department: '', station: '', search: '' });
                    setPagination({ ...pagination, page: 1 });
                  }}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 text-sm"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-8">
            {enforcers.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="h-12 w-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-slate-600 font-medium">No enforcers found</p>
                <p className="text-slate-500 text-sm mt-1">Create one to get started</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Badge / Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Position</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wide">Station</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Citations</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Fines</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {enforcers.map((enforcer) => (
                        <tr key={enforcer.enforcer_id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-semibold text-slate-600">
                                  {enforcer.full_name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-slate-800">{enforcer.full_name}</div>
                                <div className="text-xs text-slate-500">#{enforcer.badge_number}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-700">{enforcer.position || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-700">{enforcer.department || '-'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-700">{enforcer.station || '-'}</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeColor(
                                enforcer.status
                              )}`}
                            >
                              {enforcer.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-semibold text-slate-800">
                              {enforcer.citations_issued}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-sm font-semibold text-slate-800">
                              ₱{(enforcer.total_fines || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => router.push(`/admin/enforcers/${enforcer.enforcer_id}`)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-md border border-blue-200 hover:border-blue-600 transition-all duration-200"
                                title="View Details"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              {(hasRole('Admin') || hasRole('SuperAdmin')) && (
                                <>
                                  <button
                                    onClick={() => handleEdit(enforcer)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-teal-600 hover:text-white hover:bg-teal-600 rounded-md border border-teal-200 hover:border-teal-600 transition-all duration-200"
                                    title="Edit"
                                  >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  {hasRole('SuperAdmin') && (
                                    <button
                                      onClick={() => handleDelete(enforcer.enforcer_id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-md border border-red-200 hover:border-red-600 transition-all duration-200"
                                      title="Delete"
                                    >
                                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600">
                      Showing <span className="font-semibold">{Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}</span> to{' '}
                      <span className="font-semibold">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-semibold">{pagination.total}</span> enforcers
                    </span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => setPagination({ page: 1, limit: Number(e.target.value), total: pagination.total })}
                      className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 bg-white focus:border-slate-400 outline-none"
                    >
                      <option value={10}>10 / page</option>
                      <option value={25}>25 / page</option>
                      <option value={50}>50 / page</option>
                      <option value={100}>100 / page</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination({ ...pagination, page: 1 })}
                      disabled={pagination.page === 1}
                      className="px-2 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      «
                    </button>
                    <button
                      onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                        let pageNumber;
                        if (totalPages <= 5) {
                          pageNumber = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNumber = i + 1;
                        } else if (pagination.page >= totalPages - 2) {
                          pageNumber = totalPages - 4 + i;
                        } else {
                          pageNumber = pagination.page - 2 + i;
                        }
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => setPagination({ ...pagination, page: pageNumber })}
                            className={`px-2 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                              pagination.page === pageNumber
                                ? 'bg-slate-800 text-white'
                                : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setPagination({ ...pagination, page: Math.min(totalPages, pagination.page + 1) })}
                      disabled={pagination.page === totalPages || totalPages === 0}
                      className="px-3 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setPagination({ ...pagination, page: totalPages })}
                      disabled={pagination.page === totalPages || totalPages === 0}
                      className="px-2 py-1 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      »
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Add/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {editingEnforcer ? 'Edit Enforcer' : 'Add New Enforcer'}
                    </h3>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto pr-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Badge Number */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Badge Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                          placeholder="e.g., ENF001"
                          value={formData.badge_number}
                          onChange={(e) =>
                            setFormData({ ...formData, badge_number: e.target.value })
                          }
                        />
                      </div>

                      {/* Full Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                            placeholder="Enter full name"
                            value={formData.full_name}
                            onChange={(e) =>
                              setFormData({ ...formData, full_name: e.target.value })
                            }
                          />
                          <button
                            type="button"
                            onClick={handleVerifyName}
                            disabled={etracsSearching || !formData.full_name}
                            className="px-3 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
                            title="Verify name from eTracs"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {etracsSearching ? 'Verifying...' : 'Verify'}
                          </button>
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Email
                        </label>
                        <input
                          type="email"
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Phone
                        </label>
                        <input
                          type="tel"
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                          placeholder="+63..."
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>

                      {/* Position */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Position
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                          placeholder="e.g., Officer, Supervisor"
                          value={formData.position}
                          onChange={(e) =>
                            setFormData({ ...formData, position: e.target.value })
                          }
                        />
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Department
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                          placeholder="e.g., Traffic, Enforcement"
                          value={formData.department}
                          onChange={(e) =>
                            setFormData({ ...formData, department: e.target.value })
                          }
                        />
                      </div>

                      {/* Station */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Station
                        </label>
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                          placeholder="e.g., Downtown, North Branch"
                          value={formData.station}
                          onChange={(e) =>
                            setFormData({ ...formData, station: e.target.value })
                          }
                        />
                      </div>

                      {/* Status */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Status
                        </label>
                        <select
                          value={formData.status}
                          onChange={(e) =>
                            setFormData({ ...formData, status: e.target.value as any })
                          }
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Suspended">Suspended</option>
                          <option value="On Leave">On Leave</option>
                        </select>
                      </div>

                      {/* Date Hired */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Date Hired
                        </label>
                        <input
                          type="date"
                          className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 bg-slate-50 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                          value={formData.date_hired}
                          onChange={(e) =>
                            setFormData({ ...formData, date_hired: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          setEditingEnforcer(null);
                        }}
                        className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 focus:ring-4 focus:ring-slate-300 transition-all duration-200"
                      >
                        {editingEnforcer ? 'Update Enforcer' : 'Create Enforcer'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {showDetailModal && selectedEnforcer && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                        <span className="text-lg font-semibold text-slate-600">
                          {selectedEnforcer.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {selectedEnforcer.full_name}
                        </h3>
                        <p className="text-xs text-slate-500">#{selectedEnforcer.badge_number}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedEnforcer(null);
                      }}
                      className="text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <h4 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">
                        Basic Information
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-slate-600">Position</p>
                          <p className="font-medium text-slate-800">{selectedEnforcer.position || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Department</p>
                          <p className="font-medium text-slate-800">{selectedEnforcer.department || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Station</p>
                          <p className="font-medium text-slate-800">{selectedEnforcer.station || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Status</p>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${getStatusBadgeColor(
                              selectedEnforcer.status
                            )}`}
                          >
                            {selectedEnforcer.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                      <h4 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">
                        Contact Information
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-slate-600">Email</p>
                          <p className="font-medium text-slate-800">{selectedEnforcer.email || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Phone</p>
                          <p className="font-medium text-slate-800">{selectedEnforcer.phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-600">Date Hired</p>
                          <p className="font-medium text-slate-800">
                            {selectedEnforcer.date_hired
                              ? new Date(selectedEnforcer.date_hired).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 md:col-span-2">
                      <h4 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">
                        Performance Metrics
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs text-slate-600 font-medium mb-1">Citations Issued</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedEnforcer.citations_issued}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs text-slate-600 font-medium mb-1">Total Fines</p>
                          <p className="text-lg font-bold text-amber-600">
                            ₱{(selectedEnforcer.total_fines || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <p className="text-xs text-slate-600 font-medium mb-1">Avg Fine</p>
                          <p className="text-lg font-bold text-blue-600">
                            ₱
                            {selectedEnforcer.citations_issued > 0
                              ? (
                                  selectedEnforcer.total_fines / selectedEnforcer.citations_issued
                                ).toLocaleString('en-PH', { maximumFractionDigits: 0 })
                              : '0'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Citations */}
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 md:col-span-2">
                      <h4 className="font-semibold text-slate-800 mb-3 text-sm uppercase tracking-wide">
                        Recent Citations
                      </h4>
                      {citationsLoading ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin h-6 w-6 text-slate-400"></div>
                        </div>
                      ) : enforcerCitations.length === 0 ? (
                        <p className="text-center py-4 text-slate-500">No citations found</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Ticket #</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Driver</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Plate</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Fine</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {enforcerCitations.map((citation) => (
                                <tr key={citation.citation_id} className="border-t border-slate-200 hover:bg-white transition-colors">
                                  <td className="px-3 py-2 text-slate-800 font-medium">{citation.ticket_number}</td>
                                  <td className="px-3 py-2 text-slate-700">{citation.driver_name}</td>
                                  <td className="px-3 py-2 text-slate-700">{citation.plate_number}</td>
                                  <td className="px-3 py-2 text-slate-700 font-medium">₱{(citation.fine_amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}</td>
                                  <td className="px-3 py-2">
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                      citation.payment_status === 'Paid' ? 'bg-green-100 text-green-700' :
                                      citation.payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {citation.payment_status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        setSelectedEnforcer(null);
                      }}
                      className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* eTracs Verification Modal */}
          {showEtracsModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
              <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      eTracs Name Verification Matches
                    </h3>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {etracsResults.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">No matches found</p>
                    ) : (
                      etracsResults.map((match, index) => {
                        const firstName = typeof match.firstname === 'object' ? match.firstname?.text || JSON.stringify(match.firstname) : match.firstname;
                        const middleName = typeof match.middlename === 'object' ? match.middlename?.text || JSON.stringify(match.middlename) : match.middlename;
                        const lastName = typeof match.lastname === 'object' ? match.lastname?.text || JSON.stringify(match.lastname) : match.lastname;
                        
                        const fullName = [firstName, middleName, lastName]
                          .filter(Boolean)
                          .join(' ')
                          .trim();
                        
                        // Determine match quality badge color
                        const getMatchQualityColor = (score: number) => {
                          if (score >= 90) return 'bg-emerald-100 text-emerald-700';
                          if (score >= 70) return 'bg-amber-100 text-amber-700';
                          return 'bg-slate-100 text-slate-700';
                        };

                        return (
                          <div
                            key={index}
                            className="p-4 border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                            onClick={() => handleSelectEtracsMatch(match)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-semibold text-slate-800">{fullName}</p>
                                  {match.match_score && (
                                    <span className={`text-xs font-medium px-2 py-1 rounded ${getMatchQualityColor(match.match_score)}`}>
                                      {match.match_score}% Match
                                    </span>
                                  )}
                                </div>
                                {match.birthdate && (
                                  <p className="text-xs text-slate-600">🗓️ DOB: {typeof match.birthdate === 'object' ? (match.birthdate?.text || JSON.stringify(match.birthdate)) : match.birthdate}</p>
                                )}
                                {match.email && (
                                  <p className="text-xs text-slate-600 mt-1">📧 {typeof match.email === 'object' ? (match.email?.text || JSON.stringify(match.email)) : match.email}</p>
                                )}
                                {(match.mobile_no || match.mobile) && (
                                  <p className="text-xs text-slate-600">📱 {typeof (match.mobile_no || match.mobile) === 'object' ? ((match.mobile_no?.text || match.mobile?.text) || JSON.stringify(match.mobile_no || match.mobile)) : (match.mobile_no || match.mobile)}</p>
                                )}
                                {match.address && (
                                  <p className="text-xs text-slate-600 mt-1">📍 {typeof match.address === 'object' ? (match.address.text || match.address.street || JSON.stringify(match.address)) : match.address}</p>
                                )}
                              </div>
                              <svg className="h-5 w-5 text-blue-600 flex-shrink-0 ml-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex justify-between gap-3 pt-4 border-t border-slate-200 mt-4">
                    <button
                      onClick={() => {
                        setShowEtracsModal(false);
                        setEtracsResults([]);
                      }}
                      className="px-5 py-2.5 border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <p className="text-xs text-slate-500 self-center">Click a match to auto-fill the form</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
