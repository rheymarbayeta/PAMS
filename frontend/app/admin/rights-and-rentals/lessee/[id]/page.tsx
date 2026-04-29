'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LesseePaymentDetails, { LeaseContractType } from '@/components/LesseePaymentDetails';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Lessee {
  id: number;
  name: string;
  contact_number: string | null;
  email: string | null;
  created_at: string;
}

type LeaseContract = LeaseContractType;

export default function ViewLesseePage() {
  const params = useParams();
  const lesseeId = params.id as string;
  const { user } = useAuth();

  const [lessee, setLessee] = useState<Lessee | null>(null);
  const [leaseContracts, setLeaseContracts] = useState<LeaseContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchLesseDetails();
  }, [lesseeId]);

  const fetchLesseDetails = async () => {
    try {
      const response = await api.get(`/api/rights-and-rentals/lessees/${lesseeId}`);
      
      setLessee({
        id: response.data.id,
        name: response.data.name,
        contact_number: response.data.contact_number,
        email: response.data.email,
        created_at: response.data.created_at
      });
      
      // Fetch all lease contracts for this lessee
      const contractsResponse = await api.get(`/api/rights-and-rentals/lessees/${lesseeId}/lease-contracts`);
      
      if (Array.isArray(contractsResponse.data) && contractsResponse.data.length > 0) {
        const formattedContracts = contractsResponse.data.map((contract: any) => ({
          id: contract.id,
          contract_id: contract.id,
          contract_effective_date: contract.contract_effective_date,
          contract_termination_date: contract.contract_termination_date,
          principal_amount: contract.principal_amount,
          monthly_rights_amount: contract.monthly_rights_amount,
          monthly_rental_amount: contract.monthly_rental_amount,
          downpayment: contract.downpayment,
          contract_status: contract.status,
          property_id: contract.property_id,
          property_name: contract.property_name,
          status: contract.status
        }));
        setLeaseContracts(formattedContracts);
      } else if (response.data.contract_id) {
        // Fallback for single contract
        setLeaseContracts([{
          id: response.data.contract_id,
          contract_id: response.data.contract_id,
          contract_effective_date: response.data.contract_effective_date,
          contract_termination_date: response.data.contract_termination_date,
          principal_amount: response.data.principal_amount,
          monthly_rights_amount: response.data.monthly_rights_amount,
          monthly_rental_amount: response.data.monthly_rental_amount,
          downpayment: response.data.downpayment,
          contract_status: response.data.contract_status,
          property_id: response.data.property_id,
          property_name: response.data.property_name,
          status: response.data.contract_status
        }]);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error loading lessee details');
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(value);
  };

  // Check if user can edit
  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading lessee details...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !lessee) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 0v2m0 0v-2m0-4v-2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Error</h3>
              <p className="text-gray-600 mt-2">{error}</p>
              <Link href="/admin/rights-and-rentals" className="mt-6 text-blue-600 hover:text-blue-700 font-medium">
                Back to Lessee List
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
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/admin/rights-and-rentals" className="hover:text-gray-700">
                Lessee Information
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">{lessee.name}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{lessee.name}</h1>
                <p className="text-gray-600">Lessee Details & Information</p>
              </div>
              {canEdit && (
                <Link
                  href={`/admin/rights-and-rentals/edit-lessee/${lessee.id}`}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 focus:ring-4 focus:ring-blue-200 transition-all duration-200 shadow-lg shadow-blue-200"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </Link>
              )}
            </div>
          </div>

          {/* Contact Information Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Contact Details
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Full Name</p>
                  <p className="text-gray-900 font-medium">{lessee.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contact Number</p>
                  <p className="text-gray-900 font-medium">{lessee.contact_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Email Address</p>
                  <p className="text-gray-900 font-medium break-all">{lessee.email || '-'}</p>
                </div>
              </div>
            </div>

            {/* Account Information Card */}
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Account Information
              </h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Lessee ID</p>
                  <p className="text-gray-900 font-medium">{lessee.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Account Created</p>
                  <p className="text-gray-900 font-medium">{formatDate(lessee.created_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lease Contract Information */}
          {leaseContracts.length > 0 && (
            <div className="bg-white shadow-lg rounded-2xl border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Lease Contract Details
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contract Status</p>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    leaseContracts[0].contract_status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : leaseContracts[0].contract_status === 'terminated'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {leaseContracts[0].contract_status.charAt(0).toUpperCase() + leaseContracts[0].contract_status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contract Effective Date</p>
                  <p className="text-gray-900 font-medium">{formatDate(leaseContracts[0].contract_effective_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Contract Termination Date</p>
                  <p className="text-gray-900 font-medium">{formatDate(leaseContracts[0].contract_termination_date)}</p>
                </div>
              </div>

              {/* Property Information */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Property Information</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Property/Building</p>
                    <p className="text-sm font-medium text-gray-900">{leaseContracts[0].property_name || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Financial Information */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Financial Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Principal Amount</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(leaseContracts[0].principal_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Downpayment</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(leaseContracts[0].downpayment)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Monthly Rights</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(leaseContracts[0].monthly_rights_amount)}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <p className="text-xs text-gray-600 mb-1">Monthly Rental</p>
                    <p className="text-sm font-bold text-gray-900">{formatCurrency(leaseContracts[0].monthly_rental_amount)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Payment Management Component */}
          {leaseContracts.length > 0 && (
            <LesseePaymentDetails
              lesseeId={parseInt(lesseeId)}
              lesseeName={lessee?.name || ''}
              leaseContracts={leaseContracts}
            />
          )}

          {/* Back Button */}
          <div className="flex gap-3">
            <Link
              href="/admin/rights-and-rentals"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 transition-all duration-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to List
            </Link>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
