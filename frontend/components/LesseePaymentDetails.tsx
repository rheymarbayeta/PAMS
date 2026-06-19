'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/api';

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
}

const LesseePaymentDetails: React.FC<LesseePaymentDetailsProps> = ({
  lesseeId,
  lesseeName,
  leaseContracts,
  hideContractSelector = false,
  defaultContractId,
  canRecordPayment = true,
}) => {
  const [selectedContractId, setSelectedContractId] = useState<number | null>(() => {
    if (defaultContractId) return defaultContractId;
    return leaseContracts.length > 0 ? leaseContracts[0].id : null;
  });
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    rights_amount: '',
    rental_amount: '',
    or_number: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Fetch balance and payments when contract changes
  useEffect(() => {
    if (selectedContractId) {
      fetchBalanceAndPayments(selectedContractId);
    }
  }, [selectedContractId]);

  const fetchBalanceAndPayments = async (contractId: number) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch payments
      const paymentsRes = await api.get(`/api/rights-and-rentals/lease-contracts/${contractId}/payments`);
      setPayments(paymentsRes.data.payments || []);
      
      // Set balance from response
      if (paymentsRes.data.current_balance) {
        setBalance({
          principal_balance: paymentsRes.data.current_balance.initial || 0,
          rights_balance: paymentsRes.data.current_balance.rights || 0,
          rental_balance: paymentsRes.data.current_balance.rental || 0,
          total_balance: paymentsRes.data.current_balance.total || 0
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId) return;

    if (!formData.payment_date) {
      setError('Payment date is required');
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
        rights_amount: rightsAmt > 0 ? rightsAmt : null,
        rental_amount: rentalAmt > 0 ? rentalAmt : null,
        or_number: formData.or_number || null,
      });

      // Reset form and refresh data
      setFormData({
        payment_date: new Date().toISOString().split('T')[0],
        rights_amount: '',
        rental_amount: '',
        or_number: '',
      });
      setShowPaymentForm(false);
      await fetchBalanceAndPayments(selectedContractId);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedContract = leaseContracts.find((c) => c.id === selectedContractId);

  const paymentDetailHref = (payment: PaymentRecord) =>
    `/admin/rights-and-rentals/lease-contracts/${selectedContractId}/payments/${payment.payment_type}/${payment.id}`;

  const formatPeriod = (month?: number | null, year?: number | null) => {
    if (!month || !year) return '—';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[month - 1]} ${year}`;
  };

  return (
    <div className="mt-8 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Payment Management</h2>

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
          <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-3">Contract Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    {showPaymentForm ? 'Cancel' : 'Record Payment'}
                  </button>
                </div>
              )}

              {/* Payment Form */}
              {canRecordPayment && showPaymentForm && (
                <div className="mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Record New Payment</h3>
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                      >
                        {submitting ? 'Recording...' : 'Record Payment'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      You can record multiple payments for the same billing month (e.g. partial payments).
                    </p>
                  </form>
                </div>
              )}

              {/* Payment History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by date:</span>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
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
                    {(() => {
                      const rightsPayments = payments
                        .filter(p => p.payment_type === 'rights')
                        .sort((a, b) => {
                          const diff = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
                          return sortOrder === 'desc' ? -diff : diff;
                        });
                      return (
                        <div>
                          <h4 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500"></span>
                            Rights Payments
                            <span className="text-gray-400 font-normal normal-case tracking-normal">({rightsPayments.length} record{rightsPayments.length !== 1 ? 's' : ''})</span>
                          </h4>
                          {rightsPayments.length === 0 ? (
                            <div className="text-center py-4 bg-green-50 rounded-lg text-gray-500 text-sm">
                              No rights payments recorded yet
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-green-50 border border-green-200">
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Period</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Amount Paid</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Balance</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">OR Number</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rightsPayments.map((payment) => (
                                    <tr key={`rights-${payment.id}`} className="border border-gray-200 hover:bg-green-50/50">
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {new Date(payment.payment_date).toLocaleDateString()}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-600">
                                        {formatPeriod(payment.period_month, payment.period_year)}
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                                        ₱ {parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-gray-700">
                                        ₱ {parseFloat(payment.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-600">{payment.or_number || '—'}</td>
                                      <td className="px-4 py-2 text-right text-sm">
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
                          )}
                        </div>
                      );
                    })()}

                    {/* Rental Payments */}
                    {(() => {
                      const rentalPayments = payments
                        .filter(p => p.payment_type === 'rental')
                        .sort((a, b) => {
                          const diff = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
                          return sortOrder === 'desc' ? -diff : diff;
                        });
                      return (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                            Rental Payments
                            <span className="text-gray-400 font-normal normal-case tracking-normal">({rentalPayments.length} record{rentalPayments.length !== 1 ? 's' : ''})</span>
                          </h4>
                          {rentalPayments.length === 0 ? (
                            <div className="text-center py-4 bg-blue-50 rounded-lg text-gray-500 text-sm">
                              No rental payments recorded yet
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-blue-50 border border-blue-200">
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Period</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Amount Paid</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Total Collected</th>
                                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">OR Number</th>
                                    <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rentalPayments.map((payment) => (
                                    <tr key={`rental-${payment.id}`} className="border border-gray-200 hover:bg-blue-50/50">
                                      <td className="px-4 py-2 text-sm text-gray-700">
                                        {new Date(payment.payment_date).toLocaleDateString()}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-600">
                                        {formatPeriod(payment.period_month, payment.period_year)}
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm font-medium text-gray-700">
                                        ₱ {parseFloat(payment.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-gray-700">
                                        ₱ {parseFloat(payment.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-600">{payment.or_number || '—'}</td>
                                      <td className="px-4 py-2 text-right text-sm">
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
                          )}
                        </div>
                      );
                    })()}
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
