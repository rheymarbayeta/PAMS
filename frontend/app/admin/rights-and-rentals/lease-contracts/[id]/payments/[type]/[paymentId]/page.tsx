'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/utils/modal';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface PaymentDetail {
  id: number;
  lease_contract_id: number;
  payment_type: 'rights' | 'rental';
  payment_date: string;
  amount_paid: number | string;
  balance: number | string;
  or_number: string | null;
  period_month: number | null;
  period_year: number | null;
  collectible: number | string | null;
  delinquent: number | string | null;
  lessee_id: number;
  lessee_name: string;
  lessee_contact: string | null;
  lessee_email: string | null;
  property_id: number;
  property_name: string;
  property_code: string;
  contract_status: string;
  contract_effective_date: string;
  monthly_rights_amount: number | string;
  monthly_rental_amount: number | string;
}

export default function PaymentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const contractId = params.id as string;
  const paymentType = params.type as string;
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    payment_date: '',
    or_number: '',
    amount_paid: '',
    period_month: '',
    period_year: '',
  });

  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(
    (role) => role && ['SuperAdmin', 'Admin', 'Rights and Rentals Manager'].includes(role)
  );

  const isRights = paymentType === 'rights';
  const typeLabel = isRights ? 'Rights' : 'Rental';

  useEffect(() => {
    if (paymentType !== 'rights' && paymentType !== 'rental') {
      setError('Invalid payment type');
      setLoading(false);
      return;
    }
    fetchPayment();
  }, [paymentType, paymentId]);

  const fetchPayment = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(
        `/api/rights-and-rentals/payments/${paymentType}/${paymentId}`
      );
      const data = response.data as PaymentDetail;
      setPayment(data);
      setForm({
        payment_date: data.payment_date ? data.payment_date.split('T')[0] : '',
        or_number: data.or_number || '',
        amount_paid: String(data.amount_paid ?? ''),
        period_month: data.period_month ? String(data.period_month) : '',
        period_year: data.period_year ? String(data.period_year) : '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error loading payment record');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const formatCurrency = (value: number | string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(
      parseFloat(String(value)) || 0
    );

  const formatPeriod = (month: number | null, year: number | null) => {
    if (!month || !year) return '—';
    return `${MONTHS[month - 1]} ${year}`;
  };

  const handleSave = async () => {
    if (!payment) return;

    const amount = parseFloat(form.amount_paid);
    if (Number.isNaN(amount) || amount < 0) {
      showAlert('Please enter a valid non-negative amount', 'Validation Error');
      return;
    }
    if (!form.payment_date) {
      showAlert('Payment date is required', 'Validation Error');
      return;
    }

    setSaving(true);
    try {
      const response = await api.patch(
        `/api/rights-and-rentals/payments/${paymentType}/${paymentId}`,
        {
          payment_date: form.payment_date,
          or_number: form.or_number.trim() || null,
          amount_paid: amount,
          period_month: form.period_month ? parseInt(form.period_month, 10) : undefined,
          period_year: form.period_year ? parseInt(form.period_year, 10) : undefined,
        }
      );
      setPayment(response.data);
      setForm({
        payment_date: response.data.payment_date
          ? response.data.payment_date.split('T')[0]
          : form.payment_date,
        or_number: response.data.or_number || '',
        amount_paid: String(response.data.amount_paid ?? ''),
        period_month: response.data.period_month ? String(response.data.period_month) : '',
        period_year: response.data.period_year ? String(response.data.period_year) : '',
      });
      setEditing(false);
      showAlert('Payment record updated successfully', 'Success');
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Error updating payment record', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    if (!payment) return;
    setForm({
      payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
      or_number: payment.or_number || '',
      amount_paid: String(payment.amount_paid ?? ''),
      period_month: payment.period_month ? String(payment.period_month) : '',
      period_year: payment.period_year ? String(payment.period_year) : '',
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Assessor', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100" />
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading payment record...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !payment) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Assessor', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-700">{error || 'Payment record not found'}</p>
              <Link
                href={`/admin/rights-and-rentals/lease-contracts/${contractId}`}
                className="mt-4 inline-block text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Back to Lease Contract
              </Link>
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
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/admin/rights-and-rentals" className="hover:text-indigo-600">
              Rights &amp; Rentals
            </Link>
            <span className="mx-2">/</span>
            <Link href="/admin/rights-and-rentals/lease-contracts" className="hover:text-indigo-600">
              Lease Contracts
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/admin/rights-and-rentals/lease-contracts/${contractId}`}
              className="hover:text-indigo-600"
            >
              Contract #{contractId}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{typeLabel} Payment</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isRights ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {typeLabel} Payment
                </span>
                <span className="text-sm text-gray-500">Record #{payment.id}</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {formatCurrency(payment.amount_paid)}
              </h1>
              <p className="text-gray-600 mt-1">
                {formatDate(payment.payment_date)}
                {payment.or_number ? ` · OR ${payment.or_number}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              {canEdit && !editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              <button
                onClick={() => router.push(`/admin/rights-and-rentals/lease-contracts/${contractId}`)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Back
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border-l-4 mb-6" style={{ borderLeftColor: isRights ? '#22c55e' : '#3b82f6' }}>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editing ? 'Edit Payment Details' : 'Payment Details'}
              </h2>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        value={form.payment_date}
                        onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OR Number
                      </label>
                      <input
                        type="text"
                        value={form.or_number}
                        onChange={(e) => setForm({ ...form, or_number: e.target.value })}
                        placeholder="e.g., C03510764"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Paid (₱) *
                      </label>
                      <input
                        type="number"
                        value={form.amount_paid}
                        onChange={(e) => setForm({ ...form, amount_paid: e.target.value })}
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Billing Period Month
                      </label>
                      <select
                        value={form.period_month}
                        onChange={(e) => setForm({ ...form, period_month: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">From payment date</option>
                        {MONTHS.map((m, i) => (
                          <option key={m} value={i + 1}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Billing Period Year
                      </label>
                      <input
                        type="number"
                        value={form.period_year}
                        onChange={(e) => setForm({ ...form, period_year: e.target.value })}
                        placeholder="From payment date"
                        min="2000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Leave period month/year blank to derive from the payment date. Balances are recalculated after saving.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <dt className="text-sm text-gray-500">Payment Date</dt>
                    <dd className="text-base font-medium text-gray-900">{formatDate(payment.payment_date)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">OR Number</dt>
                    <dd className="text-base font-medium text-gray-900">{payment.or_number || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Amount Paid</dt>
                    <dd className="text-base font-medium text-gray-900">{formatCurrency(payment.amount_paid)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Billing Period</dt>
                    <dd className="text-base font-medium text-gray-900">
                      {formatPeriod(payment.period_month, payment.period_year)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">
                      {isRights ? 'Remaining Rights Balance' : 'Total Collected (after this payment)'}
                    </dt>
                    <dd className="text-base font-medium text-gray-900">{formatCurrency(payment.balance)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Payment Type</dt>
                    <dd className="text-base font-medium text-gray-900">{typeLabel}</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Contract</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm text-gray-500">Lessee</dt>
                <dd className="text-base font-medium text-gray-900">
                  <Link
                    href={`/admin/rights-and-rentals/lessee/${payment.lessee_id}`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {payment.lessee_name}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Property</dt>
                <dd className="text-base font-medium text-gray-900">{payment.property_name}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Contract</dt>
                <dd className="text-base font-medium text-gray-900">
                  <Link
                    href={`/admin/rights-and-rentals/lease-contracts/${payment.lease_contract_id}`}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Contract #{payment.lease_contract_id}
                  </Link>
                  <span className="ml-2 text-sm text-gray-500 capitalize">({payment.contract_status})</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Monthly {typeLabel}</dt>
                <dd className="text-base font-medium text-gray-900">
                  {formatCurrency(isRights ? payment.monthly_rights_amount : payment.monthly_rental_amount)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
