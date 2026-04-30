'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface LeaseContract {
  id: number;
  lessee_id: number;
  lessee_name: string;
  lessee_email: string;
  lessee_contact: string;
  property_id: number;
  property_name: string;
  property_code: string;
  property_address: string;
  contract_effective_date: string;
  contract_termination_date: string | null;
  principal_amount: number;
  monthly_rights_amount: number;
  monthly_rental_amount: number;
  downpayment: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ViewLeaseContractPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;
  const { user } = useAuth();

  const [contract, setContract] = useState<LeaseContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchContractDetails();
  }, [contractId]);

  const fetchContractDetails = async () => {
    try {
      const response = await api.get(`/api/rights-and-rentals/lease-contracts/${contractId}`);
      setContract(response.data);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error loading lease contract details');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this lease contract?')) return;
    try {
      await api.delete(`/api/rights-and-rentals/lease-contracts/${contractId}`);
      router.push('/admin/rights-and-rentals/lease-contracts');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting lease contract');
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Assessor', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading lease contract details...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !contract) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Assessor', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-4">
              <svg className="h-8 w-8 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-medium text-red-800">{error || 'Lease contract not found'}</h3>
                <Link href="/admin/rights-and-rentals/lease-contracts" className="text-red-600 hover:text-red-900 text-sm mt-1">
                  Back to Lease Contracts
                </Link>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Assessor', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/rights-and-rentals/lease-contracts"
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {contract.lessee_name}
                  </h1>
                  <p className="text-gray-600 mt-1">{contract.property_name}</p>
                </div>
              </div>
              <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-6">
            {/* Lessee Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
                Lessee Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="text-lg font-medium text-gray-900">{contract.lessee_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-lg font-medium text-gray-900">{contract.lessee_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contact Number</p>
                  <p className="text-lg font-medium text-gray-900">{contract.lessee_contact || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Property Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Property Name</p>
                  <p className="text-lg font-medium text-gray-900">{contract.property_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Property Code</p>
                  <p className="text-lg font-medium text-gray-900">{contract.property_code}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">Address</p>
                  <p className="text-lg font-medium text-gray-900">{contract.property_address}</p>
                </div>
              </div>
            </div>

            {/* Contract Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Contract Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Effective Date</p>
                  <p className="text-lg font-medium text-gray-900">
                    {formatDate(contract.contract_effective_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Termination Date</p>
                  <p className="text-lg font-medium text-gray-900">
                    {contract.contract_termination_date ? formatDate(contract.contract_termination_date) : 'Not Set'}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.16 2.751A.75.75 0 019 2h2a.75.75 0 01.84.75v.008a49.488 49.488 0 0113.456 2.752.75.75 0 01-.575 1.415A47.999 47.999 0 0010.5 6.5c-1.579 0-3.119-.068-4.604-.198a.75.75 0 01-.575-1.415A49.5 49.5 0 018.16 2.751z" />
                  <path d="M5 6.75c-1.592 0-2.75 1.158-2.75 2.75v7.5c0 1.592 1.158 2.75 2.75 2.75h10c1.592 0 2.75-1.158 2.75-2.75v-7.5c0-1.592-1.158-2.75-2.75-2.75H5z" />
                </svg>
                Financial Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-indigo-700 font-medium">Principal Amount</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">
                    {formatCurrency(contract.principal_amount)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700 font-medium">Downpayment</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {formatCurrency(contract.downpayment)}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700 font-medium">Monthly Rights Amount</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {formatCurrency(contract.monthly_rights_amount)}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-700 font-medium">Monthly Rental Amount</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {formatCurrency(contract.monthly_rental_amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                <div>
                  <p>Created: {formatDate(contract.created_at)}</p>
                  <p>Updated: {formatDate(contract.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {canEdit && (
                <>
                  <Link
                    href={`/admin/rights-and-rentals/lease-contracts/${contract.id}/edit`}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Contract
                  </Link>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              )}
              <Link
                href="/admin/rights-and-rentals/lease-contracts"
                className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition-colors"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
