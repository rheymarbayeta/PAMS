'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Property {
  id: number;
  property_name: string;
  property_code: string;
  address: string | null;
  description: string | null;
}

export default function PropertiesPage() {
  const { user, hasRole } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/rights-and-rentals/properties');
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (propertyId: number) => {
    if (!confirm('Are you sure you want to delete this property?')) return;
    try {
      await api.delete(`/api/rights-and-rentals/properties/${propertyId}`);
      fetchProperties();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting property');
    }
  };

  // Check if user can edit
  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  // Filter properties by search term
  const filteredProperties = properties.filter(p => 
    p.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.address?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    (p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredProperties.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading properties...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Properties
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">{filteredProperties.length} {filteredProperties.length === 1 ? 'property' : 'properties'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-none sm:min-w-64">
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 pl-10 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 outline-none"
                  aria-label="Search properties"
                />
                <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {canEdit && (
                <Link
                  href="/admin/rights-and-rentals/add-property"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-4 sm:px-5 py-2.5 rounded-xl font-medium hover:from-orange-700 hover:to-orange-800 focus:ring-4 focus:ring-orange-200 transition-all duration-200 shadow-lg shadow-orange-200 w-full sm:w-auto"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Property
                </Link>
              )}
            </div>
          </div>

          {/* Pagination and records info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{paginatedProperties.length === 0 ? 0 : startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, filteredProperties.length)}</span> of <span className="font-semibold">{filteredProperties.length}</span> properties
            </div>
            {filteredProperties.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 whitespace-nowrap">Show per page:</label>
                <select
                  value={recordsPerPage}
                  onChange={(e) => {
                    setRecordsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none"
                >
                  {[5, 10, 20, 50, 100].map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          {paginatedProperties.length > 0 ? (
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Property/Building</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Code</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Address</th>
                      <th className="px-4 sm:px-6 py-3 text-right text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedProperties.map((property) => (
                      <tr
                        key={property.id}
                        className="hover:bg-orange-50/50 transition-colors duration-150"
                      >
                        <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">{property.property_name}</td>
                        <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">{property.property_code}</td>
                        <td className="px-4 sm:px-6 py-3 text-sm text-gray-600">{property.address || '-'}</td>
                        <td className="px-4 sm:px-6 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/rights-and-rentals/property/${property.id}`}
                              className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors duration-150"
                            >
                              View
                            </Link>
                            {canEdit && (
                              <>
                                <Link
                                  href={`/admin/rights-and-rentals/edit-property/${property.id}`}
                                  className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors duration-150"
                                >
                                  Edit
                                </Link>
                                <button
                                  onClick={() => handleDelete(property.id)}
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
          ) : (
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-8">
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-gray-900">No properties found</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {searchTerm ? 'No properties match your search criteria.' : 'Get started by adding your first property.'}
                </p>
                {canEdit && !searchTerm && (
                  <Link
                    href="/admin/rights-and-rentals/add-property"
                    className="mt-4 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-5 py-2.5 rounded-xl font-medium hover:from-orange-700 hover:to-orange-800 transition-all duration-200"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Property
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Pagination controls */}
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
                      ? 'bg-orange-600 text-white'
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
