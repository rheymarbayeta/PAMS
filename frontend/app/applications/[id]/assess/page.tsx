'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Fee {
  fee_id: number;
  fee_name: string;
  category_name: string;
  default_amount: number;
}

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
  permit_type: string;
  status: string;
  assessed_fees: AssessedFee[];
}

interface PermitTypeOption {
  permit_type_id: number;
  permit_type_name: string;
  attribute_id: number | null;
  attribute_name: string | null;
  is_active?: boolean;
}

interface RuleFeeDefinition {
  fee_id: number;
  fee_name: string;
  amount?: number;
  default_amount?: number;
}

type AutoPopulateResult = 'success' | 'no-rule' | 'error';

type NoticeType = 'info' | 'success' | 'warning' | 'error';

export default function AssessApplicationPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFee, setSelectedFee] = useState<number | ''>('');
  const [assessedAmount, setAssessedAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoNotice, setAutoNotice] = useState<{ type: NoticeType; message: string } | null>(null);
  const autoPopulateAttemptedRef = useRef(false);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const autoPopulateFees = async (
    app: Application,
    availablePermitTypes: PermitTypeOption[]
  ): Promise<AutoPopulateResult> => {
    try {
      if (!availablePermitTypes.length) {
        console.warn('[Assess] No permit types available for auto population');
        return 'error';
      }

      const permitType = availablePermitTypes.find(
        (pt) => pt.permit_type_name === app.permit_type
      );

      if (!permitType) {
        console.warn('[Assess] No matching permit type found for', app.permit_type);
        return 'no-rule';
      }

      if (!permitType.attribute_id) {
        console.warn('[Assess] Permit type has no attribute assigned');
        return 'no-rule';
      }

      const ruleResponse = await api.get(`/api/assessment-rules/lookup/${permitType.permit_type_id}/${permitType.attribute_id}`);
      const ruleFees: RuleFeeDefinition[] = ruleResponse.data?.fees || [];

      if (!ruleFees.length) {
        console.warn('[Assess] No fees found for matching assessment rule');
        return 'no-rule';
      }

      for (const fee of ruleFees) {
        const normalizedAmount =
          typeof fee.amount === 'number'
            ? fee.amount
            : fee.amount
            ? parseFloat(String(fee.amount))
            : fee.default_amount
            ? typeof fee.default_amount === 'number'
              ? fee.default_amount
              : parseFloat(String(fee.default_amount))
            : 0;

        const amount = Number.isNaN(normalizedAmount) ? 0 : Number(parseFloat(String(normalizedAmount)).toFixed(2));

        await api.post(`/api/applications/${app.application_id}/fees`, {
          fee_id: fee.fee_id,
          assessed_amount: amount,
        });
      }

      return 'success';
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.warn('[Assess] No assessment rule found for this permit/attribute combination');
        return 'no-rule';
      }
      console.error('[Assess] Error auto-populating fees:', error);
      return 'error';
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setAutoNotice(null);
    try {
      const [appResponse, feesResponse, permitTypesResponse] = await Promise.all([
        api.get(`/api/applications/${params.id}`),
        api.get('/api/fees/charges'),
        api.get('/api/permit-types'),
      ]);

      let appData: Application = appResponse.data;
      const permitTypeData: PermitTypeOption[] = permitTypesResponse.data || [];

      if (!autoPopulateAttemptedRef.current && appData.assessed_fees.length === 0) {
        autoPopulateAttemptedRef.current = true;
        setAutoNotice({
          type: 'info',
          message: 'Loading default fees based on the assessment rule...',
        });
        const result = await autoPopulateFees(appData, permitTypeData);
        if (result === 'success') {
          const refreshedApp = await api.get(`/api/applications/${params.id}`);
          appData = refreshedApp.data;
          setAutoNotice({
            type: 'success',
            message: 'Default fees were automatically applied based on the assessment rule.',
          });
        } else if (result === 'no-rule') {
          setAutoNotice({
            type: 'warning',
            message: 'No matching assessment rule was found. Please add fees manually.',
          });
        } else {
          setAutoNotice({
            type: 'error',
            message: 'Unable to auto-populate fees. Please add fees manually.',
          });
        }
      }

      setApplication(appData);
      setFees(feesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAutoNotice({
        type: 'error',
        message: 'Failed to load application details. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddFee = async () => {
    if (selectedFee === '' || !assessedAmount) {
      alert('Please select a fee and enter an amount');
      return;
    }

    try {
      await api.post(`/api/applications/${params.id}/fees`, {
        fee_id: typeof selectedFee === 'number' ? selectedFee : parseInt(selectedFee),
        assessed_amount: parseFloat(assessedAmount),
      });
      setSelectedFee('');
      setAssessedAmount('');
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error adding fee');
    }
  };

  const handleSubmitAssessment = async () => {
    if (!confirm('Submit this assessment for approval?')) return;

    setSubmitting(true);
    try {
      await api.put(`/api/applications/${params.id}/assess`);
      alert('Assessment submitted successfully!');
      router.push(`/applications/${params.id}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error submitting assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const canAssess = user && ['SuperAdmin', 'Admin', 'Assessor'].includes(user.role_name);

  const getNoticeClasses = (type: NoticeType) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!canAssess) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-red-600">You do not have permission to assess applications.</div>
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

  if (!application || application.status !== 'Pending') {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-red-600">This application cannot be assessed in its current status.</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const selectedFeeData = selectedFee !== '' 
    ? fees.find((f) => f.fee_id === (typeof selectedFee === 'number' ? selectedFee : parseInt(selectedFee)))
    : null;
  const totalAssessed = application.assessed_fees.reduce(
    (sum, fee) => sum + parseFloat(fee.assessed_amount.toString()),
    0
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Assess Application {application.application_number || `#${application.application_id}`}
          </h1>

          {autoNotice && (
            <div
              className={`mb-6 rounded-md border px-4 py-3 text-sm ${getNoticeClasses(
                autoNotice.type
              )}`}
            >
              {autoNotice.message}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Add Fee</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label htmlFor="fee_select" className="block text-sm font-medium text-gray-700 mb-2">
                  Select Fee
                </label>
                <select
                  id="fee_select"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={selectedFee === '' ? '' : selectedFee.toString()}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedFee(value === '' ? '' : parseInt(value));
                    const fee = fees.find((f) => f.fee_id === parseInt(value));
                    if (fee) {
                      const amount = typeof fee.default_amount === 'number' 
                        ? fee.default_amount 
                        : parseFloat(fee.default_amount || '0');
                      setAssessedAmount(amount.toString());
                    }
                  }}
                >
                  <option value="">Select a fee</option>
                  {fees.map((fee) => {
                    const amount = typeof fee.default_amount === 'number' 
                      ? fee.default_amount 
                      : parseFloat(fee.default_amount || '0');
                    return (
                      <option key={fee.fee_id} value={fee.fee_id.toString()}>
                        {fee.category_name} - {fee.fee_name} (${amount.toFixed(2)})
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessed Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  value={assessedAmount}
                  onChange={(e) => setAssessedAmount(e.target.value)}
                  placeholder={selectedFeeData?.default_amount.toString()}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddFee}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Add Fee
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Assessed Fees</h2>
            {application.assessed_fees.length === 0 ? (
              <div className="text-sm text-gray-500">No fees added yet</div>
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
                        ${parseFloat(fee.assessed_amount.toString()).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={async () => {
                            if (!confirm('Remove this fee?')) return;
                            try {
                              await api.delete(`/api/applications/${params.id}/fees/${fee.assessed_fee_id}`);
                              fetchData();
                            } catch (error: any) {
                              alert(error.response?.data?.error || 'Error removing fee');
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
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
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitAssessment}
              disabled={submitting || application.assessed_fees.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

