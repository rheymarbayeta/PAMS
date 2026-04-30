'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PropertyUnitsSection from '@/components/PropertyUnitsSection';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface PropertyUnit {
  id: number;
  property_id: number;
  stall_number: string;
  floor_level: string | null;
  unit_descriptionel: string | null;
  unit_description: string | null;
  area_sqm: number | null;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  created_at: string;
  updated_at: string;
}

interface PropertyLease {
  id: number;
  contract_effective_date: string;
  contract_termination_date: string;
  status: string;
  lessee_name: string;
  contact_number: string | null;
  email: string | null;
}

interface Property {
  id: number;
  property_name: string;
  property_code: string;
  address: string | null;
  description: string | null;
  created_at: string;
  total_leases: number;
  active_leases: number;
  leases: PropertyLease[];
  units: PropertyUnit[];
}

export default function ViewPropertyPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const { user } = useAuth();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchPropertyDetails();
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    try {
      const response = await api.get(`/api/rights-and-rentals/properties/${propertyId}`);
      setProperty(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error loading property details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if user can edit
  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading property details...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !property) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0 0v-2m0-4v-2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Error</h3>
              <p className="text-gray-600 mt-2">{error}</p>
              <Link href="/admin/rights-and-rentals/properties" className="mt-6 text-orange-600 hover:text-orange-700 font-medium">
                Back to Properties
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/admin/rights-and-rentals/properties" className="hover:text-gray-700">
                Properties
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{property.property_name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.property_name}</h1>
                <p className="text-gray-600">Property/Building Information</p>
              </div>
              {canEdit && (
                <Link
                  href={`/admin/rights-and-rentals/edit-property/${property.id}`}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-5 py-2.5 rounded-xl font-medium hover:from-orange-700 hover:to-orange-800 focus:ring-4 focus:ring-orange-200 transition-all duration-200 shadow-lg shadow-orange-200"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Link>
              )}
            </div>
          </div>

          {/* Property Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Basic Information */}
            <div className="md:col-span-2 bg-white shadow-lg rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Property Details
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Property/Building</p>
                  <p className="text-gray-900 font-medium">{property.property_name}</p>
                </div>
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Property Code</p>
                  <p className="text-gray-900 font-medium">{property.property_code}</p>
                </div>
                {property.address && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Address</p>
                    <p className="text-gray-900 font-medium">{property.address}</p>
                  </div>
                )}
                {property.description && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-gray-900">{property.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Lease Statistics */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Statistics</h2>
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Total Leases</p>
                  <p className="text-2xl font-bold text-gray-900">{property.total_leases || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Active Leases</p>
                  <p className="text-2xl font-bold text-green-600">{property.active_leases || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Created</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(property.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Property Units Section */}
          <PropertyUnitsSection
            propertyId={property.id}
            units={property.units || []}
            canEdit={canEdit}
            onUnitsUpdated={fetchPropertyDetails}
          />

          {/* Lease Contracts */}
          {property.leases && property.leases.length > 0 && (
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Current & Past Leases
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Lessee Name</th>
                      <th className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Contact</th>
                      <th className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Period</th>
                      <th className="px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {property.leases.map((lease) => (
                      <tr key={lease.id} className="hover:bg-orange-50/50 transition-colors duration-150">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{lease.lessee_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>
                            {lease.contact_number && <p>{lease.contact_number}</p>}
                            {lease.email && <p className="break-all">{lease.email}</p>}
                            {!lease.contact_number && !lease.email && <span>-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(lease.contract_effective_date)} to {formatDate(lease.contract_termination_date)}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lease.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : lease.status === 'terminated'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="flex gap-3 mt-6">
            <Link
              href="/admin/rights-and-rentals/properties"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 transition-all duration-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Properties
            </Link>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
