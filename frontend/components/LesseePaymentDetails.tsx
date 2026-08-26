'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 5;

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

interface PaymentPreview {
  billing_month: number;
  billing_year: number;
  has_schedule: boolean;
  schedule_row: {
    period_label: string;
    rent_type: string;
    basic_monthly_rent: number;
    vat_amount: number;
    total_monthly_rent: number;
    wht_amount: number;
    net_monthly_rent: number;
  } | null;
  monthly_rights_amount: number;
  this_month_rental: number;
  paid_this_month: number;
  remaining_this_month: number;
  suggested_rental_amount: number;
  outstanding_balance: number;
}

interface PaymentRecord {
  id: number;
  lease_contract_id: number;
  payment_date: string;
  amount_paid: string;
  balance: string;
  or_number: string;
  period_month?: number | null;
  period_year?: number | null;
  payment_type: 'rights' | 'rental';
  created_at?: string;
}

interface AccountBalance {
  principal_balance: number;
  rights_balance: number;
  rental_balance: number;
  total_balance: number;
  opening_rights_paid?: number;
  opening_rights_balance?: number;
  opening_rental_paid?: number;
  total_rights_paid?: number;
  total_rental_paid?: number;
  is_legacy_account?: boolean;
  last_updated?: string;
}

export interface LeaseContractType {
  id: number;
  contract_id?: number;
  contract_effective_date: string;
  contract_termination_date: string;
  principal_amount: number;
  monthly_rights_amount: number;
  monthly_rental_amount: number;
  downpayment: number;
  contract_status: string;
  property_id: number;
  property_name: string;
  status: string;
}

interface LesseePaymentDetailsProps {
  lesseeId: number;
  lesseeName: string;
  leaseContracts: LeaseContractType[];
  hideContractSelector?: boolean;
  defaultContractId?: number;
  canRecordPayment?: boolean;
  layout?: 'default' | 'sidebar';
}

const LesseePaymentDetails: React.FC<LesseePaymentDetailsProps> = ({
  lesseeId,
  lesseeName,
  leaseContracts,
  hideContractSelector = false,
  defaultContractId,
  canRecordPayment = true,
  layout = 'default',
}) => {
  const isSidebar = layout === 'sidebar';
  const [selectedContractId, setSelectedContractId] = useState<number | null>(() => {
    if (defaultContractId) return defaultContractId;
    return leaseContracts.length > 0 ? leaseContracts[0].id : null;
  });
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const now = new Date();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: now.toISOString().split('T')[0],
    period_month: String(now.getMonth() + 1),
    period_year: String(now.getFullYear()),
    rights_amount: '',
    rental_amount: '',
    or_number: '',
  });
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [rightsPage, setRightsPage] = useState(1);
  const [rentalPage, setRentalPage] = useState(1);

  // Fetch balance and payments when contract changes
  useEffect(() => {
    if (selectedContractId) {
      fetchBalanceAndPayments(selectedContractId);
    }
  }, [selectedContractId]);

  // Load schedule-based preview when billing month/year changes
  useEffect(() => {
    if (!selectedContractId || !showPaymentForm) {
      setPaymentPreview(null);
      return;
    }
    const month = parseInt(formData.period_month, 10);
    const year = parseInt(formData.period_year, 10);
    if (!month || !year) return;

    let cancelled = false;
    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const response = await api.get(
          `/api/rights-and-rentals/lease-contracts/${selectedContractId}/payment-preview`,
          { params: { month, year } }
        );
        if (cancelled) return;
        const preview = response.data as PaymentPreview;
        setPaymentPreview(preview);
        setFormData((prev) => ({
          ...prev,
          rental_amount: String(preview.suggested_rental_amount ?? 0),
          rights_amount:
            preview.monthly_rights_amount > 0 && !prev.rights_amount
              ? String(preview.monthly_rights_amount)
              : prev.rights_amount,
        }));
      } catch (err: any) {
        if (!cancelled) {
          setPaymentPreview(null);
          console.error('Payment preview error:', err);
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    };

    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [selectedContractId, showPaymentForm, formData.period_month, formData.period_year]);

  const fetchBalanceAndPayments = async (contractId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch payments
      const paymentsRes = await api.get(`/api/rights-and-rentals/lease-contracts/${contractId}/payments`);
      setPayments(paymentsRes.data.payments || []);
      setRightsPage(1);
      setRentalPage(1);
      
      // Set balance from response
      if (paymentsRes.data.current_balance) {
        const cb = paymentsRes.data.current_balance;
        setBalance({
          principal_balance: cb.initial || 0,
          rights_balance: cb.rights || 0,
          rental_balance: cb.rental || 0,
          total_balance: cb.total || 0,
          opening_rights_paid: cb.opening_rights_paid,
          opening_rights_balance: cb.opening_rights_balance,
          opening_rental_paid: cb.opening_rental_paid,
          total_rights_paid: cb.total_rights_paid,
          total_rental_paid: cb.total_rental_paid,
          is_legacy_account: cb.is_legacy_account,
        });
      } else {
        setBalance({
          principal_balance: 0,
          rights_balance: 0,
          rental_balance: 0,
          total_balance: 0
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openPaymentForm = () => {
    const today = new Date();
    setFormData({
      payment_date: today.toISOString().split('T')[0],
      period_month: String(today.getMonth() + 1),
      period_year: String(today.getFullYear()),
      rights_amount: '',
      rental_amount: '',
      or_number: '',
    });
    setPaymentPreview(null);
    setShowPaymentForm(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) return;

    if (!formData.payment_date) {
      setError('Payment date is required');
      return;
    }

    const periodMonth = parseInt(formData.period_month, 10);
    const periodYear = parseInt(formData.period_year, 10);
    if (!periodMonth || periodMonth < 1 || periodMonth > 12 || !periodYear) {
      setError('Billing month and year are required');
      return;
    }

    const rightsAmt = parseFloat(formData.rights_amount) || 0;
    const rentalAmt = parseFloat(formData.rental_amount) || 0;

    if (rightsAmt <= 0 && rentalAmt <= 0) {
      setError('Enter at least one payment amount');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.post(`/api/rights-and-rentals/lease-contracts/${selectedContractId}/payments/record`, {
        payment_date: formData.payment_date,
        period_month: periodMonth,
        period_year: periodYear,
        rights_amount: rightsAmt > 0 ? rightsAmt : null,
        rental_amount: rentalAmt > 0 ? rentalAmt : null,
        or_number: formData.or_number || null,
      });

      const today = new Date();
      setFormData({
        payment_date: today.toISOString().split('T')[0],
        period_month: String(today.getMonth() + 1),
        period_year: String(today.getFullYear()),
        rights_amount: '',
        rental_amount: '',
        or_number: '',
      });
      setPaymentPreview(null);
      setShowPaymentForm(false);
      setRightsPage(1);
      setRentalPage(1);
      await fetchBalanceAndPayments(selectedContractId);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    setRightsPage(1);
    setRentalPage(1);
  };

  const selectedContract = leaseContracts.find((c) => c.id === selectedContractId);

  const paymentDetailHref = (payment: PaymentRecord) =>
    `/admin/rights-and-rentals/lease-contracts/${selectedContractId}/payments/${payment.payment_type}/${payment.id}`;

  const formatPeriod = (month?: number | null, year?: number | null) => {
    if (!month || !year) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[month - 1]} ${year}`;
  };

  const sortPayments = (list: PaymentRecord[]) =>
    [...list].sort((a, b) => {
      const diff = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

  const rightsPayments = useMemo(
    () => sortPayments(payments.filter((p) => p.payment_type === 'rights')),
    [payments, sortOrder]
  );

  const rentalPayments = useMemo(
    () => sortPayments(payments.filter((p) => p.payment_type === 'rental')),
    [payments, sortOrder]
  );

  const rightsTotalPages = Math.max(1, Math.ceil(rightsPayments.length / PAGE_SIZE));
  const rentalTotalPages = Math.max(1, Math.ceil(rentalPayments.length / PAGE_SIZE));

  const paginatedRights = rightsPayments.slice(
    (rightsPage - 1) * PAGE_SIZE,
    rightsPage * PAGE_SIZE
  );
  const paginatedRentals = rentalPayments.slice(
    (rentalPage - 1) * PAGE_SIZE,
    rentalPage * PAGE_SIZE
  );

  const formGridClass = isSidebar
    ? 'grid grid-cols-1 gap-4'
    : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  return (
    <div
      className={`bg-white rounded-lg shadow-md ${
        isSidebar ? 'p-4 sm:p-5' : 'mt-8 p-6'
      }`}
    >
      <h2
        className={`font-bold text-gray-800 ${
          isSidebar ? 'text-xl mb-4' : 'text-2xl mb-6'
        }`}
      >
        Payment Management
      </h2>

      {/* Contract Selection */}
      {!hideContractSelector && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Lease Contract
          </label>
          <select
            value={selectedContractId || ''}
            onChange={(e) => setSelectedContractId(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Select a contract --</option>
            {leaseContracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.property_name} (Status: {contract.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {selectedContract && (
        <>
          {/* Contract Summary */}
          <div className={`mb-6 bg-blue-50 rounded-lg border border-blue-200 ${isSidebar ? 'p-3' : 'p-4'}`}>
            <h3 className="font-semibold text-gray-800 mb-3">Contract Details</h3>
            <div className={`grid gap-3 text-sm ${isSidebar ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
              <div>
                <span className="text-gray-600">Property:</span>
                <p className="font-medium">{selectedContract.property_name}</p>
              </div>
              <div>
                <span className="text-gray-600">Monthly Rights Amount:</span>
                <p className="font-medium">
                  ₱ {(selectedContract?.monthly_rights_amount ? parseFloat(String(selectedContract.monthly_rights_amount)) : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Monthly Rental Amount:</span>
                <p className="font-medium">
                  ₱ {(selectedContract?.monthly_rental_amount ? parseFloat(String(selectedContract.monthly_rental_amount)) : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Contract Status:</span>
                <p className={`font-medium ${selectedContract.status === 'active' ? 'text-green-600' : 'text-orange-600'}`}>
                  {selectedContract.status.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading payment history...</div>
          ) : (
            <>
              {/* Record Payment Button */}
              {canRecordPayment && (
                <div className="mb-6">
                  <button
                    onClick={() => {
                      if (showPaymentForm) {
                        setShowPaymentForm(false);
                        setPaymentPreview(null);
                      } else {
                        openPaymentForm();
                      }
                    }}
                    className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition ${
                      isSidebar ? 'w-full sm:w-auto' : ''
                    }`}
                  >
                    {showPaymentForm ? 'Cancel' : 'Record Payment'}
                  </button>
                </div>
              )}

              {/* Payment Form */}
              {canRecordPayment && showPaymentForm && (
                <div className={`mb-6 bg-gray-50 rounded-lg border border-gray-200 ${isSidebar ? 'p-4' : 'p-6'}`}>
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Record New Payment</h3>
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div className={formGridClass}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Date *
                        </label>
                        <input
                          type="date"
                          name="payment_date"
                          value={formData.payment_date}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Official Receipt (OR) Number
                        </label>
                        <input
                          type="text"
                          name="or_number"
                          value={formData.or_number}
                          onChange={handleInputChange}
                          placeholder="e.g., OR-2026-0001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className={formGridClass}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Billing Month *
                        </label>
                        <select
                          name="period_month"
                          value={formData.period_month}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {MONTH_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Billing Year *
                        </label>
                        <input
                          type="number"
                          name="period_year"
                          value={formData.period_year}
                          onChange={handleInputChange}
                          required
                          min="2000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {previewLoading && (
                      <p className="text-xs text-gray-500">Loading schedule amounts...</p>
                    )}

                    {paymentPreview && (
                      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-950 space-y-1.5">
                        {paymentPreview.has_schedule ? (
                          <p>
                            <span className="font-semibold">Schedule:</span>{' '}
                            {paymentPreview.schedule_row?.period_label || 'Matched period'}
                            {paymentPreview.schedule_row?.rent_type
                              ? ` (${paymentPreview.schedule_row.rent_type})`
                              : ''}
                          </p>
                        ) : (
                          <p>
                            <span className="font-semibold">No rental schedule</span> — using contract monthly rental.
                          </p>
                        )}
                        {paymentPreview.has_schedule && paymentPreview.schedule_row && (
                          <p className="text-indigo-800">
                            <span className="font-semibold">Net Monthly Rent due to LESSOR + VAT:</span>{' '}
                            ₱ {(paymentPreview.schedule_row.net_monthly_rent || paymentPreview.this_month_rental).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="block text-xs text-indigo-700 mt-0.5">
                              Basic ₱ {paymentPreview.schedule_row.basic_monthly_rent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {' + VAT ₱ '}
                              {paymentPreview.schedule_row.vat_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {' − WHT ₱ '}
                              {paymentPreview.schedule_row.wht_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </p>
                        )}
                        <p>
                          <span className="font-semibold">This month rental due:</span>{' '}
                          ₱ {paymentPreview.this_month_rental.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {paymentPreview.paid_this_month > 0 && (
                            <span className="text-indigo-700">
                              {' '}
                              · Paid ₱ {paymentPreview.paid_this_month.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              {' · '}
                              Remaining ₱ {paymentPreview.remaining_this_month.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </p>
                        <p>
                          <span className="font-semibold">Outstanding balance (prior periods):</span>{' '}
                          ₱ {paymentPreview.outstanding_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    <div className={formGridClass}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rights Payment Amount (₱)
                        </label>
                        <input
                          type="number"
                          name="rights_amount"
                          value={formData.rights_amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Rental Payment Amount (₱)
                          {paymentPreview?.has_schedule && (
                            <span className="ml-1 text-xs font-normal text-indigo-600">
                              (Net to LESSOR + VAT)
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          name="rental_amount"
                          value={formData.rental_amount}
                          onChange={handleInputChange}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className={`flex gap-3 ${isSidebar ? 'flex-col sm:flex-row' : ''}`}>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {submitting ? 'Recording...' : 'Record Payment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPaymentForm(false);
                          setPaymentPreview(null);
                        }}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Billing month is stored on the payment (can differ from payment date). Multiple payments for the same billing month are allowed.
                    </p>
                  </form>
                </div>
              )}

              {/* Payment History */}
              <div>
                {balance?.is_legacy_account && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <span className="font-semibold">Legacy account:</span>{' '}
                    Opening totals are on the contract. Rights balance to date:{' '}
                    <span className="font-semibold">
                      ₱ {(balance.rights_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {' · '}
                    Total rental collected:{' '}
                    <span className="font-semibold">
                      ₱ {(balance.rental_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className={`flex mb-4 gap-3 ${isSidebar ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : 'items-center justify-between'}`}>
                  <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by date:</span>
                    <button
                      onClick={handleSortToggle}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      {sortOrder === 'desc' ? (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                          </svg>
                          Newest First
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m-4 4l-4-4" />
                          </svg>
                          Oldest First
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {payments.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                    No payments recorded yet
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Rights Payments */}
                    <div>
                      <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500"></span>
                        Rights Payments
                        <span className="text-gray-400 font-normal normal-case tracking-normal">
                          ({rightsPayments.length} record{rightsPayments.length !== 1 ? 's' : ''})
                        </span>
                      </h4>
                      {rightsPayments.length === 0 ? (
                        <div className="text-center py-4 bg-green-50 rounded-lg text-gray-500 text-sm">
                          No rights payments recorded yet
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[520px]">
                              <thead>
                                <tr className="bg-green-50 border border-green-200">
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Period</th>
                                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Amount Paid</th>
                                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Balance</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">OR Number</th>
                                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedRights.map((payment) => (
                                  <tr key={`rights-${payment.id}`} className="border border-gray-200 hover:bg-green-50/50">
                                    <td className="px-3 py-2 text-sm text-gray-700">
                                      {new Date(payment.payment_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">
                                      {formatPeriod(payment.period_month, payment.period_year)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                                      ₱ {parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-700">
                                      ₱ {parseFloat(payment.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">{payment.or_number || '—'}</td>
                                    <td className="px-3 py-2 text-right text-sm">
                                      <Link
                                        href={paymentDetailHref(payment)}
                                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                                      >
                                        View
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {rightsPayments.length > PAGE_SIZE && (
                            <div className="mt-3">
                              <Pagination
                                currentPage={Math.min(rightsPage, rightsTotalPages)}
                                totalPages={rightsTotalPages}
                                onPageChange={setRightsPage}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Rental Payments */}
                    <div>
                      <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        Rental Payments
                        <span className="text-gray-400 font-normal normal-case tracking-normal">
                          ({rentalPayments.length} record{rentalPayments.length !== 1 ? 's' : ''})
                        </span>
                      </h4>
                      {rentalPayments.length === 0 ? (
                        <div className="text-center py-4 bg-blue-50 rounded-lg text-gray-500 text-sm">
                          No rental payments recorded yet
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse min-w-[520px]">
                              <thead>
                                <tr className="bg-blue-50 border border-blue-200">
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">Period</th>
                                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Amount Paid</th>
                                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Total Collected</th>
                                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">OR Number</th>
                                  <th className="px-3 py-2 text-right text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedRentals.map((payment) => (
                                  <tr key={`rental-${payment.id}`} className="border border-gray-200 hover:bg-blue-50/50">
                                    <td className="px-3 py-2 text-sm text-gray-700">
                                      {new Date(payment.payment_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">
                                      {formatPeriod(payment.period_month, payment.period_year)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm font-medium text-gray-700">
                                      ₱ {parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-700">
                                      ₱ {parseFloat(payment.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-gray-600">{payment.or_number || '—'}</td>
                                    <td className="px-3 py-2 text-right text-sm">
                                      <Link
                                        href={paymentDetailHref(payment)}
                                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                                      >
                                        View
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {rentalPayments.length > PAGE_SIZE && (
                            <div className="mt-3">
                              <Pagination
                                currentPage={Math.min(rentalPage, rentalTotalPages)}
                                totalPages={rentalTotalPages}
                                onPageChange={setRentalPage}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LesseePaymentDetails;
