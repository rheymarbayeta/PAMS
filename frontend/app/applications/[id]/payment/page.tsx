'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

interface ApplicationInfo {
  application_id: number;
  entity_name: string;
  status: string;
  permit_type: string;
  created_at: string;
  [key: string]: any;
}

interface Payment {
  payment_id: number;
  official_receipt_no: string;
  payment_date: string;
  amount: number;
  address?: string;
  recorded_by_name?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id;
  const { token, user } = useAuth();

  const [formData, setFormData] = useState({
    official_receipt_no: '',
    payment_date: new Date().toISOString().split('T')[0],
    address: '',
    amount: ''
  });

  const [applicationInfo, setApplicationInfo] = useState<ApplicationInfo | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    fetchApplicationInfo();
    fetchPayments();
  }, [applicationId, token]);

  const fetchApplicationInfo = async () => {
    try {
      const response = await api.get(`/api/applications/${applicationId}`);
      const data = response.data;
      setApplicationInfo(data);

      // Check if application is approved
      if (data.status !== 'Approved') {
        setError('Payment can only be recorded for approved applications');
      } else {
        // Fetch assessment data to get the total amount due
        try {
          const assessmentResponse = await api.get(`/api/applications/${applicationId}/assessment-record`);
          const assessmentData = assessmentResponse.data;
          const totalAmountDue = assessmentData.total_amount_due || 0;
          
          // Set the amount field to the total amount due
          setFormData(prev => ({
            ...prev,
            amount: totalAmountDue.toString()
          }));
        } catch (assessmentErr: any) {
          console.error('Error fetching assessment data:', assessmentErr);
          // Don't fail if assessment data fetch fails - user can enter amount manually
        }
      }
    } catch (err: any) {
      console.error('Error fetching application:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load application information';
      setError(`Request failed with status code ${err.response?.status || 'unknown'}: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await api.get(`/api/applications/${applicationId}/payment`);
      const data = response.data;
      setPayments(data);
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For amount field, format the number
    if (name === 'amount') {
      // Remove any non-digit characters except decimal point
      const numericValue = value.replace(/[^\d.]/g, '');
      // Ensure only one decimal point
      const parts = numericValue.split('.');
      let formattedValue = parts[0];
      if (parts.length > 1) {
        formattedValue += '.' + parts[1].substring(0, 2);
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      // Validate fields
      if (!formData.official_receipt_no || !formData.payment_date || !formData.amount) {
        setError('Please fill in all required fields');
        setSubmitting(false);
        return;
      }

      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        setError('Amount must be a valid positive number');
        setSubmitting(false);
        return;
      }

      const response = await api.post(`/api/applications/${applicationId}/payment`, formData);

      setMessage('Payment recorded successfully! Redirecting...');
      
      // Redirect to application details after a short delay
      setTimeout(() => {
        router.push(`/applications/${applicationId}`);
      }, 1000);
    } catch (err) {
      console.error('Error recording payment:', err);
      if (err instanceof Error) {
        const errorMessage = err.message;
        setError(errorMessage || 'Failed to record payment. Please try again.');
      } else {
        setError('Failed to record payment. Please try again.');
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center gap-2 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent flex items-center gap-3">
            <span className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            Record Payment
          </h1>
          <p className="text-gray-600 mt-2 ml-13">Application #{applicationId}</p>
        </div>

        {/* Application Info Card */}
        {applicationInfo && (
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Application Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50/50 rounded-xl p-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</label>
                <p className="text-gray-900 font-medium mt-1">{applicationInfo.entity_name || 'N/A'}</p>
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                <p className={`font-semibold mt-1 ${applicationInfo.status === 'Approved' ? 'text-green-600' : 'text-amber-600'}`}>
                  {applicationInfo.status}
                </p>
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Permit Type</label>
                <p className="text-gray-900 font-medium mt-1">{applicationInfo.permit_type || 'N/A'}</p>
              </div>
              <div className="bg-gray-50/50 rounded-xl p-4">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</label>
                <p className="text-gray-900 font-medium mt-1">{new Date(applicationInfo.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-5 py-4 rounded-xl mb-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {message}
          </div>
        )}

        {/* Payment Form */}
        {applicationInfo?.status === 'Approved' && (
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Payment Details
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                <div>
                  <label htmlFor="official_receipt_no" className="block text-sm font-medium text-gray-700 mb-2">
                    Official Receipt No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="official_receipt_no"
                    name="official_receipt_no"
                    value={formData.official_receipt_no}
                    onChange={handleInputChange}
                    placeholder="Enter receipt number"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="payment_date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₱) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-gray-500 font-semibold">₱</span>
                      <input
                        type="text"
                        id="amount"
                        name="amount"
                        value={formatCurrency(formData.amount)}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-right font-semibold"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter payment address (optional)"
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Payment History
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Receipt No.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{payment.official_receipt_no}</td>
                      <td className="px-4 py-4 text-sm text-gray-700">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-4 text-sm font-bold text-green-600">₱ {(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{payment.address || 'N/A'}</td>
                      <td className="px-4 py-4 text-sm text-gray-600">{payment.recorded_by_name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
