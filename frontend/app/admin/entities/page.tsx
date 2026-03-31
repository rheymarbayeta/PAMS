'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Entity {
  entity_id: number;
  entity_name: string;
  firstname?: string;
  lastname?: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  etracs_objid?: string;
}

export default function EntitiesPage() {
  const { user, hasRole } = useAuth();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const response = await api.get('/api/entities');
      setEntities(response.data);
    } catch (error) {
      console.error('Error fetching entities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (entityId: number) => {
    if (!confirm('Are you sure you want to delete this entity?')) return;
    try {
      await api.delete(`/api/entities/${entityId}`);
      fetchEntities();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting entity');
    }
  };

  // Check if user can edit entities (all roles except Viewer)
  // If user has only Viewer role, they cannot edit. If they have Viewer + other roles, they can edit.
  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  // Filter entities by search term
  const filteredEntities = entities.filter(e => 
    e.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (e.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (e.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (e.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (e.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredEntities.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedEntities = filteredEntities.slice(startIndex, endIndex);

  // Ensure current page doesn't exceed total pages
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading entities...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Entities
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">{filteredEntities.length} {filteredEntities.length === 1 ? 'result' : 'results'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-none sm:min-w-64">
                <input
                  type="text"
                  placeholder="Search entities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 pl-10 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200 outline-none"
                  aria-label="Search entities"
                />
                <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {canEdit && (
                <Link
                  href="/admin/entities/add-entity"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 focus:ring-4 focus:ring-emerald-200 transition-all duration-200 shadow-lg shadow-emerald-200 w-full sm:w-auto"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Entity
                </Link>
              )}
            </div>
          </div>

          {/* Pagination and records info - BEFORE entities list */}
          {filteredEntities.length > 0 && (
            <div className="flex flex-col gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {/* Records per page selector */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{Math.min(recordsPerPage, filteredEntities.length)}</span> records per page out of <span className="font-semibold">{filteredEntities.length}</span> total
                </div>
                <div className="flex items-center gap-3">
                  <label htmlFor="records-per-page-selector" className="text-sm font-medium text-gray-700">
                    Records per page:
                  </label>
                  <select
                    id="records-per-page-selector"
                    value={recordsPerPage}
                    onChange={(e) => {
                      setRecordsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all duration-200 outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Page navigation */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-600">
                  Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          currentPage === pageNum
                            ? 'bg-emerald-600 text-white'
                            : 'border border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                        aria-label={`Go to page ${pageNum}`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Entities List */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {paginatedEntities.map((entity, index) => (
                <li key={entity.entity_id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                  <div className="px-4 sm:px-6 py-4 sm:py-5">
                    {/* Mobile Layout */}
                    <div className="flex items-start gap-3 sm:hidden">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-emerald-600">
                          {entity.entity_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {entity.entity_name}
                        </div>                      {entity.firstname && entity.lastname && (
                        <div className="text-xs text-gray-500 truncate">
                          {entity.firstname} {entity.lastname}
                        </div>
                      )}                        <div className="flex flex-col gap-0.5 mt-1 text-xs text-gray-500">
                          {entity.contact_person && (
                            <span className="truncate">{entity.contact_person}</span>
                          )}
                          {entity.phone && (
                            <span className="truncate">{entity.phone}</span>
                          )}
                        </div>
                        {/* Mobile action buttons */}
                        <div className="flex items-center gap-2 mt-3">
                          <Link
                            href={`/admin/entities/${entity.entity_id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </Link>
                          {canEdit && (
                            <Link
                              href={`/admin/entities/add-entity?id=${entity.entity_id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Layout */}
                    <div className="hidden sm:flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                          <span className="text-lg font-semibold text-emerald-600">
                            {entity.entity_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {entity.entity_name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500">
                            {entity.firstname && entity.lastname && (
                              <>
                                <span>{entity.firstname} {entity.lastname}</span>
                                <span className="text-gray-300">•</span>
                              </>
                            )}
                            {entity.address && (
                              <>
                                <span className="flex items-center gap-1">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {entity.address}
                                </span>
                              </>
                            )}
                            {entity.contact_person && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>{entity.contact_person}</span>
                              </>
                            )}
                            {entity.email && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>{entity.email}</span>
                              </>
                            )}
                            {entity.phone && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span>{entity.phone}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/entities/${entity.entity_id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-200 hover:border-blue-600 transition-all duration-200"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </Link>
                        {canEdit && (
                          <>
                            <Link
                              href={`/admin/entities/add-entity?id=${entity.entity_id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-white hover:bg-emerald-600 rounded-lg border border-emerald-200 hover:border-emerald-600 transition-all duration-200"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Link>
                            {hasRole('SuperAdmin') && (
                              <button
                                onClick={() => handleDelete(entity.entity_id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {filteredEntities.length === 0 && (
                <li className="px-4 sm:px-6 py-12 text-center">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <p className="text-gray-500 font-medium">
                    {searchTerm ? 'No entities found matching your search.' : 'No entities registered yet.'}
                  </p>
                </li>
              )}
            </ul>
          </div>

          {/* Modal */}

        </div>
      </Layout>
    </ProtectedRoute>
  );
}

