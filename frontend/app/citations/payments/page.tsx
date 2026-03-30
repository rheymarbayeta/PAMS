'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';

interface Citation {
  citation_id: string;
  ticket_number: string;
  driver_name: string;
  plate_number: string;
  fine_amount: number;
  payment_status: string;
  violation_date: string;
}

interface PaymentRecord {
  payment_id: string;
  citation_id: string;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  receipt_number: string;
  notes: string;
  ticket_number?: string;
  driver_name?: string;
  fine_amount?: number;
}

interface CitationWithPaymentDetails extends Citation {
  total_paid: number;
  balance_due: number;
}

export default function PaymentPortalPage() {
  const { user, hasRole } = useAuth();
  const [citations, setCitations] = useState<CitationWithPaymentDetails[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'history'>('pending');
  const [selectedCitation, setSelectedCitation] = useState<CitationWithPaymentDetails | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_method: 'Cash',
    receipt_number: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchCitations();
  }, []);

  const fetchCitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/citations?limit=1000');
      const allCitations = response.data.data;

      // Fetch payment info for each citation
      const citationsWithPayments = await Promise.all(
        allCitations.map(async (citation: Citation) => {
          try {
            const paymentRes = await api.get(`/api/citations/${citation.citation_id}`);
            const citationPayments = paymentRes.data.payments || [];
            const total_paid = citationPayments.reduce(
              (sum: number, p: PaymentRecord) => sum + Number(p.amount_paid || 0),
              0
            );
            const balance_due = citation.fine_amount - total_paid;
            return { ...citation, total_paid, balance_due };
          } catch {
            return { ...citation, total_paid: 0, balance_due: citation.fine_amount };
          }
        })
      );

      setCitations(citationsWithPayments);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch citations');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!selectedCitation) return;

    if (!paymentForm.amount_paid || parseFloat(paymentForm.amount_paid) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    if (parseFloat(paymentForm.amount_paid) > selectedCitation.balance_due) {
      setError(`Payment cannot exceed balance due (₱${formatCurrency(selectedCitation.balance_due)})`);
      return;
    }

    try {
      setPaymentSaving(true);
      await api.post(`/api/citations/${selectedCitation.citation_id}/payment`, {
        amountPaid: parseFloat(paymentForm.amount_paid),
        paymentMethod: paymentForm.payment_method,
        receiptNumber: paymentForm.receipt_number,
        notes: paymentForm.notes,
        paymentDate: paymentForm.payment_date,
      });

      setPaymentForm({
        amount_paid: '',
        payment_method: 'Cash',
        receipt_number: '',
        notes: '',
        payment_date: new Date().toISOString().split('T')[0],
      });

      setShowPaymentForm(false);
      setSelectedCitation(null);
      setSuccessMsg('Payment recorded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Refresh citations
      await fetchCitations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  const filteredCitations = citations.filter((c) => {
    let matchesStatus = true;
    if (activeTab === 'pending') {
      matchesStatus = c.payment_status !== 'Paid';
    } else if (activeTab === 'all') {
      matchesStatus = true;
    }

    const matchesSearch = 
      c.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.driver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.plate_number.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-green-600 flex items-center justify-center">
                <svg
                  className="h-4 w-4 sm:h-5 sm:w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                  Citation Payments Portal
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Record and manage citation payments
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                activeTab === 'pending'
                  ? 'text-slate-800 border-b-2 border-slate-800'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Pending Payments
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                activeTab === 'all'
                  ? 'text-slate-800 border-b-2 border-slate-800'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              All Citations
            </button>
          </div>

          {/* Messages */}
          {successMsg && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm flex items-center gap-2">
              <span className="text-green-600 text-lg">✓</span> {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-center gap-2">
              <span className="text-red-600 text-lg">✕</span> {error}
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search by ticket number, driver name, or plate number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-64">
              <div className="text-center">
                <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin mx-auto mb-3" />
                <p className="text-slate-600 text-sm">Loading citations...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Citations List */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Ticket #</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Driver</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700">Plate</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700">Fine Amount</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                          <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredCitations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                              No citations found
                            </td>
                          </tr>
                        ) : (
                          filteredCitations.map((citation) => (
                            <tr
                              key={citation.citation_id}
                              className="hover:bg-slate-50 cursor-pointer"
                              onClick={() => {
                                setSelectedCitation(citation);
                                setShowPaymentForm(true);
                              }}
                            >
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {citation.ticket_number}
                              </td>
                              <td className="px-4 py-3 text-slate-600">{citation.driver_name}</td>
                              <td className="px-4 py-3 text-slate-600">{citation.plate_number}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">
                                ₱{formatCurrency(Number(citation.fine_amount))}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                                    citation.payment_status === 'Paid'
                                      ? 'bg-green-100 text-green-800'
                                      : citation.payment_status === 'Installment'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {citation.payment_status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {citation.payment_status !== 'Paid' && (
                                  <button
                                    className="px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCitation(citation);
                                      setShowPaymentForm(true);
                                      setError('');
                                    }}
                                  >
                                    Add Payment
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Payment Form Sidebar */}
              <div className="lg:col-span-1">
                {selectedCitation ? (
                  <div className="bg-white rounded-lg border border-slate-200 p-5 sticky top-4">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Payment Details</h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-slate-500">Ticket Number</p>
                          <p className="font-semibold text-slate-800">{selectedCitation.ticket_number}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Driver Name</p>
                          <p className="font-semibold text-slate-800">{selectedCitation.driver_name}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Plate Number</p>
                          <p className="font-semibold text-slate-800">{selectedCitation.plate_number}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-200">
                          <p className="text-slate-500">Fine Amount</p>
                          <p className="font-bold text-lg text-slate-900">
                            ₱{formatCurrency(Number(selectedCitation.fine_amount))}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-500">Total Paid</p>
                          <p className="font-semibold text-green-700">
                            ₱{formatCurrency(Number(selectedCitation.total_paid))}
                          </p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                          <p className="text-slate-500">Balance Due</p>
                          <p className="font-bold text-lg text-yellow-700">
                            ₱{formatCurrency(Number(selectedCitation.balance_due))}
                          </p>
                        </div>
                      </div>
                    </div>

                    {showPaymentForm && (
                      <div className="bg-green-50 border border-green-200 rounded p-4">
                        <h4 className="font-semibold text-slate-800 mb-3">Record Payment</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Amount Paid (₱) *
                            </label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              max={selectedCitation.balance_due}
                              value={paymentForm.amount_paid}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, amount_paid: e.target.value }))
                              }
                              placeholder={`Max ₱${formatCurrency(selectedCitation.balance_due)}`}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Payment Date
                            </label>
                            <input
                              type="date"
                              value={paymentForm.payment_date}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))
                              }
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              OR Number (Receipt #) *
                            </label>
                            <input
                              type="text"
                              value={paymentForm.receipt_number}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, receipt_number: e.target.value }))
                              }
                              placeholder="e.g., OR-2026-001234"
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Payment Method
                            </label>
                            <select
                              value={paymentForm.payment_method}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))
                              }
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                            >
                              <option value="Cash">Cash</option>
                              <option value="Check">Check</option>
                              <option value="Credit Card">Credit Card</option>
                              <option value="Online Transfer">Online Transfer</option>
                              <option value="GCash">GCash</option>
                              <option value="Maya">Maya</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Notes
                            </label>
                            <textarea
                              value={paymentForm.notes}
                              onChange={(e) =>
                                setPaymentForm((p) => ({ ...p, notes: e.target.value }))
                              }
                              placeholder="Optional notes..."
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-green-400"
                            />
                          </div>

                          <button
                            onClick={handleRecordPayment}
                            disabled={paymentSaving}
                            className="w-full px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {paymentSaving ? 'Recording...' : 'Record Payment'}
                          </button>

                          <button
                            onClick={() => {
                              setShowPaymentForm(false);
                              setSelectedCitation(null);
                              setPaymentForm({
                                amount_paid: '',
                                payment_method: 'Cash',
                                receipt_number: '',
                                notes: '',
                                payment_date: new Date().toISOString().split('T')[0],
                              });
                            }}
                            className="w-full px-4 py-2 text-sm font-semibold bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {!showPaymentForm && (
                      <button
                        onClick={() => {
                          setShowPaymentForm(true);
                          setError('');
                        }}
                        disabled={selectedCitation.payment_status === 'Paid'}
                        className="w-full px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Add Payment
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-slate-200 p-5 text-center text-slate-500">
                    <p>Select a citation to record payment</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
