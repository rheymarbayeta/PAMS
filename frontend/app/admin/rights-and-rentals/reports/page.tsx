'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface Property {
  id: number;
  property_name: string;
  property_code?: string;
}

interface ReportSummary {
  totalRecords: number;
  activeContracts?: number;
  totalRightsBalance?: number;
  totalOutstandingRental?: number;
  totalRightsCollected?: number;
  totalRentalCollected?: number;
  totalMonthlyDues?: number;
  totalPrincipal?: number;
  rightsPayments?: number;
  rentalPayments?: number;
  grandTotalCollected?: number;
}

type ReportType = 'contracts' | 'payments' | 'outstanding';

const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
  {
    value: 'contracts',
    label: 'Lease Contracts',
    description: 'All lease agreements with financial terms, stalls, and balances',
  },
  {
    value: 'payments',
    label: 'Payment Collection',
    description: 'Rights and rental payments with OR numbers and periods',
  },
  {
    value: 'outstanding',
    label: 'Outstanding Balances',
    description: 'Contracts with remaining rights balance or outstanding rental',
  },
];

const CONTRACT_STATUSES = ['active', 'terminated', 'pending', 'expired'];
const NO_FLOOR_LABEL = 'No Floor Assigned';

function getFloorLabel(floorLevel: string | null | undefined): string {
  return floorLevel || NO_FLOOR_LABEL;
}

export default function RightsRentalsReportsPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [recordCount, setRecordCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reportType, setReportType] = useState<ReportType>('contracts');
  const [propertyId, setPropertyId] = useState('');
  const [floorLevel, setFloorLevel] = useState('');
  const [floorLevels, setFloorLevels] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  const [paymentType, setPaymentType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    if (!propertyId) {
      setFloorLevels([]);
      setFloorLevel('');
      return;
    }
    fetchFloorLevelsForProperty(parseInt(propertyId, 10));
  }, [propertyId]);

  useEffect(() => {
    fetchSummaryPreview();
  }, [reportType, propertyId, floorLevel, status, paymentType, dateFrom, dateTo, search]);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/rights-and-rentals/properties');
      setProperties(response.data);
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFloorLevelsForProperty = async (id: number) => {
    try {
      const response = await api.get(`/api/rights-and-rentals/properties/${id}/units`);
      const floors = new Set<string>();
      (response.data || []).forEach((unit: { floor_level: string | null }) => {
        floors.add(getFloorLabel(unit.floor_level));
      });
      const sorted = Array.from(floors).sort((a, b) => a.localeCompare(b));
      setFloorLevels(sorted);
      setFloorLevel((prev) => (prev && sorted.includes(prev) ? prev : ''));
    } catch (err) {
      console.error('Error fetching floor levels:', err);
      setFloorLevels([]);
      setFloorLevel('');
    }
  };

  const buildParams = () => {
    const params: Record<string, string> = { reportType };
    if (propertyId) params.propertyId = propertyId;
    if (floorLevel) params.floorLevel = floorLevel;
    if (status) params.status = status;
    if (reportType === 'payments' && paymentType) params.paymentType = paymentType;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (search.trim()) params.search = search.trim();
    return params;
  };

  const fetchSummaryPreview = async () => {
    try {
      setError(null);
      const response = await api.get('/api/rights-and-rentals/reports', { params: buildParams() });
      setSummary(response.data.summary);
      setRecordCount(response.data.rows?.length ?? 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load report preview';
      setError(msg);
      setSummary(null);
      setRecordCount(null);
    }
  };

  const selectedProperty = properties.find((p) => String(p.id) === propertyId);

  const openReportPreview = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const params = new URLSearchParams(buildParams());
    if (token) params.set('token', token);
    if (selectedProperty) params.set('propertyName', selectedProperty.property_name);
    setPreviewUrl(`/rights-rentals-report.html?${params.toString()}`);
    setShowPreview(true);
  };

  const clearFilters = () => {
    setPropertyId('');
    setFloorLevel('');
    setStatus('');
    setPaymentType('all');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const hasActiveFilters = propertyId || floorLevel || status || paymentType !== 'all' || dateFrom || dateTo || search.trim();

  const formatCurrency = (n?: number) =>
    Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="flex items-center justify-center py-20">
            <div className="h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/admin/rights-and-rentals" className="hover:text-indigo-600">Rights &amp; Rentals</Link>
              <span>/</span>
              <span className="text-gray-700">Reports</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Rights &amp; Rentals Reports</h1>
            <p className="text-gray-600">
              Generate printable reports for lease contracts, payment collections, and outstanding balances.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Report type selection */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Type</h2>
                <div className="space-y-3">
                  {REPORT_TYPES.map((rt) => (
                    <label
                      key={rt.value}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        reportType === rt.value
                          ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100'
                          : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportType"
                        value={rt.value}
                        checked={reportType === rt.value}
                        onChange={() => setReportType(rt.value)}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{rt.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{rt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {summary && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Preview Summary</h2>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Records</dt>
                      <dd className="font-semibold text-gray-900">{recordCount ?? 0}</dd>
                    </div>
                    {reportType === 'payments' ? (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Rights collected</dt>
                          <dd className="font-medium">₱ {formatCurrency(summary.totalRightsCollected)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Rental collected</dt>
                          <dd className="font-medium">₱ {formatCurrency(summary.totalRentalCollected)}</dd>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <dt className="text-gray-700 font-medium">Grand total</dt>
                          <dd className="font-bold text-indigo-700">₱ {formatCurrency(summary.grandTotalCollected)}</dd>
                        </div>
                      </>
                    ) : reportType === 'outstanding' ? (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Rights balance</dt>
                          <dd className="font-medium text-red-700">₱ {formatCurrency(summary.totalRightsBalance)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Outstanding rental</dt>
                          <dd className="font-medium text-red-700">₱ {formatCurrency(summary.totalOutstandingRental)}</dd>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <dt className="text-gray-700 font-medium">Monthly dues</dt>
                          <dd className="font-bold">₱ {formatCurrency(summary.totalMonthlyDues)}</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Active contracts</dt>
                          <dd className="font-medium">{summary.activeContracts ?? 0}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Total principal</dt>
                          <dd className="font-medium">₱ {formatCurrency(summary.totalPrincipal)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Rights balance</dt>
                          <dd className="font-medium">₱ {formatCurrency(summary.totalRightsBalance)}</dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                    <select
                      value={propertyId}
                      onChange={(e) => {
                        setPropertyId(e.target.value);
                        setFloorLevel('');
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    >
                      <option value="">All properties</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.property_name}
                          {p.property_code ? ` (${p.property_code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Floor level</label>
                    <select
                      value={floorLevel}
                      onChange={(e) => setFloorLevel(e.target.value)}
                      disabled={!propertyId || floorLevels.length === 0}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">
                        {!propertyId
                          ? 'Select a property first'
                          : floorLevels.length === 0
                          ? 'No floors found'
                          : 'All floors'}
                      </option>
                      {floorLevels.map((floor) => (
                        <option key={floor} value={floor}>
                          {floor}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    >
                      <option value="">All statuses</option>
                      {CONTRACT_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {reportType === 'payments' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment type</label>
                      <select
                        value={paymentType}
                        onChange={(e) => setPaymentType(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                      >
                        <option value="all">All payments</option>
                        <option value="rights">Rights only</option>
                        <option value="rental">Rental only</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {reportType === 'payments' ? 'Payment date from' : 'Contract effective from'}
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {reportType === 'payments' ? 'Payment date to' : 'Contract effective to'}
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>

                  <div className={reportType === 'payments' ? 'sm:col-span-2' : 'sm:col-span-2'}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <input
                      type="text"
                      placeholder="Lessee name, property, OR number..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={openReportPreview}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-200 transition-all shadow-lg shadow-indigo-200"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Generate Report
                  </button>
                  <p className="text-xs text-gray-500 self-center">
                    Legal size (8.5×13 in) with assessment header and page footer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  Rights &amp; Rentals Report — Print Preview
                </h3>
                <button
                  onClick={() => { setShowPreview(false); setPreviewUrl(''); }}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                  aria-label="Close preview"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe src={previewUrl} className="w-full h-full border-0" title="R&R Report Preview" />
              </div>
              <div className="flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <button
                  onClick={() => { setShowPreview(false); setPreviewUrl(''); }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
