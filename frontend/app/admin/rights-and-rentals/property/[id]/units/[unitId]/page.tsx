'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface CurrentOccupant {
  lessee_id: number;
  name: string;
  contact_number: string | null;
  email: string | null;
  source: 'active_lease' | 'unit_record';
}

interface CurrentLease {
  id: number;
  contract_effective_date: string;
  contract_termination_date: string | null;
  status: string;
  monthly_rights_amount: number;
  monthly_rental_amount: number;
}

interface PropertyUnitDetail {
  id: number;
  property_id: number;
  stall_number: string;
  floor_level: string | null;
  unit_description: string | null;
  area_sqm: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  property_name: string;
  property_code: string;
  property_address: string | null;
  current_occupant: CurrentOccupant | null;
  current_lease: CurrentLease | null;
}

export default function ViewPropertyUnitPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const unitId = params.unitId as string;

  const [unit, setUnit] = useState<PropertyUnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUnitDetails();
  }, [unitId]);

  const fetchUnitDetails = async () => {
    try {
      const response = await api.get(`/api/rights-and-rentals/units/${unitId}`);
      setUnit(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error loading unit details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'reserved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
              <p className="mt-4 text-gray-600 font-medium">Loading unit details...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !unit) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="font-medium text-red-800">{error || 'Unit not found'}</h3>
              <Link
                href={`/admin/rights-and-rentals/property/${propertyId}`}
                className="text-red-600 hover:text-red-900 text-sm mt-2 inline-block"
              >
                Back to Property
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const displayStatus = unit.current_occupant ? 'occupied' : unit.status;

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/admin/rights-and-rentals/properties" className="hover:text-gray-700">
              Properties
            </Link>
            <span>/</span>
            <Link href={`/admin/rights-and-rentals/property/${propertyId}`} className="hover:text-gray-700">
              {unit.property_name}
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{unit.stall_number}</span>
          </div>

          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{unit.stall_number}</h1>
              <p className="text-gray-600 mt-1">
                {unit.property_name}
                {unit.floor_level ? ` · ${unit.floor_level}` : ''}
              </p>
            </div>
            <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full ${getStatusColor(displayStatus)}`}>
              {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
            </span>
          </div>

          <div className="space-y-6">
            {/* Unit Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10m8-10l-8-4" />
                </svg>
                Unit Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Stall Number</p>
                  <p className="text-lg font-medium text-gray-900">{unit.stall_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Floor Level</p>
                  <p className="text-lg font-medium text-gray-900">{unit.floor_level || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-lg font-medium text-gray-900">{unit.unit_description || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Area</p>
                  <p className="text-lg font-medium text-gray-900">
                    {unit.area_sqm != null ? `${unit.area_sqm} sqm` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Property</p>
                  <p className="text-lg font-medium text-gray-900">{unit.property_name}</p>
                  <p className="text-sm text-gray-500">{unit.property_code}</p>
                </div>
                {unit.property_address && (
                  <div>
                    <p className="text-sm text-gray-600">Property Address</p>
                    <p className="text-lg font-medium text-gray-900">{unit.property_address}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Current Occupant */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                Current Occupant
              </h2>

              {unit.current_occupant ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <Link
                        href={`/admin/rights-and-rentals/lessee/${unit.current_occupant.lessee_id}`}
                        className="text-lg font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        {unit.current_occupant.name}
                      </Link>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact Number</p>
                      <p className="text-lg font-medium text-gray-900">
                        {unit.current_occupant.contact_number || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-lg font-medium text-gray-900">
                        {unit.current_occupant.email || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {unit.current_lease && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Active Lease Contract</p>
                      <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-indigo-700">Contract Period</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(unit.current_lease.contract_effective_date)}
                              {' — '}
                              {unit.current_lease.contract_termination_date
                                ? formatDate(unit.current_lease.contract_termination_date)
                                : 'Ongoing'}
                            </p>
                          </div>
                          <div>
                            <p className="text-indigo-700">Monthly Amounts</p>
                            <p className="font-medium text-gray-900">
                              Rights: {formatCurrency(unit.current_lease.monthly_rights_amount)}
                            </p>
                            <p className="font-medium text-gray-900">
                              Rental: {formatCurrency(unit.current_lease.monthly_rental_amount)}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/admin/rights-and-rentals/lease-contracts/${unit.current_lease.id}`}
                          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                          View lease contract
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="text-gray-600 font-medium">No current occupant</p>
                  <p className="text-sm text-gray-500 mt-1">This unit is not assigned to an active lease.</p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Created: {formatDate(unit.created_at)}</p>
                <p>Updated: {formatDate(unit.updated_at)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href={`/admin/rights-and-rentals/property/${propertyId}`}
                className="inline-flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Property
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
