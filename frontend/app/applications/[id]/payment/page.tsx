'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch application');
      const data = await response.json();
      setApplicationInfo(data);

      // Check if application is approved
      if (data.status !== 'Approved') {
        setError('Payment can only be recorded for approved applications');
      } else {
        // Fetch assessment data to get the total amount due
        try {
          const assessmentResponse = await fetch(`http://localhost:5000/api/applications/${applicationId}/assessment-record`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (assessmentResponse.ok) {
            const assessmentData = await assessmentResponse.json();
            const totalAmountDue = assessmentData.total_amount_due || 0;
            
            // Set the amount field to the total amount due
            setFormData(prev => ({
              ...prev,
              amount: totalAmountDue.toString()
            }));
          }
        } catch (assessmentErr) {
          console.error('Error fetching assessment data:', assessmentErr);
        }
      }
    } catch (err) {
      console.error('Error fetching application:', err);
      setError('Failed to load application information');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}/payment`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
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

      const response = await fetch(`http://localhost:5000/api/applications/${applicationId}/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to record payment');
        setSubmitting(false);
        return;
      }

      setMessage('Payment recorded successfully!');
      setFormData({
        official_receipt_no: '',
        payment_date: new Date().toISOString().split('T')[0],
        address: '',
        amount: ''
      });

      // Refresh payments list
      setTimeout(() => {
        fetchPayments();
      }, 500);
    } catch (err) {
      console.error('Error recording payment:', err);
      setError('Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
          <p className="text-gray-600 mt-2">Application #{applicationId}</p>
        </div>

        {/* Application Info Card */}
        {applicationInfo && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Business Name</label>
                <p className="text-gray-900">{applicationInfo.entity_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className={`font-semibold ${applicationInfo.status === 'Approved' ? 'text-green-600' : 'text-orange-600'}`}>
                  {applicationInfo.status}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Permit Type</label>
                <p className="text-gray-900">{applicationInfo.permit_type || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">{new Date(applicationInfo.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Success Message */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {message}
          </div>
        )}

        {/* Payment Form */}
        {applicationInfo?.status === 'Approved' && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Details</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="official_receipt_no" className="block text-sm font-medium text-gray-700 mb-1">
                    Official Receipt No. *
                  </label>
                  <input
                    type="text"
                    id="official_receipt_no"
                    name="official_receipt_no"
                    value={formData.official_receipt_no}
                    onChange={handleInputChange}
                    placeholder="Enter receipt number"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      id="payment_date"
                      name="payment_date"
                      value={formData.payment_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₱) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-2 text-gray-600 font-semibold">₱</span>
                      <input
                        type="text"
                        id="amount"
                        name="amount"
                        value={formatCurrency(formData.amount)}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent text-right"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter payment address (optional)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Receipt No.</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Date</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Amount</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Address</th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{payment.official_receipt_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">₱ {(typeof payment.amount === 'string' ? parseFloat(payment.amount) : payment.amount).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.address || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{payment.recorded_by_name || 'System'}</td>
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
