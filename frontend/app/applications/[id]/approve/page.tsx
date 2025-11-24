'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface AssessedFee {
  assessed_fee_id: number;
  fee_id: number;
  fee_name: string;
  category_name: string;
  assessed_amount: number;
}

interface Application {
  application_id: number;
  application_number: string | null;
  status: string;
  assessed_fees: AssessedFee[];
}

export default function ApproveApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editingFee, setEditingFee] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  useEffect(() => {
    fetchApplication();
  }, [params.id]);

  const fetchApplication = async () => {
    try {
      const response = await api.get(`/api/applications/${params.id}`);
      setApplication(response.data);
    } catch (error) {
      console.error('Error fetching application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFee = (fee: AssessedFee) => {
    setEditingFee(fee.assessed_fee_id);
    setEditAmount(fee.assessed_amount.toString());
  };

  const handleSaveFee = async (feeId: number) => {
    try {
      await api.put(`/api/applications/${params.id}/fees/${feeId}`, {
        assessed_amount: parseFloat(editAmount),
      });
      setEditingFee(null);
      setEditAmount('');
      fetchApplication();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error updating fee');
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this application?')) return;

    setSubmitting(true);
    try {
      await api.put(`/api/applications/${params.id}/approve`);
      alert('Application approved successfully!');
      router.push(`/applications/${params.id}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error approving application');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/api/applications/${params.id}/reject`, { reason: rejectReason });
      alert('Application rejected');
      router.push(`/applications/${params.id}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error rejecting application');
    } finally {
      setSubmitting(false);
      setShowRejectModal(false);
      setRejectReason('');
    }
  };

  const canApprove = user && ['SuperAdmin', 'Admin', 'Approver'].includes(user.role_name);

  if (!canApprove) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-red-600">You do not have permission to approve applications.</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div>Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!application || application.status !== 'Pending Approval') {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-red-600">This application is not pending approval.</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const totalAssessed = application.assessed_fees.reduce(
    (sum, fee) => sum + parseFloat(fee.assessed_amount.toString()),
    0
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Review & Approve Application {application.application_number || `#${application.application_id}`}
          </h1>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Assessed Fees</h2>
            {application.assessed_fees.length === 0 ? (
              <div className="text-sm text-gray-500">No fees assessed</div>
            ) : (
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
                      Actions
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
                        {editingFee === fee.assessed_fee_id ? (
                          <input
                            type="number"
                            step="0.01"
                            className="w-24 border border-gray-300 rounded-md px-2 py-1"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                          />
                        ) : (
                          `$${parseFloat(fee.assessed_amount.toString()).toFixed(2)}`
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingFee === fee.assessed_fee_id ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleSaveFee(fee.assessed_fee_id)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingFee(null);
                                setEditAmount('');
                              }}
                              className="text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditFee(fee)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            Edit
                          </button>
                        )}
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
                      ${totalAssessed.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setShowRejectModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Approving...' : 'Approve Application'}
            </button>
          </div>

          {showRejectModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-bold mb-4">Reject Application</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection *
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={submitting || !rejectReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting ? 'Rejecting...' : 'Confirm Reject'}
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

