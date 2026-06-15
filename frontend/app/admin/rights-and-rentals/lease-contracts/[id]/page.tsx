'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert, showConfirm } from '@/utils/modal';

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
  outstanding_rental_balance?: number;
  outstanding_balance_notes?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  property_units: { id: number; stall_number: string; floor_level: string; unit_description: string; area_sqm: number | null; status: string }[];
}

export default function ViewLeaseContractPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.id as string;
  const { user } = useAuth();

  const [contract, setContract] = useState<LeaseContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Billing modal
  const now = new Date();
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingUrl, setBillingUrl] = useState('');

  // Outstanding balance modal
  const [showOutstandingModal, setShowOutstandingModal] = useState(false);
  const [outstandingAmount, setOutstandingAmount] = useState('');
  const [outstandingNotes, setOutstandingNotes] = useState('');
  const [savingOutstanding, setSavingOutstanding] = useState(false);

  const openBillingModal = () => {
    const token = localStorage.getItem('token') || '';
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
    const url = `/billing-statement.html?id=${contractId}&month=${month}&year=${year}&token=${encodeURIComponent(token)}&_v=${Date.now()}`;
    setBillingUrl(url);
    setShowBillingModal(true);
  };

  const closeBillingModal = () => {
    setShowBillingModal(false);
    setBillingUrl('');
  };

  const openOutstandingModal = () => {
    if (!contract) return;
    setOutstandingAmount(String(contract.outstanding_rental_balance ?? 0));
    setOutstandingNotes(contract.outstanding_balance_notes || '');
    setShowOutstandingModal(true);
  };

  const closeOutstandingModal = () => {
    setShowOutstandingModal(false);
  };

  const handleSaveOutstandingBalance = async () => {
    const amount = parseFloat(outstandingAmount);
    if (Number.isNaN(amount) || amount < 0) {
      showAlert('Please enter a valid non-negative amount', 'Validation Error');
      return;
    }

    setSavingOutstanding(true);
    try {
      const response = await api.patch(
        `/api/rights-and-rentals/lease-contracts/${contractId}/outstanding-balance`,
        {
          outstanding_rental_balance: amount,
          outstanding_balance_notes: outstandingNotes.trim() || null,
        }
      );
      setContract((prev) => (prev ? { ...prev, ...response.data } : prev));
      setShowOutstandingModal(false);
      showAlert('Outstanding balance saved successfully', 'Success');
    } catch (error: any) {
      showAlert(error.response?.data?.error || 'Error saving outstanding balance', 'Error');
    } finally {
      setSavingOutstanding(false);
    }
  };

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
    showConfirm(
      'Are you sure you want to delete this lease contract? This action cannot be undone.',
      'Confirm Delete',
      async () => {
        try {
          await api.delete(`/api/rights-and-rentals/lease-contracts/${contractId}`);
          router.push('/admin/rights-and-rentals/lease-contracts');
        } catch (error: any) {
          showAlert(error.response?.data?.error || 'Error deleting lease contract', 'Error');
        }
      },
      undefined,
      { isDangerous: true }
    );
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
                {contract.property_units && contract.property_units.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-2">Units / Stalls</p>
                    <div className="flex flex-wrap gap-2">
                      {contract.property_units.map(unit => (
                        <span
                          key={unit.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm font-medium text-indigo-800"
                        >
                          {unit.stall_number}
                          {unit.floor_level ? ` (${unit.floor_level})` : ''}
                          {unit.unit_description ? ` – ${unit.unit_description}` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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

            {/* Outstanding Balance */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Outstanding Balance
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Previous or other unpaid rental balance carried into billing statements.
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={openOutstandingModal}
                    className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {(contract.outstanding_rental_balance ?? 0) > 0 ? 'Edit' : 'Add'} Balance
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                  <p className="text-sm text-amber-800 font-medium">Outstanding Rental Balance</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">
                    {formatCurrency(contract.outstanding_rental_balance ?? 0)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <p className="text-sm text-gray-600 font-medium">Notes / Source</p>
                  <p className="text-base text-gray-900 mt-1">
                    {contract.outstanding_balance_notes?.trim() || 'No notes provided'}
                  </p>
                </div>
              </div>
              {(contract.outstanding_rental_balance ?? 0) > 0 && (
                <p className="text-xs text-gray-500 mt-4">
                  This amount is included in the BALANCE line on billing statements and is subject to the 20% surcharge when unpaid.
                </p>
              )}
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
              <button
                onClick={openBillingModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Billing Statement
              </button>
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

      {/* Billing Statement Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-5xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Billing Statement</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    const month = now.getMonth() + 1;
                    const year  = now.getFullYear();
                    setBillingUrl(`/billing-statement.html?id=${contractId}&month=${month}&year=${year}&token=${encodeURIComponent(token)}&_v=${Date.now()}`);
                  }}
                  title="Regenerate"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerate
                </button>
                <button
                  onClick={closeBillingModal}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Body – iframe */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={billingUrl}
                className="w-full h-full border-0"
                title="Billing Statement"
              />
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeBillingModal}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Outstanding Balance Modal */}
      {showOutstandingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Outstanding Balance</h3>
              <p className="text-sm text-gray-500 mt-1">
                Set a carried-forward rental balance from previous periods or other sources.
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label htmlFor="outstanding_amount" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Amount (PHP) *
                </label>
                <input
                  id="outstanding_amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={outstandingAmount}
                  onChange={(e) => setOutstandingAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="outstanding_notes" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes / Source
                </label>
                <input
                  id="outstanding_notes"
                  type="text"
                  value={outstandingNotes}
                  onChange={(e) => setOutstandingNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g., Balance from January 2025 manual records"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeOutstandingModal}
                disabled={savingOutstanding}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOutstandingBalance}
                disabled={savingOutstanding}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {savingOutstanding ? 'Saving...' : 'Save Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
