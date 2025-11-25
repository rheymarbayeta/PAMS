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
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const canAssess = user && ['SuperAdmin', 'Admin', 'Assessor'].includes(user.role_name);
  const canApprove = user && ['SuperAdmin', 'Admin', 'Approver'].includes(user.role_name);
  const canPrint = application?.status === 'Approved';
  const canRenew = user && ['SuperAdmin', 'Admin', 'Application Creator'].includes(user.role_name) && application?.status === 'Approved';
  const canDelete =
    user &&
    ['SuperAdmin', 'Admin'].includes(user.role_name) &&
    application?.status === 'Pending';

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
          <div>Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!application) {
    return (
      <ProtectedRoute>
        <Layout>
          <div>Application not found</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const totalFees = application.assessed_fees.reduce((sum, fee) => sum + parseFloat(fee.assessed_amount.toString()), 0);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <Image
                src="/dalaguete-logo.png"
                alt="Municipality of Dalaguete Official Seal"
                width={60}
                height={60}
                className="object-contain"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Application {application.application_number || `#${application.application_id}`}
                </h1>
                <span
                  className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                    application.status
                  )}`}
                >
                  {application.status}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              {canPrint && (
                <button
                  onClick={() => router.push(`/applications/${application.application_id}/print`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Print Permit
                </button>
              )}
              {(application.status === 'Assessed' || application.status === 'Pending Approval' || application.status === 'Approved') && application.assessed_fees.length > 0 && (
                <button
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    const encodedToken = token ? `&token=${encodeURIComponent(token)}` : '';
                    const url = `/assessment-report.html?id=${application.application_id}${encodedToken}`;
                    window.open(url, '_blank');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Print Assessment Report
                </button>
              )}
              {application.status === 'Approved' && (
                <button
                  onClick={() => router.push(`/applications/${application.application_id}/payment`)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Record Payment
                </button>
              )}
              {application.status === 'Paid' && (
                <button
                  onClick={() => {
                    const token = localStorage.getItem('token') || '';
                    const encodedToken = token ? `&token=${encodeURIComponent(token)}` : '';
                    const url = `/permit-report.html?id=${application.application_id}${encodedToken}`;
                    window.open(url, '_blank');
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Issue Permit
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Renew Application
                </button>
              )}
              {canAssess && application.status === 'Pending' && (
                <button
                  onClick={() => router.push(`/applications/${application.application_id}/assess`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Assess Fees
                </button>
              )}
              {canApprove && application.status === 'Pending Approval' && (
                <button
                  onClick={() => router.push(`/applications/${application.application_id}/approve`)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Review & Approve
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete Application
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Application Details</h2>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Permit Type</dt>
                  <dd className="text-sm text-gray-900">{application.permit_type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Entity</dt>
                  <dd className="text-sm text-gray-900">{application.entity_name}</dd>
                </div>
                {application.contact_person && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                    <dd className="text-sm text-gray-900">{application.contact_person}</dd>
                  </div>
                )}
                {application.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">{application.email}</dd>
                  </div>
                )}
                {application.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="text-sm text-gray-900">{application.phone}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created By</dt>
                  <dd className="text-sm text-gray-900">{application.creator_name}</dd>
                </div>
                {application.assessor_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Assessed By</dt>
                    <dd className="text-sm text-gray-900">{application.assessor_name}</dd>
                  </div>
                )}
                {application.approver_name && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Approved By</dt>
                    <dd className="text-sm text-gray-900">{application.approver_name}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(application.created_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Parameters</h2>
              {application.parameters.length === 0 ? (
                <div className="text-sm text-gray-500">No parameters</div>
              ) : (
                <dl className="space-y-2">
                  {application.parameters.map((param, index) => (
                    <div key={index}>
                      <dt className="text-sm font-medium text-gray-500">{param.param_name}</dt>
                      <dd className="text-sm text-gray-900">{param.param_value || '-'}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Assessed Fees</h2>
            {application.assessed_fees.length === 0 ? (
              <div className="text-sm text-gray-500">No fees assessed yet</div>
            ) : (
              <div>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Fee Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Assessed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {application.assessed_fees.map((fee) => (
                      <tr key={fee.assessed_fee_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {fee.category_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {fee.fee_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₱ {parseFloat(fee.assessed_amount.toString()).toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {fee.assessed_by_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-6 py-4 text-sm font-medium text-gray-900">
                        Total
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">
                        ₱ {totalFees.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Transaction Logs</h2>
            <div className="space-y-2">
              {application.audit_trail.length === 0 ? (
                <div className="text-sm text-gray-500">No audit trail entries</div>
              ) : (
                application.audit_trail.map((log) => {
                  // Format amounts in the log details
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
                    <div key={log.log_id} className="border-l-4 border-indigo-500 pl-4 py-2">
                      <div className="text-sm text-gray-900">{formatLogDetails(log.details)}</div>
                      <div className="text-xs text-gray-500">
                        {log.user_name} • {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

