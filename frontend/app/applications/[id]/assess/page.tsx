'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Fee {
  fee_id: string;
  fee_name: string;
  category_name: string;
  default_amount: number;
}

interface AssessedFee {
  assessed_fee_id: string;
  fee_id: string;
  fee_name: string;
  category_name: string;
  assessed_amount: number;
}

interface Application {
  application_id: string;
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

  // Format currency with Philippine Peso symbol
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const [application, setApplication] = useState<Application | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFee, setSelectedFee] = useState<string>('');
  const [assessedAmount, setAssessedAmount] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [autoNotice, setAutoNotice] = useState<{ type: NoticeType; message: string } | null>(null);
  const autoPopulateAttemptedRef = useRef(false);

  // Searchable fee dropdown state
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [isFeeDropdownOpen, setIsFeeDropdownOpen] = useState(false);
  const feeDropdownRef = useRef<HTMLDivElement>(null);
  const feeInputRef = useRef<HTMLInputElement>(null);

  // Filter fees based on search query
  const filteredFees = fees.filter((fee) => {
    const searchLower = feeSearchQuery.toLowerCase();
    return (
      fee.fee_name.toLowerCase().includes(searchLower) ||
      fee.category_name.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (feeDropdownRef.current && !feeDropdownRef.current.contains(event.target as Node)) {
        setIsFeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle fee selection
  const handleFeeSelect = useCallback((fee: Fee) => {
    setSelectedFee(fee.fee_id);
    const amount = typeof fee.default_amount === 'number' 
      ? fee.default_amount 
      : parseFloat(fee.default_amount || '0');
    setAssessedAmount(amount.toString());
    setQuantity('1');
    setFeeSearchQuery(`${fee.category_name} - ${fee.fee_name}`);
    setIsFeeDropdownOpen(false);
  }, []);

  // Clear fee selection
  const handleClearFee = useCallback(() => {
    setSelectedFee('');
    setAssessedAmount('');
    setQuantity('1');
    setFeeSearchQuery('');
    feeInputRef.current?.focus();
  }, []);

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
    if (!selectedFee || !assessedAmount || !quantity) {
      alert('Please select a fee, enter an amount, and quantity');
      return;
    }

    const quantityNum = parseFloat(quantity);
    if (quantityNum <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    try {
      const totalAmount = parseFloat(assessedAmount) * quantityNum;
      await api.post(`/api/applications/${params.id}/fees`, {
        fee_id: selectedFee,
        assessed_amount: totalAmount,
      });
      // Reset all form fields including search query
      setSelectedFee('');
      setAssessedAmount('');
      setQuantity('1');
      setFeeSearchQuery('');
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
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
              <p className="text-red-600">You do not have permission to assess applications.</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading application...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!application || application.status !== 'Pending') {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-amber-800 mb-2">Cannot Assess Application</h3>
              <p className="text-amber-600">This application cannot be assessed in its current status.</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const selectedFeeData = selectedFee 
    ? fees.find((f) => f.fee_id === selectedFee)
    : null;
  const totalAssessed = application.assessed_fees.reduce(
    (sum, fee) => sum + parseFloat(fee.assessed_amount.toString()),
    0
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Assess Application
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {application.application_number || `Application #${application.application_id}`}
                </p>
              </div>
            </div>
          </div>

          {autoNotice && (
            <div
              className={`mb-6 rounded-xl border px-5 py-4 text-sm flex items-center gap-3 shadow-sm transition-all duration-300 ${getNoticeClasses(
                autoNotice.type
              )}`}
            >
              {autoNotice.type === 'success' && (
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {autoNotice.type === 'warning' && (
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {autoNotice.type === 'error' && (
                <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {autoNotice.type === 'info' && (
                <svg className="h-5 w-5 flex-shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span className="font-medium">{autoNotice.message}</span>
            </div>
          )}

          {/* Add Fee Card */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl p-6 mb-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center gap-2 mb-5">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Add Fee</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
              <div className="space-y-2">
                <label htmlFor="fee_select" className="block text-sm font-medium text-gray-700">
                  Select Fee
                </label>
                <div className="relative" ref={feeDropdownRef}>
                  <div className="relative">
                    <input
                      ref={feeInputRef}
                      type="text"
                      id="fee_select"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                      placeholder="Search for a fee..."
                      value={feeSearchQuery}
                      onChange={(e) => {
                        setFeeSearchQuery(e.target.value);
                        setIsFeeDropdownOpen(true);
                        if (selectedFee) {
                          setSelectedFee('');
                          setAssessedAmount('');
                        }
                      }}
                      onFocus={() => setIsFeeDropdownOpen(true)}
                    />
                    {selectedFee ? (
                      <button
                        type="button"
                        onClick={handleClearFee}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear selection"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {isFeeDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                      {filteredFees.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                          No fees found matching &quot;{feeSearchQuery}&quot;
                        </div>
                      ) : (
                        filteredFees.map((fee) => {
                          const amount = typeof fee.default_amount === 'number' 
                            ? fee.default_amount 
                            : parseFloat(fee.default_amount || '0');
                          return (
                            <button
                              key={fee.fee_id}
                              type="button"
                              className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between group ${
                                selectedFee === fee.fee_id ? 'bg-indigo-50' : ''
                              }`}
                              onClick={() => handleFeeSelect(fee)}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    {fee.category_name}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                                  {fee.fee_name}
                                </p>
                              </div>
                              <div className="ml-3 flex-shrink-0">
                                <span className="text-sm font-semibold text-indigo-600">
                                  {formatCurrency(amount)}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Unit Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    value={assessedAmount}
                    onChange={(e) => setAssessedAmount(e.target.value)}
                    placeholder={selectedFeeData?.default_amount.toString() || '0.00'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Total Amount
                </label>
                <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center">
                  <span className="text-indigo-700 font-semibold text-lg">
                    {assessedAmount && quantity 
                      ? formatCurrency(parseFloat(assessedAmount) * parseFloat(quantity)) 
                      : formatCurrency(0)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleAddFee}
                disabled={!selectedFee || !assessedAmount}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Fee
              </button>
            </div>
          </div>

          {/* Assessed Fees Card */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl p-6 mb-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Assessed Fees</h2>
              </div>
              {application.assessed_fees.length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                  {application.assessed_fees.length} {application.assessed_fees.length === 1 ? 'fee' : 'fees'}
                </span>
              )}
            </div>
            {application.assessed_fees.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">No fees added yet</p>
                <p className="text-gray-400 text-sm mt-1">Add fees using the form above</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Fee Name
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {application.assessed_fees.map((fee, index) => (
                      <tr key={fee.assessed_fee_id} className={`hover:bg-gray-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {fee.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {fee.fee_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          {formatCurrency(parseFloat(fee.assessed_amount.toString()))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
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
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-100">
                      <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900">
                        Grand Total
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                          {formatCurrency(totalAssessed)}
                        </span>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 focus:ring-4 focus:ring-gray-100 transition-all duration-200"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Cancel
            </button>
            <button
              onClick={handleSubmitAssessment}
              disabled={submitting || application.assessed_fees.length === 0}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 focus:ring-4 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-emerald-200"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit for Approval
                </>
              )}
            </button>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

