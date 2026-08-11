'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import etracsService from '@/services/etracsService';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { VIOLATIONS } from '@/features/citations/constants';
import { CitationListPanel } from '@/features/citations/CitationListPanel';
import {
  matchesPaymentStatusFilter,
  citationReportAmount,
  PARTIAL_PAYMENT_STATUSES,
} from '@/features/citations/citationUtils';

interface Citation {
  citation_id: string;
  ticket_number: string;
  driver_name: string;
  plate_number: string;
  violation_date: string;
  fine_amount: number;
  total_paid?: number | string;
  payment_status: string;
  is_completed: boolean;
  violations?: string[];
  created_at: string;
  issued_by_name: string;
}

interface FormData {
  ticketNumber: string;
  driverName: string;
  driverAddress: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleColor: string;
  plateNumber: string;
  vehicleRegistration: string;
  vehicleOwner: string;
  ownerName: string;
  ownerAddress: string;
  violations: string[];
  otherViolations: string;
  remarks: string;
  placeViolation: string;
  violationTime: string;
  violationDate: string;
  fineAmount: number;
  paymentStatus: string;
  dateIssued: string;
  enforcerId: string;
  officer: string;
}

export default function CitationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'list' | 'report'>('list');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [enforcers, setEnforcers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saveModal, setSaveModal] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [saveModalMessage, setSaveModalMessage] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
  const [listSearchTerm, setListSearchTerm] = useState<string>('');
  const [citationsViewMode, setCitationsViewMode] = useState<'list' | 'grid' | 'table'>('grid');

  useEffect(() => {
    const saved = localStorage.getItem('citationsViewMode') as 'list' | 'grid' | 'table' | null;
    if (saved) setCitationsViewMode(saved);
  }, []);
  const [reportCurrentPage, setReportCurrentPage] = useState<number>(1);
  const [reportRecordsPerPage, setReportRecordsPerPage] = useState<number>(10);

  // Report filters
  const [reportFilters, setReportFilters] = useState({
    paymentStatus: 'all',
    dateFrom: '',
    dateTo: '',
    violations: '',
  });
  const [citationReportHeader, setCitationReportHeader] = useState('permit');
  const [groupByEnforcer, setGroupByEnforcer] = useState(false);

  // Citation report modal
  const [showCitationReportModal, setShowCitationReportModal] = useState(false);
  const [citationReportUrl, setCitationReportUrl] = useState('');

  // eTracs integration state
  const [etracsSearching, setEtracsSearching] = useState(false);
  const [etracsResults, setEtracsResults] = useState<any[]>([]);
  const [showEtracsModal, setShowEtracsModal] = useState(false);
  const [etracsExactMatch, setEtracsExactMatch] = useState<any | null>(null);

  const [formData, setFormData] = useState<FormData>({
    ticketNumber: '',
    driverName: '',
    driverAddress: '',
    licenseNumber: '',
    vehicleType: '',
    vehicleColor: '',
    plateNumber: '',
    vehicleRegistration: '',
    vehicleOwner: '',
    ownerName: '',
    ownerAddress: '',
    violations: [],
    otherViolations: '',
    remarks: '',
    placeViolation: '',
    violationTime: '',
    violationDate: new Date().toISOString().split('T')[0],
    fineAmount: 0,
    paymentStatus: 'Pending',
    dateIssued: new Date().toISOString().split('T')[0],
    enforcerId: '',
    officer: user?.full_name || '',
  });

  // Returns page numbers to display with null as ellipsis placeholder
  function getPageWindow(current: number, total: number): (number | null)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | null)[] = [];
    pages.push(1);
    if (current > 4) pages.push(null);
    for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) pages.push(i);
    if (current < total - 3) pages.push(null);
    pages.push(total);
    return pages;
  }

  function generateTicketNumber() {
    const prefix = 'DG-' + new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0');
    return prefix + '-' + random;
  }

  useEffect(() => {
    fetchEnforcers();
    fetchCitations();
  }, []);

  useEffect(() => {
    if (activeTab === 'list') {
      setCurrentPage(1);
      setListSearchTerm('');
    } else if (activeTab === 'report') {
      setReportCurrentPage(1);
    }
  }, [activeTab]);

  const fetchEnforcers = async () => {
    try {
      const response = await api.get('/api/enforcers?limit=1000');
      setEnforcers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching enforcers:', error);
    }
  };

  const fetchCitations = async () => {
    try {
      setLoading(true);
      setCurrentPage(1);
      const response = await api.get('/api/citations?limit=10000');
      setCitations(response.data.data || []);
    } catch (error) {
      console.error('Error fetching citations:', error);
      setErrorMessage('Failed to load citations');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'fineAmount' ? parseFloat(value) || 0 : value.toUpperCase(),
    }));
  };

  const handleViolationChange = (violation: string) => {
    setFormData((prev) => ({
      ...prev,
      violations: prev.violations.includes(violation)
        ? prev.violations.filter((v) => v !== violation)
        : [...prev.violations, violation],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.driverName || !formData.driverAddress) {
      setErrorMessage('Please fill in all required driver information');
      return;
    }

    if (!formData.vehicleType || !formData.plateNumber) {
      setErrorMessage('Please fill in all required vehicle information');
      return;
    }

    if (formData.violations.length === 0) {
      setErrorMessage('Please select at least one violation');
      return;
    }

    if (formData.violations.includes('Others') && !formData.otherViolations) {
      setErrorMessage('Please specify the other violation');
      return;
    }

    if (!formData.placeViolation || !formData.violationTime) {
      setErrorMessage('Please fill in violation details');
      return;
    }

    if (formData.fineAmount <= 0) {
      setErrorMessage('Please enter a valid fine amount');
      return;
    }

    if (!formData.enforcerId) {
      setErrorMessage('Please select an officer/enforcer');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSaveModal('saving');
      setSaveModalMessage('Saving citation record...');

      // Replace "Others" in the violations array with the specified text so it's properly recorded
      const resolvedViolations = formData.violations.map((v) =>
        v === 'Others' && formData.otherViolations.trim()
          ? `Others: ${formData.otherViolations.trim().toUpperCase()}`
          : v
      );

      await api.post('/api/citations', {
        ticketNumber: formData.ticketNumber,
        driverName: formData.driverName,
        driverAddress: formData.driverAddress,
        licenseNumber: formData.licenseNumber,
        vehicleType: formData.vehicleType,
        vehicleColor: formData.vehicleColor,
        plateNumber: formData.plateNumber,
        vehicleRegistration: formData.vehicleRegistration,
        vehicleOwner: formData.vehicleOwner,
        ownerName: formData.ownerName,
        ownerAddress: formData.ownerAddress,
        violations: resolvedViolations,
        otherViolations: formData.otherViolations,
        remarks: formData.remarks,
        violationLocation: formData.placeViolation,
        violationTime: formData.violationTime?.split('T')[1] || '',
        violationDate: formData.violationDate,
        fineAmount: formData.fineAmount,
        paymentStatus: formData.paymentStatus,
        enforcerId: formData.enforcerId,
        enforcerName: formData.officer,
      });

      setSuccessMessage('Citation ticket saved successfully!');
      setSaveModal('success');
      setSaveModalMessage('Citation ticket saved successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        setSaveModal('idle');
        // Reset form
        setFormData({
          ticketNumber: '',
          driverName: '',
          driverAddress: '',
          licenseNumber: '',
          vehicleType: '',
          vehicleColor: '',
          plateNumber: '',
          vehicleRegistration: '',
          vehicleOwner: '',
          ownerName: '',
          ownerAddress: '',
          violations: [],
          otherViolations: '',
          remarks: '',
          placeViolation: '',
          violationTime: '',
          violationDate: new Date().toISOString().split('T')[0],
          fineAmount: 0,
          paymentStatus: 'Pending',
          dateIssued: new Date().toISOString().split('T')[0],
          enforcerId: '',
          officer: user?.full_name || '',
        });
        // Switch to list tab to see the new citation
        setActiveTab('list');
      }, 2000);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Failed to save citation';
      setErrorMessage(msg);
      setSaveModal('error');
      setSaveModalMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClearForm = () => {
    setFormData({
      ticketNumber: '',
      driverName: '',
      driverAddress: '',
      licenseNumber: '',
      vehicleType: '',
      vehicleColor: '',
      plateNumber: '',
      vehicleRegistration: '',
      vehicleOwner: '',
      ownerName: '',
      ownerAddress: '',
      violations: [],
      otherViolations: '',
      remarks: '',
      placeViolation: '',
      violationTime: '',
      violationDate: new Date().toISOString().split('T')[0],
      fineAmount: 0,
      paymentStatus: 'Pending',
      dateIssued: new Date().toISOString().split('T')[0],
      enforcerId: '',
      officer: user?.full_name || '',
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const getFilteredCitations = () => {
    return citations.filter((citation) => {
      // Filter by payment status (Partial → Partially Paid; Paid includes partials)
      if (!matchesPaymentStatusFilter(citation.payment_status, reportFilters.paymentStatus)) {
        return false;
      }

      // Filter by date range
      if (reportFilters.dateFrom) {
        const citationDate = new Date(citation.violation_date);
        const filterFromDate = new Date(reportFilters.dateFrom);
        if (citationDate < filterFromDate) {
          return false;
        }
      }

      if (reportFilters.dateTo) {
        const citationDate = new Date(citation.violation_date);
        const filterToDate = new Date(reportFilters.dateTo);
        // Add 1 day to include the entire "to" date
        filterToDate.setDate(filterToDate.getDate() + 1);
        if (citationDate >= filterToDate) {
          return false;
        }
      }

      // Filter by violations
      if (reportFilters.violations !== '') {
        const citationViolations = citation.violations || [];
        const list = Array.isArray(citationViolations) ? citationViolations : [citationViolations];
        const other = String((citation as any).other_violations || (citation as any).otherViolations || '').trim();
        if (reportFilters.violations === 'Others') {
          const hasOthers = list.some((item) => /^Others(\b|:)/i.test(String(item || ''))) || !!other;
          if (!hasOthers) return false;
        } else if (!list.includes(reportFilters.violations)) {
          return false;
        }
      }

      return true;
    });
  };

  // Pagination logic for list tab
  const filteredCitations = citations.filter(citation => {
    const searchLower = listSearchTerm.toLowerCase();
    return (
      citation.ticket_number.toLowerCase().includes(searchLower) ||
      citation.driver_name.toLowerCase().includes(searchLower)
    );
  });
  const totalPages = Math.ceil(filteredCitations.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedCitations = filteredCitations.slice(startIndex, endIndex);

  // Ensure current page doesn't exceed total pages
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Pagination logic for report tab
  const reportFilteredCitations = getFilteredCitations();
  const reportTotalPages = Math.ceil(reportFilteredCitations.length / reportRecordsPerPage);
  const reportStartIndex = (reportCurrentPage - 1) * reportRecordsPerPage;
  const reportEndIndex = reportStartIndex + reportRecordsPerPage;
  const paginatedReportCitations = reportFilteredCitations.slice(reportStartIndex, reportEndIndex);

  // Ensure report current page doesn't exceed total pages
  if (reportCurrentPage > reportTotalPages && reportTotalPages > 0) {
    setReportCurrentPage(1);
  }

  const handleResetFilters = () => {
    setReportCurrentPage(1);
    setGroupByEnforcer(false);
    setReportFilters({
      paymentStatus: 'all',
      dateFrom: '',
      dateTo: '',
      violations: '',
    });
  };

  const openCitationReport = () => {
    const token = localStorage.getItem('token') || '';
    const params = new URLSearchParams();
    if (reportFilters.paymentStatus && reportFilters.paymentStatus !== 'all') {
      params.set('paymentStatus', reportFilters.paymentStatus);
    }
    if (reportFilters.dateFrom) params.set('dateFrom', reportFilters.dateFrom);
    if (reportFilters.dateTo)   params.set('dateTo', reportFilters.dateTo);
    if (reportFilters.violations) params.set('violations', reportFilters.violations);
    if (groupByEnforcer) params.set('groupByEnforcer', '1');
    if (token) params.set('token', token);
    params.set('header', citationReportHeader);
    setCitationReportUrl(`/citation-report.html?${params.toString()}`);
    setShowCitationReportModal(true);
  };

  // Verify driver information with eTracs
  const handleVerifyDriver = async () => {
    if (!formData.driverName) {
      setErrorMessage('Please enter driver name first');
      return;
    }

    try {
      setEtracsSearching(true);
      setErrorMessage('');
      
      const nameParts = formData.driverName.trim().split(/\s+/);
      const response = await etracsService.verifyDriverWithEtracs({
        firstname: nameParts[0] || '',
        lastname: nameParts[nameParts.length - 1] || '',
        middlename: nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '',
      });

      setEtracsResults(response.all_results || []);
      setEtracsExactMatch(response.exact_match);
      setShowEtracsModal(true);
    } catch (error: any) {
      console.error('eTracs verification error:', error);
      setErrorMessage('Failed to verify driver with eTracs: ' + (error.response?.data?.error || error.message));
    } finally {
      setEtracsSearching(false);
    }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-slate-800 flex items-center justify-center">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                  Citation Tickets
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">
                  Manage traffic violation citation tickets
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 items-center">
            <Link
              href="/citations/create"
              className="px-4 py-2.5 mb-2 font-medium text-sm text-white rounded-lg"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              + New Citation
            </Link>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                activeTab === 'list'
                  ? 'text-slate-800 border-b-2 border-slate-800'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Citations List
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-4 py-3 font-medium text-sm transition-all duration-200 ${
                activeTab === 'report'
                  ? 'text-slate-800 border-b-2 border-slate-800'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              Report
            </button>
            <button
              type="button"
              onClick={() => router.push('/citations/payments')}
              className="px-4 py-3 font-medium text-sm transition-all duration-200 text-slate-600 hover:text-slate-800"
            >
              Citation Payments
            </button>
          </div>

          {/* Success and Error Messages (kept for accessibility fallback) */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              ✓ {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              ✗ {errorMessage}
            </div>
          )}

          {/* Save Status Modal */}
          {saveModal !== 'idle' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 flex flex-col items-center gap-5">
                {saveModal === 'saving' && (
                  <>
                    <div className="h-14 w-14 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-slate-800">Saving Citation</p>
                      <p className="text-sm text-slate-500 mt-1">{saveModalMessage}</p>
                    </div>
                  </>
                )}
                {saveModal === 'success' && (
                  <>
                    <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-700">Saved Successfully</p>
                      <p className="text-sm text-slate-500 mt-1">{saveModalMessage}</p>
                    </div>
                  </>
                )}
                {saveModal === 'error' && (
                  <>
                    <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
                      <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-red-700">Save Failed</p>
                      <p className="text-sm text-slate-500 mt-1">{saveModalMessage}</p>
                    </div>
                    <button
                      onClick={() => { setSaveModal('idle'); setSaveModalMessage(''); }}
                      className="mt-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                    >
                      Dismiss
                    </button>
                  </>
                )}
              </div>
            </div>
          )}


          {/* Citations List Tab */}
          {activeTab === 'list' && (
            <CitationListPanel
              loading={loading}
              citations={citations}
              paginatedCitations={paginatedCitations}
              filteredCount={filteredCitations.length}
              listSearchTerm={listSearchTerm}
              onSearchChange={(v) => { setListSearchTerm(v); setCurrentPage(1); }}
              onClearSearch={() => { setListSearchTerm(''); setCurrentPage(1); }}
              viewMode={citationsViewMode}
              onViewModeChange={(mode) => { setCitationsViewMode(mode); localStorage.setItem('citationsViewMode', mode); }}
              recordsPerPage={recordsPerPage}
              onRecordsPerPageChange={(n) => { setRecordsPerPage(n); setCurrentPage(1); }}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageWindow={getPageWindow(currentPage, totalPages)}
              onSelect={(id) => router.push(`/citations/${id}`)}
            />
          )}

          {/* Report Tab */}
          {activeTab === 'report' && (
            <div className="space-y-6">
              {/* Filters Section */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Payment Status
                    </label>
                    <select
                      value={reportFilters.paymentStatus}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          paymentStatus: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">All</option>
                      <option value="Paid">Paid (incl. Partial)</option>
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partially Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Violation Type
                    </label>
                    <select
                      value={reportFilters.violations}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          violations: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Violations</option>
                      {VIOLATIONS.map((violation) => (
                        <option key={violation} value={violation}>
                          {violation}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date From
                    </label>
                    <input
                      type="date"
                      value={reportFilters.dateFrom}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          dateFrom: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Date To
                    </label>
                    <input
                      type="date"
                      value={reportFilters.dateTo}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          dateTo: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Header Type
                    </label>
                    <select
                      value={citationReportHeader}
                      onChange={(e) => setCitationReportHeader(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="permit">Permit / Mayor&apos;s Office</option>
                      <option value="assessment">Treasurer&apos;s Office</option>
                      <option value="disco">Disco / Events Office</option>
                    </select>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={handleResetFilters}
                      className="flex-1 px-4 py-2 bg-slate-400 text-white rounded-lg hover:bg-slate-500 transition-colors font-medium text-sm"
                    >
                      ↻ Reset
                    </button>
                    <button
                      onClick={openCitationReport}
                      className="flex-1 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm"
                    >
                      📄 Preview Report
                    </button>
                  </div>
                </div>

                {/* Group by Enforcer toggle */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={groupByEnforcer}
                      onChange={(e) => setGroupByEnforcer(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-slate-800"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Group by Enforcer&nbsp;
                      <span className="text-slate-400 font-normal">(show subtotal per enforcer in the report)</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Citation Statistics */}
              <div className="bg-white rounded-lg border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Citation Statistics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-600 mb-1">Total Citations</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {reportFilteredCitations.length}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 mb-1">Paid</p>
                    <p className="text-2xl font-bold text-green-800">
                      {reportFilteredCitations.filter((c) => c.payment_status === 'Paid').length}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-sm text-orange-600 mb-1">Partially Paid</p>
                    <p className="text-2xl font-bold text-orange-800">
                      {
                        reportFilteredCitations.filter((c) =>
                          PARTIAL_PAYMENT_STATUSES.includes((c.payment_status || '').trim())
                        ).length
                      }
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-600 mb-1">Pending</p>
                    <p className="text-2xl font-bold text-yellow-800">
                      {reportFilteredCitations.filter((c) => c.payment_status === 'Pending').length}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-800">
                      ₱{formatCurrency(reportFilteredCitations.reduce((sum, c) => sum + citationReportAmount(c), 0))}
                    </p>
                    <p className="text-[11px] text-blue-500 mt-1">
                      Amount received for paid/partial, assessed fine otherwise
                    </p>
                  </div>
                </div>
              </div>

              {/* Pagination and records info for report */}
              {reportFilteredCitations.length > 0 && (
                <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  {/* Records per page selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-sm text-slate-600">
                      Showing <span className="font-semibold">{Math.min(reportRecordsPerPage, reportFilteredCitations.length)}</span> records per page out of <span className="font-semibold">{reportFilteredCitations.length}</span> total
                    </div>
                    <div className="flex items-center gap-3">
                      <label htmlFor="report-records-per-page-selector" className="text-sm font-medium text-slate-700">
                        Records per page:
                      </label>
                      <select
                        id="report-records-per-page-selector"
                        value={reportRecordsPerPage}
                        onChange={(e) => {
                          setReportRecordsPerPage(Number(e.target.value));
                          setReportCurrentPage(1);
                        }}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:border-slate-800 focus:ring-2 focus:ring-slate-300 transition-all outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  {/* Page navigation */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200 pt-4">
                    <div className="text-sm text-slate-600">
                      Page <span className="font-semibold">{reportCurrentPage}</span> of <span className="font-semibold">{reportTotalPages}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setReportCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={reportCurrentPage === 1}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        aria-label="Previous page"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {getPageWindow(reportCurrentPage, reportTotalPages).map((pageNum, idx) =>
                          pageNum === null ? (
                            <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-slate-400 select-none">…</span>
                          ) : (
                            <button
                              key={pageNum}
                              onClick={() => setReportCurrentPage(pageNum)}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                reportCurrentPage === pageNum
                                  ? 'bg-slate-800 text-white'
                                  : 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                              }`}
                              aria-label={`Go to page ${pageNum}`}
                              aria-current={reportCurrentPage === pageNum ? 'page' : undefined}
                            >
                              {pageNum}
                            </button>
                          )
                        )}
                      </div>
                      <button
                        onClick={() => setReportCurrentPage(prev => Math.min(reportTotalPages, prev + 1))}
                        disabled={reportCurrentPage === reportTotalPages}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        aria-label="Next page"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filtered Citations Table */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800">
                    Filtered Citations ({reportFilteredCitations.length})
                  </h3>
                </div>
                {reportFilteredCitations.length === 0 ? (
                  <div className="p-8 text-center text-slate-600">
                    No citations match the selected filters.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800 text-white">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-semibold">
                            Ticket #
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">
                            Driver Name
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">
                            Plate Number
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">
                            Fine Amount
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">
                            Payment Status
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {paginatedReportCitations.map((citation) => (
                          <tr
                            key={citation.citation_id}
                            onClick={() => router.push(`/citations/${citation.citation_id}`)}
                            className="hover:bg-slate-100 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                              {citation.ticket_number}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {citation.driver_name}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {citation.plate_number}
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                              ₱{formatCurrency(Number(citation.fine_amount) || 0)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  citation.payment_status === 'Paid'
                                    ? 'bg-green-100 text-green-800'
                                    : citation.payment_status === 'Pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : citation.payment_status === 'Partially Paid' || citation.payment_status === 'Installment'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {citation.payment_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {new Date(citation.violation_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Citation Report Modal */}
          {showCitationReportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Citation Ticket Report</h3>
                  <button
                    onClick={() => {
                      setShowCitationReportModal(false);
                      setCitationReportUrl('');
                    }}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <iframe
                    src={citationReportUrl}
                    className="w-full h-full border-0"
                    title="Citation Ticket Report"
                  />
                </div>
                <div className="flex items-center justify-end px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowCitationReportModal(false);
                      setCitationReportUrl('');
                    }}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* eTracs Verification Modal */}
          {showEtracsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
                <div className="sticky top-0 bg-slate-800 text-white p-6 flex justify-between items-center">
                  <h2 className="text-xl font-bold">🔍 Driver Verification Results from eTracs</h2>
                  <button
                    onClick={() => {
                      setShowEtracsModal(false);
                      setEtracsResults([]);
                      setEtracsExactMatch(null);
                    }}
                    className="text-white hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {etracsExactMatch && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                      <h3 className="font-bold text-green-800 mb-2">✓ Exact Match Found!</h3>
                      <div className="space-y-2 text-sm text-green-700">
                        <p><strong>Name:</strong> {etracsExactMatch.name}</p>
                        <p><strong>Entity No.:</strong> {etracsExactMatch.entityno}</p>
                        <p><strong>Address:</strong> {etracsExactMatch.address?.text || 'N/A'}</p>
                        {etracsExactMatch.firstname && (
                          <>
                            <p><strong>First Name:</strong> {etracsExactMatch.firstname}</p>
                            <p><strong>Last Name:</strong> {etracsExactMatch.lastname}</p>
                            {etracsExactMatch.birthdate && <p><strong>Birth Date:</strong> {etracsExactMatch.birthdate}</p>}
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            driverAddress: etracsExactMatch.address?.text?.replace(/\n/g, ', ') || prev.driverAddress
                          }));
                          setShowEtracsModal(false);
                        }}
                        className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                      >
                        ✓ Use This Information
                      </button>
                    </div>
                  )}

                  {etracsResults.length > 0 ? (
                    <>
                      {!etracsExactMatch && (
                        <p className="text-slate-600 text-sm">Multiple matches found. Click to select or use the information below:</p>
                      )}
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {etracsResults.map((result, index) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                              result.match_score === 100
                                ? 'bg-green-50 border-green-200'
                                : result.match_score >= 80
                                ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                driverAddress: result.address?.text?.replace(/\n/g, ', ') || prev.driverAddress,
                                driverName: result.name || prev.driverName
                              }));
                              setShowEtracsModal(false);
                            }}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-slate-800">{result.name}</p>
                                <p className="text-xs text-slate-500">{result.entityno}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                result.match_score === 100
                                  ? 'bg-green-200 text-green-800'
                                  : result.match_score >= 80
                                  ? 'bg-blue-200 text-blue-800'
                                  : 'bg-slate-200 text-slate-800'
                              }`}>
                                {result.match_score}% match
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{result.address?.text || 'No address'}</p>
                            {result.matched_fields && (
                              <p className="text-xs text-slate-500">
                                Matched: {result.matched_fields.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-slate-600 py-4">No results found</p>
                  )}

                  <button
                    onClick={() => {
                      setShowEtracsModal(false);
                      setEtracsResults([]);
                      setEtracsExactMatch(null);
                    }}
                    className="w-full px-4 py-2 bg-slate-300 text-slate-800 rounded-lg hover:bg-slate-400 font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
