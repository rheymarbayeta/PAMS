'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Lessee {
  id: number;
  name: string;
  contact_number: string | null;
  email: string | null;
  stall_number: string | null;
  floor_level: string | null;
  area_sqm: number | null;
  contract_effective_date: string | null;
  contract_termination_date: string | null;
  status: string | null;
}

export default function RightsAndRentalsPage() {
  const { user, hasRole } = useAuth();
  const [lessees, setLessees] = useState<Lessee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'table'>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('rentalsViewMode') as 'list' | 'grid' | 'table' | null;
    if (saved) setViewMode(saved);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchLessees();
  }, []);

  const fetchLessees = async () => {
    try {
      const response = await api.get('/api/rights-and-rentals/lessees');
      setLessees(response.data);
    } catch (error) {
      console.error('Error fetching lessees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (lesseeId: number) => {
    if (!confirm('Are you sure you want to delete this lessee?')) return;
    try {
      await api.delete(`/api/rights-and-rentals/lessees/${lesseeId}`);
      fetchLessees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting lessee');
    }
  };

  // Check if user can edit
  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  // Filter lessees by search term
  const filteredLessees = lessees.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.contact_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (l.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (l.stall_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredLessees.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedLessees = filteredLessees.slice(startIndex, endIndex);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading lessees...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rights & Rentals</h1>
            <p className="text-gray-600">Manage lessee information, properties, and lease contracts</p>
          </div>

          {/* Quick Access Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Lessee Information Card */}
            <Link href="/admin/rights-and-rentals">
              <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-200 cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Lessee Information</h3>
                    <p className="text-sm text-gray-600 mb-3">Manage lessee contact details and information</p>
                    <span className="text-blue-600 font-medium text-sm hover:text-blue-700">View Lessees →</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Properties Card */}
            <Link href="/admin/rights-and-rentals/properties">
              <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-orange-200 transition-all duration-200 cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Properties</h3>
                    <p className="text-sm text-gray-600 mb-3">Manage commercial stalls and property units</p>
                    <span className="text-orange-600 font-medium text-sm hover:text-orange-700">View Properties →</span>
                  </div>
                </div>
              </div>
            </Link>

            {/* Lease Contracts Card */}
            <Link href="/admin/rights-and-rentals/lease-contracts">
              <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-indigo-200 transition-all duration-200 cursor-pointer h-full">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Lease Contracts</h3>
                    <p className="text-sm text-gray-600 mb-3">Manage lease agreements and payments</p>
                    <span className="text-indigo-600 font-medium text-sm hover:text-indigo-700">View Contracts →</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Lessee List Section */}
          <div>
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                      Recent Lessees
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500">{filteredLessees.length} {filteredLessees.length === 1 ? 'lessee' : 'lessees'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none sm:min-w-56">
                    <input
                      type="text"
                      placeholder="Search lessees..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 pl-10 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 outline-none"
                      aria-label="Search lessees"
                    />
                    <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {canEdit && (
                    <Link
                      href="/admin/rights-and-rentals/add-lessee"
                      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg shadow-blue-200 whitespace-nowrap text-sm"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add
                    </Link>
                  )}
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => { setViewMode('list'); localStorage.setItem('rentalsViewMode', 'list'); }} className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="List view"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></button>
                    <button onClick={() => { setViewMode('grid'); localStorage.setItem('rentalsViewMode', 'grid'); }} className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="Grid view"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
                    <button onClick={() => { setViewMode('table'); localStorage.setItem('rentalsViewMode', 'table'); }} className={`p-2 rounded-md transition-all duration-200 ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`} title="Table view"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                  </div>
                </div>
              </div>
            </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{paginatedLessees.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, filteredLessees.length)}</span> of <span className="font-semibold">{filteredLessees.length}</span> lessees
            </div>
            {filteredLessees.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Show per page:</label>
                <select
                  value={recordsPerPage}
                  onChange={(e) => {
                    setRecordsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {[5, 10, 20, 50, 100].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          </div>

          {/* Lessees Display */}
          {paginatedLessees.length === 0 ? (
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-8">
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No lessees found</h3>
                <p className="mt-1 text-sm text-gray-600">{searchTerm ? 'No lessees match your search criteria.' : 'Get started by adding your first lessee.'}</p>
                {canEdit && !searchTerm && (
                  <Link href="/admin/rights-and-rentals/add-lessee" className="mt-4 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    Add Lessee
                  </Link>
                )}
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedLessees.map((lessee) => (
                <div key={lessee.id} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:shadow-md hover:border-blue-200 transition-all duration-200 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-700">{lessee.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{lessee.name}</p>
                      {lessee.stall_number && <p className="text-xs text-gray-500">Stall {lessee.stall_number}{lessee.floor_level ? ` (${lessee.floor_level})` : ''}</p>}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-500">
                    {lessee.contact_number && <div>{lessee.contact_number}</div>}
                    {lessee.email && <div className="truncate">{lessee.email}</div>}
                    {lessee.area_sqm && <div>{lessee.area_sqm} sqm</div>}
                  </div>
                  {lessee.status && (
                    <span className={`self-start inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lessee.status === 'active' ? 'bg-green-100 text-green-800' : lessee.status === 'terminated' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {lessee.status.charAt(0).toUpperCase() + lessee.status.slice(1)}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100 mt-auto">
                    <Link href={`/admin/rights-and-rentals/lessee/${lessee.id}`} className="flex-1 text-center px-2 py-1.5 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-md border border-blue-200 hover:border-blue-600 transition-all duration-200">View</Link>
                    {canEdit && <Link href={`/admin/rights-and-rentals/edit-lessee/${lessee.id}`} className="flex-1 text-center px-2 py-1.5 text-xs font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-md border border-indigo-200 hover:border-indigo-600 transition-all duration-200">Edit</Link>}
                    {canEdit && <button onClick={() => handleDelete(lessee.id)} className="flex-1 px-2 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-md border border-red-200 hover:border-red-600 transition-all duration-200">Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <ul className="divide-y divide-gray-100">
                {paginatedLessees.map((lessee) => (
                  <li key={lessee.id} className="px-4 sm:px-6 py-4 hover:bg-blue-50/50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-700">{lessee.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{lessee.name}</span>
                            {lessee.stall_number && <span className="text-xs text-gray-500">Stall {lessee.stall_number}{lessee.floor_level ? ` (${lessee.floor_level})` : ''}</span>}
                            {lessee.status && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${lessee.status === 'active' ? 'bg-green-100 text-green-800' : lessee.status === 'terminated' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{lessee.status.charAt(0).toUpperCase() + lessee.status.slice(1)}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            {lessee.contact_number && <span>{lessee.contact_number}</span>}
                            {lessee.email && <><span className="text-gray-300">•</span><span className="truncate max-w-[160px]">{lessee.email}</span></>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Link href={`/admin/rights-and-rentals/lessee/${lessee.id}`} className="px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-md border border-blue-200 hover:border-blue-600 transition-all duration-200">View</Link>
                        {canEdit && <Link href={`/admin/rights-and-rentals/edit-lessee/${lessee.id}`} className="px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 rounded-md border border-indigo-200 hover:border-indigo-600 transition-all duration-200">Edit</Link>}
                        {canEdit && <button onClick={() => handleDelete(lessee.id)} className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-md border border-red-200 hover:border-red-600 transition-all duration-200">Delete</button>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Name</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Contact Number</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Email</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Stall</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Contract Status</th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedLessees.map((lessee, index) => (
                      <tr
                        key={lessee.id}
                        className="hover:bg-blue-50/50 transition-colors duration-150"
                      >
                        <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">{lessee.name}</td>
                        <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">{lessee.contact_number || '-'}</td>
                        <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">{lessee.email || '-'}</td>
                        <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">
                          {lessee.stall_number ? `${lessee.stall_number}${lessee.floor_level ? ` (${lessee.floor_level})` : ''}` : '-'}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-sm">
                          {lessee.status ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              lessee.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : lessee.status === 'terminated'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {lessee.status.charAt(0).toUpperCase() + lessee.status.slice(1)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/rights-and-rentals/lessee/${lessee.id}`}
                              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-150"
                            >
                              View
                            </Link>
                            {canEdit && (
                              <>
                                <Link
                                  href={`/admin/rights-and-rentals/edit-lessee/${lessee.id}`}
                                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors duration-150"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDelete(lessee.id)}
                                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-150"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination controls - AFTER list */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
