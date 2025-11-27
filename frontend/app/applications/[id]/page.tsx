'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface ApplicationDetail {
  application_id: string;
  application_number: string | null;
  entity_id: string;
  entity_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  permit_type: string;
  status: string;
  creator_name: string;
  assessor_name: string | null;
  approver_name: string | null;
  issued_by_name: string | null;
  released_by: string | null;
  received_by: string | null;
  validity_date: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  parameters: Array<{ param_name: string; param_value: string }>;
  assessed_fees: Array<{
    assessed_fee_id: string;
    fee_id: string;
    fee_name: string;
    category_name: string;
    assessed_amount: number;
    default_amount: number;
    assessed_by_name: string;
  }>;
  audit_trail: Array<{
    log_id: string;
    user_name: string;
    action: string;
    details: string;
    timestamp: string;
  }>;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseData, setReleaseData] = useState({ released_by: '', received_by: '' });
  const [releasing, setReleasing] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [showReportsDropdown, setShowReportsDropdown] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchApplication();
    }
  }, [params.id]);

  const fetchApplication = async () => {
    try {
      const response = await api.get(`/api/applications/${params.id}`);
      setApplication(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        alert('Application not found');
        router.push('/applications');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Assessed':
        return 'bg-blue-100 text-blue-800';
      case 'Pending Approval':
        return 'bg-orange-100 text-orange-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Paid':
        return 'bg-emerald-100 text-emerald-800';
      case 'Issued':
        return 'bg-indigo-100 text-indigo-800';
      case 'Released':
        return 'bg-purple-100 text-purple-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canAssess = user && ['SuperAdmin', 'Admin', 'Assessor'].includes(user.role_name);
  const canApprove = user && ['SuperAdmin', 'Admin', 'Approver'].includes(user.role_name);
  const canIssue = user && ['SuperAdmin', 'Admin', 'Approver'].includes(user.role_name) && application?.status === 'Paid';
  const canRelease = user && ['SuperAdmin', 'Admin', 'Approver'].includes(user.role_name) && application?.status === 'Issued';
  const canPrintPermit = application?.status === 'Paid' || application?.status === 'Issued' || application?.status === 'Released';
  const canRenew = user && ['SuperAdmin', 'Admin', 'Application Creator'].includes(user.role_name) && 
    (application?.status === 'Issued' || application?.status === 'Released');
  const canDelete =
    user &&
    ['SuperAdmin', 'Admin'].includes(user.role_name) &&
    application?.status === 'Pending';

  const handleIssuePermit = async () => {
    if (!application) return;
    if (!confirm('Issue this permit? This will change the status to Issued.')) return;
    setIssuing(true);
    try {
      await api.put(`/api/applications/${application.application_id}/issue`);
      // Open permit report in new tab
      const token = localStorage.getItem('token') || '';
      const encodedToken = token ? `&token=${encodeURIComponent(token)}` : '';
      const url = `/permit-report.html?id=${application.application_id}${encodedToken}`;
      window.open(url, '_blank');
      fetchApplication();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error issuing permit');
    } finally {
      setIssuing(false);
    }
  };

  const handleReleasePermit = async () => {
    if (!releaseData.released_by.trim() || !releaseData.received_by.trim()) {
      alert('Please fill in both fields');
      return;
    }
    setReleasing(true);
    try {
      await api.put(`/api/applications/${application?.application_id}/release`, releaseData);
      alert('Permit released successfully!');
      setShowReleaseModal(false);
      setReleaseData({ released_by: '', received_by: '' });
      fetchApplication();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error releasing permit');
    } finally {
      setReleasing(false);
    }
  };

  const handleDelete = async () => {
    if (!application) return;
    if (!confirm('Are you sure you want to delete this pending application? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/applications/${application.application_id}`);
      alert('Application deleted successfully');
      router.push('/applications');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting application');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading application...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!application) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Application Not Found</h3>
              <p className="text-gray-500">The application you're looking for doesn't exist.</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const totalFees = application.assessed_fees.reduce((sum, fee) => sum + parseFloat(fee.assessed_amount.toString()), 0);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          {/* Main Layout - Content on left, Transaction Logs on right */}
          <div className="flex flex-col xl:flex-row gap-4">
            {/* Left Content Area */}
            <div className="flex-1 min-w-0">
              {/* Page Header */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Image
                      src="/dalaguete-logo.png"
                      alt="Municipality of Dalaguete Official Seal"
                      width={70}
                      height={70}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      Application {application.application_number || `#${application.application_id}`}
                    </h1>
                    <span
                      className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ${getStatusColor(
                        application.status
                      )}`}
                    >
                      {application.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Reports Dropdown - shows when there are reports available */}
                  {((canPrintPermit && application.status !== 'Paid') || ((application.status === 'Assessed' || application.status === 'Pending Approval' || application.status === 'Approved' || application.status === 'Paid' || application.status === 'Issued' || application.status === 'Released') && application.assessed_fees.length > 0)) && (
                    <div className="relative">
                      <button
                        onClick={() => setShowReportsDropdown(!showReportsDropdown)}
                        onBlur={() => setTimeout(() => setShowReportsDropdown(false), 150)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-xl shadow-lg shadow-gray-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Reports
                        <svg className={`w-3 h-3 transition-transform ${showReportsDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showReportsDropdown && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                          {canPrintPermit && application.status !== 'Paid' && (
                            <button
                              onClick={() => {
                                const token = localStorage.getItem('token') || '';
                                const encodedToken = token ? `&token=${encodeURIComponent(token)}` : '';
                                const url = `/permit-report.html?id=${application.application_id}${encodedToken}`;
                                window.open(url, '_blank');
                                setShowReportsDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                            >
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                              Print Permit
                            </button>
                          )}
                          {(application.status === 'Assessed' || application.status === 'Pending Approval' || application.status === 'Approved' || application.status === 'Paid' || application.status === 'Issued' || application.status === 'Released') && application.assessed_fees.length > 0 && (
                            <button
                              onClick={() => {
                                const token = localStorage.getItem('token') || '';
                                const encodedToken = token ? `&token=${encodeURIComponent(token)}` : '';
                                const url = `/assessment-report.html?id=${application.application_id}${encodedToken}`;
                                window.open(url, '_blank');
                                setShowReportsDropdown(false);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                            >
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Print Assessment
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {application.status === 'Approved' && (
                    <button
                      onClick={() => router.push(`/applications/${application.application_id}/payment`)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Record Payment
                    </button>
                  )}
                  {application.status === 'Paid' && (
                    <button
                      onClick={handleIssuePermit}
                      disabled={issuing}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl shadow-lg shadow-teal-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {issuing ? 'Issuing...' : 'Issue Permit'}
                    </button>
                  )}
                  {application.status === 'Issued' && (
                    <button
                      onClick={() => setShowReleaseModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Release Permit
                    </button>
                  )}
                  {canRenew && (
                    <button
                      onClick={async () => {
                        if (!confirm('Renew this application? This will create a new application based on this one.')) return;
                        try {
                          const response = await api.post(`/api/applications/${application.application_id}/renew`);
                          alert('Application renewed successfully!');
                          router.push(`/applications/${response.data.application_id}`);
                        } catch (error: any) {
                          alert(error.response?.data?.error || 'Error renewing application');
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Renew
                    </button>
                  )}
                  {canAssess && application.status === 'Pending' && (
                    <button
                      onClick={() => router.push(`/applications/${application.application_id}/assess`)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      Assess Fees
                    </button>
                  )}
                  {canApprove && application.status === 'Pending Approval' && (
                    <button
                      onClick={() => router.push(`/applications/${application.application_id}/approve`)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Review & Approve
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl shadow-lg shadow-red-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Details Grid - 2 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Application Details */}
                <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Application Details
                  </h2>
                  <dl className="space-y-2">
                    <div className="flex items-start">
                      <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Permit Type</dt>
                      <dd className="text-xs text-gray-900 font-medium">{application.permit_type}</dd>
                    </div>
                    <div className="flex items-start">
                      <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Entity</dt>
                      <dd className="text-xs text-gray-900">{application.entity_name}</dd>
                    </div>
                    {application.contact_person && (
                      <div className="flex items-start">
                        <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Contact</dt>
                        <dd className="text-xs text-gray-900">{application.contact_person}</dd>
                      </div>
                    )}
                    {application.email && (
                      <div className="flex items-start">
                        <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Email</dt>
                        <dd className="text-xs text-gray-900">{application.email}</dd>
                      </div>
                    )}
                    {application.phone && (
                      <div className="flex items-start">
                        <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Phone</dt>
                        <dd className="text-xs text-gray-900">{application.phone}</dd>
                      </div>
                    )}
                    <div className="flex items-start pt-2 border-t border-gray-100">
                      <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Created By</dt>
                      <dd className="text-xs text-gray-900">{application.creator_name}</dd>
                    </div>
                    {application.assessor_name && (
                      <div className="flex items-start">
                        <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Assessed By</dt>
                        <dd className="text-xs text-gray-900">{application.assessor_name}</dd>
                      </div>
                    )}
                    {application.approver_name && (
                      <div className="flex items-start">
                        <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Approved By</dt>
                        <dd className="text-xs text-gray-900">{application.approver_name}</dd>
                      </div>
                    )}
                    <div className="flex items-start">
                      <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Created At</dt>
                      <dd className="text-xs text-gray-900">
                        {new Date(application.created_at).toLocaleString()}
                      </dd>
                    </div>
                    {application.validity_date && (
                      <div className="flex items-start pt-2 border-t border-gray-100">
                        <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">Valid Until</dt>
                        <dd className="text-xs">
                          <span className={`font-medium ${new Date(application.validity_date) < new Date() ? 'text-red-600' : 'text-green-600'}`}>
                            {new Date(application.validity_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                          {new Date(application.validity_date) < new Date() && (
                            <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Expired</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Parameters */}
                <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-5">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Parameters
                  </h2>
                  {application.parameters.length === 0 ? (
                    <div className="text-center py-6">
                      <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      <p className="text-xs text-gray-500">No parameters</p>
                    </div>
                  ) : (
                    <dl className="space-y-2">
                      {application.parameters.map((param, index) => (
                        <div key={index} className="flex items-start">
                          <dt className="w-28 text-xs font-medium text-gray-500 flex-shrink-0">{param.param_name}</dt>
                          <dd className="text-xs text-gray-900">{param.param_value || '-'}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </div>

              {/* Assessed Fees */}
              <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Assessed Fees
                </h2>
                {application.assessed_fees.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-500">No fees assessed yet</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fee Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assessed By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {application.assessed_fees.map((fee) => (
                          <tr key={fee.assessed_fee_id} className="hover:bg-gray-50/50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="bg-gray-100 px-2 py-1 rounded-full">{fee.category_name}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{fee.fee_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-emerald-600">
                              ₱ {parseFloat(fee.assessed_amount.toString()).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fee.assessed_by_name}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gradient-to-r from-indigo-50 to-purple-50">
                        <tr>
                          <td colSpan={2} className="px-6 py-4 text-sm font-semibold text-gray-900">Total</td>
                          <td className="px-6 py-4 text-lg font-bold text-indigo-600">
                            ₱ {totalFees.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Sidebar - Transaction Logs (Full Height) */}
            <div className="xl:w-72 flex-shrink-0">
              <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-3 xl:sticky xl:top-4">
                <h2 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5 px-1">
                  <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Transaction Logs
                  <span className="ml-auto text-[9px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {application.audit_trail.length}
                  </span>
                </h2>
                <div className="max-h-[calc(100vh-180px)] overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {application.audit_trail.length === 0 ? (
                    <div className="text-center py-6">
                      <svg className="w-8 h-8 mx-auto text-gray-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-[10px] text-gray-500">No audit trail</p>
                    </div>
                  ) : (
                    application.audit_trail.map((log) => {
                      const formatLogDetails = (details: string) => {
                        return details.replace(/₱([\d,]+\.?\d{0,2})/g, (match, amount) => {
                          const num = parseFloat(amount.replace(/,/g, ''));
                          return '₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }).replace(/Amount:\s*(\d+(?:\.\d{2})?)/g, (match, amount) => {
                          const num = parseFloat(amount);
                          return 'Amount: ₱ ' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        });
                      };

                      return (
                        <div key={log.log_id} className="border-l-2 border-indigo-400 bg-gradient-to-r from-indigo-50/40 to-transparent pl-2 py-1 rounded-r">
                          <div className="text-[10px] text-gray-700 leading-tight">{formatLogDetails(log.details)}</div>
                          <div className="text-[8px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {log.user_name} • {new Date(log.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Release Permit Modal */}
        {showReleaseModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Release Permit
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Released By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={releaseData.released_by}
                    onChange={(e) => setReleaseData({ ...releaseData, released_by: e.target.value })}
                    placeholder="Name of person releasing the permit"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={releaseData.received_by}
                    onChange={(e) => setReleaseData({ ...releaseData, received_by: e.target.value })}
                    placeholder="Name of person receiving the permit"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowReleaseModal(false);
                    setReleaseData({ released_by: '', received_by: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReleasePermit}
                  disabled={releasing}
                  className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {releasing ? 'Releasing...' : 'Release Permit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}

