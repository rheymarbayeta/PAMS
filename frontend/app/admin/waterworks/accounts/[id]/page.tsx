'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import waterworksService from '@/services/waterworksService';
import { showAlert } from '@/utils/modal';
import { formatPeso } from '@/utils/formatters';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [showReading, setShowReading] = useState(false);
  const [savingReading, setSavingReading] = useState(false);
  const now = new Date();
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    bill_id: '',
    or_number: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [readingForm, setReadingForm] = useState({
    current_reading: '',
    reading_date: now.toISOString().split('T')[0],
    period_month: String(now.getMonth() + 1),
    period_year: String(now.getFullYear()),
    notes: '',
  });

  const load = async () => {
    try {
      setLoading(true);
      const data = await waterworksService.getAccountSummary(accountId);
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) load();
  }, [accountId]);

  const openPrint = (month: number, year: number) => {
    const token = localStorage.getItem('token');
    window.open(
      `/waterworks-billing-statement.html?account_id=${accountId}&month=${month}&year=${year}&token=${token}`,
      '_blank'
    );
  };

  const submitPayment = async () => {
    const amount = parseFloat(paymentForm.amount_paid);
    if (!amount || amount <= 0) {
      showAlert('Enter a valid amount', 'Validation');
      return;
    }
    try {
      await waterworksService.recordPayment(accountId, {
        ...paymentForm,
        amount_paid: amount,
        bill_id: paymentForm.bill_id || undefined,
      });
      setShowPayment(false);
      setPaymentForm({ amount_paid: '', bill_id: '', or_number: '', payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0], notes: '' });
      load();
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to record payment', 'Error');
    }
  };

  const openAddReading = () => {
    const d = new Date();
    setReadingForm({
      current_reading: '',
      reading_date: d.toISOString().split('T')[0],
      period_month: String(d.getMonth() + 1),
      period_year: String(d.getFullYear()),
      notes: '',
    });
    setShowReading(true);
  };

  const submitReading = async () => {
    const acct = summary?.account;
    const current = parseFloat(readingForm.current_reading);
    if (Number.isNaN(current) || current < 0) {
      showAlert('Enter a valid current reading', 'Validation');
      return;
    }
    const previous = parseFloat(acct?.last_reading ?? acct?.previous_reading) || 0;
    if (current < previous) {
      showAlert(`Current reading cannot be less than previous reading (${previous})`, 'Validation');
      return;
    }
    try {
      setSavingReading(true);
      await waterworksService.createReading({
        account_id: accountId,
        current_reading: current,
        reading_date: readingForm.reading_date,
        period_month: parseInt(readingForm.period_month, 10),
        period_year: parseInt(readingForm.period_year, 10),
        notes: readingForm.notes || undefined,
      });
      setShowReading(false);
      showAlert('Reading recorded successfully', 'Success');
      load();
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to record reading', 'Error');
    } finally {
      setSavingReading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={WW_ROLES}>
        <Layout><div className="p-8 text-center">Loading...</div></Layout>
      </ProtectedRoute>
    );
  }

  if (!summary) {
    return (
      <ProtectedRoute allowedRoles={WW_ROLES}>
        <Layout><div className="p-8 text-center text-red-600">Account not found</div></Layout>
      </ProtectedRoute>
    );
  }

  const { account, outstanding_balance, readings, bills, payments } = summary;

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <div className="mb-6">
            <Link href="/admin/waterworks/accounts" className="text-blue-600 text-sm hover:underline">← Back to Accounts</Link>
            <h1 className="text-2xl font-bold mt-2">{account.consumer_name}</h1>
            <p className="text-gray-600">Account #{account.account_number} · {account.supply_name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-sm text-gray-500">Outstanding Balance</p>
              <p className="text-2xl font-bold text-red-600">{formatPeso(outstanding_balance)}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <p className="text-sm text-gray-500">Last Reading</p>
              <p className="text-2xl font-bold">{account.last_reading ?? account.previous_reading ?? 0} m³</p>
              <p className="text-xs text-gray-400">{account.last_reading_date || 'No reading yet'}</p>
            </div>
            <div className="bg-white rounded-xl border p-4 shadow-sm flex flex-col justify-center gap-2">
              <button
                type="button"
                onClick={openAddReading}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
              >
                Add Reading
              </button>
              <button
                type="button"
                onClick={() => setShowPayment(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Record Payment
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-0 gap-6 space-y-6">
            <section className="bg-white rounded-xl border overflow-hidden">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Account Details</h2>
              <dl className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-500">Consumer</dt><dd>{account.consumer_name}</dd></div>
                {account.entity_id && (
                  <div><dt className="text-gray-500">Entity</dt><dd>
                    <Link href={`/admin/entities/${account.entity_id}`} className="text-blue-600 hover:underline">
                      {account.linked_entity_name || account.consumer_name}
                    </Link>
                  </dd></div>
                )}
                <div><dt className="text-gray-500">Unpaid Dues</dt><dd>{formatPeso(account.unpaid_dues ?? 0)}</dd></div>
                {account.unpaid_dues_notes && (
                  <div className="col-span-2"><dt className="text-gray-500">Unpaid Dues Notes</dt><dd>{account.unpaid_dues_notes}</dd></div>
                )}
                <div><dt className="text-gray-500">Meter</dt><dd>{account.meter_number || '—'}</dd></div>
                <div><dt className="text-gray-500">Address</dt><dd>{account.address || '—'}</dd></div>
                <div><dt className="text-gray-500">Contact</dt><dd>{account.contact_number || '—'}</dd></div>
                <div><dt className="text-gray-500">Status</dt><dd className="capitalize">{account.status}</dd></div>
              </dl>
            </section>

            <section className="bg-white rounded-xl border overflow-hidden">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Bills</h2>
              <table className="min-w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left">Period</th>
                  <th className="px-4 py-2 text-right">Consumption</th>
                  <th className="px-4 py-2 text-right">Total Due</th>
                  <th className="px-4 py-2 text-center">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr></thead>
                <tbody>
                  {(bills || []).map((b: any) => (
                    <tr key={b.bill_id} className="border-b">
                      <td className="px-4 py-2">{b.billing_month}/{b.billing_year}</td>
                      <td className="px-4 py-2 text-right">{b.consumption} m³</td>
                      <td className="px-4 py-2 text-right">{formatPeso(b.total_due)}</td>
                      <td className="px-4 py-2 text-center capitalize">{b.status}</td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => openPrint(b.billing_month, b.billing_year)} className="text-blue-600 hover:underline">Print</button>
                      </td>
                    </tr>
                  ))}
                  {!bills?.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No bills yet</td></tr>}
                </tbody>
              </table>
            </section>

            <section className="bg-white rounded-xl border overflow-hidden">
              <div className="px-4 py-3 font-semibold bg-gray-50 border-b flex items-center justify-between gap-3">
                <h2>Recent Readings</h2>
                <button
                  type="button"
                  onClick={openAddReading}
                  className="text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline"
                >
                  + Add reading
                </button>
              </div>
              <table className="min-w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left">Period</th>
                  <th className="px-4 py-2 text-right">Previous</th>
                  <th className="px-4 py-2 text-right">Current</th>
                  <th className="px-4 py-2 text-right">Consumption</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr></thead>
                <tbody>
                  {(readings || []).map((r: any) => (
                    <tr key={r.reading_id} className="border-b">
                      <td className="px-4 py-2">{r.reading_period_month}/{r.reading_period_year}</td>
                      <td className="px-4 py-2 text-right">{r.previous_reading}</td>
                      <td className="px-4 py-2 text-right">{r.current_reading}</td>
                      <td className="px-4 py-2 text-right">{r.consumption} m³</td>
                      <td className="px-4 py-2 text-center capitalize">{r.status}</td>
                    </tr>
                  ))}
                  {!readings?.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No readings yet</td></tr>}
                </tbody>
              </table>
            </section>

            <section className="bg-white rounded-xl border overflow-hidden">
              <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Payments</h2>
              <table className="min-w-full text-sm">
                <thead><tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">OR #</th>
                  <th className="px-4 py-2 text-left">Method</th>
                </tr></thead>
                <tbody>
                  {(payments || []).map((p: any) => (
                    <tr key={p.payment_id} className="border-b">
                      <td className="px-4 py-2">{p.payment_date}</td>
                      <td className="px-4 py-2 text-right">{formatPeso(p.amount_paid)}</td>
                      <td className="px-4 py-2">{p.or_number || '—'}</td>
                      <td className="px-4 py-2 capitalize">{p.payment_method}</td>
                    </tr>
                  ))}
                  {!payments?.length && <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No payments yet</td></tr>}
                </tbody>
              </table>
            </section>
          </div>
        </div>

        {showReading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-bold mb-1">Add Meter Reading</h2>
              <p className="text-sm text-gray-500 mb-4">
                Previous reading:{' '}
                <span className="font-medium text-gray-800">
                  {account.last_reading ?? account.previous_reading ?? 0} m³
                </span>
              </p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current reading (m³) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={readingForm.current_reading}
                    onChange={(e) => setReadingForm({ ...readingForm, current_reading: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Enter current meter reading"
                    autoFocus
                  />
                  {readingForm.current_reading !== '' && !Number.isNaN(parseFloat(readingForm.current_reading)) && (
                    <p className="mt-1 text-xs text-gray-500">
                      Consumption:{' '}
                      {Math.max(
                        0,
                        parseFloat(readingForm.current_reading) -
                          (parseFloat(account.last_reading ?? account.previous_reading) || 0)
                      ).toFixed(2)}{' '}
                      m³
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reading date</label>
                  <input
                    type="date"
                    value={readingForm.reading_date}
                    onChange={(e) => setReadingForm({ ...readingForm, reading_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period month</label>
                    <select
                      value={readingForm.period_month}
                      onChange={(e) => setReadingForm({ ...readingForm, period_month: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Period year</label>
                    <input
                      type="number"
                      value={readingForm.period_year}
                      onChange={(e) => setReadingForm({ ...readingForm, period_year: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    rows={2}
                    value={readingForm.notes}
                    onChange={(e) => setReadingForm({ ...readingForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Optional"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReading(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                  disabled={savingReading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReading}
                  disabled={savingReading}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {savingReading ? 'Saving…' : 'Save Reading'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-bold mb-4">Record Payment</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input type="number" step="0.01" value={paymentForm.amount_paid} onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apply to Bill</label>
                  <select value={paymentForm.bill_id} onChange={(e) => setPaymentForm({ ...paymentForm, bill_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Optional — general payment</option>
                    {(bills || []).filter((b: any) => b.status !== 'paid').map((b: any) => (
                      <option key={b.bill_id} value={b.bill_id}>{b.billing_month}/{b.billing_year} — {formatPeso(b.total_due)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">OR Number</label>
                  <input value={paymentForm.or_number} onChange={(e) => setPaymentForm({ ...paymentForm, or_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                  <input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="online">Online</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowPayment(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button onClick={submitPayment} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Save Payment</button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
