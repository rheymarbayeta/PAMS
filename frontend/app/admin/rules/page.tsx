'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface AssessmentRule {
  rule_id: string;
  permit_type_id: string;
  permit_type_name: string;
  attribute_id: string;
  attribute_name: string;
  rule_name: string;
  description: string | null;
  is_active: boolean;
  fees?: RuleFee[];
}

interface RuleFee {
  rule_fee_id?: string;
  fee_id: string;
  fee_name: string;
  amount: number;
  default_amount?: number;
  is_required: boolean;
  fee_order: number;
  category_name?: string;
}

interface PermitType {
  permit_type_id: string;
  permit_type_name: string;
  attribute_id: string | null;
  attribute_name: string | null;
  is_active: boolean;
}

interface Attribute {
  attribute_id: string;
  attribute_name: string;
  description: string | null;
  is_active: boolean;
}

interface Fee {
  fee_id: string;
  fee_name: string;
  category_name: string;
  default_amount: number;
}

type AutoPopulateResult = 'success' | 'no-rule' | 'error';

export default function RulesPage() {
  const { hasRole } = useAuth();
  const [rules, setRules] = useState<AssessmentRule[]>([]);
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [allFees, setAllFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<AssessmentRule | null>(null);
  const [formData, setFormData] = useState({
    permit_type_id: '',
    attribute_id: '',
    rule_name: '',
    description: '',
    is_active: true,
  });
  const [ruleFees, setRuleFees] = useState<RuleFee[]>([]);
  useEffect(() => {
    fetchRules();
    fetchPermitTypes();
    fetchAttributes();
    fetchAllFees();
  }, []);

  // Auto-populate rule name when both permit type and attribute are selected
  useEffect(() => {
    // Only auto-populate for new rules (not when editing)
    if (formData.permit_type_id && formData.attribute_id && !editingRule) {
      const permitType = permitTypes.find(pt => pt.permit_type_id === formData.permit_type_id);
      const attribute = attributes.find(attr => attr.attribute_id === formData.attribute_id);
      
      if (permitType && attribute) {
        const autoRuleName = `${permitType.permit_type_name} - ${attribute.attribute_name}`;
        // Only auto-populate if rule_name is empty or matches previous auto-generated name
        if (!formData.rule_name || formData.rule_name === autoRuleName || 
            formData.rule_name.startsWith(permitType.permit_type_name + ' - ')) {
          console.log('[Rules] Auto-populating rule name:', autoRuleName);
          setFormData(prev => ({ ...prev, rule_name: autoRuleName }));
        }
      }
    }
  }, [formData.permit_type_id, formData.attribute_id, permitTypes, attributes, editingRule]);

  const fetchRules = async () => {
    console.log('[Rules] Fetching assessment rules...');
    try {
      const response = await api.get('/api/assessment-rules');
      console.log('[Rules] Rules fetched:', response.data.length, 'rules');
      setRules(response.data);
    } catch (error: any) {
      console.error('[Rules] Error fetching rules:', error);
      console.error('[Rules] Error response:', error.response);
      console.error('[Rules] Error status:', error.response?.status);
      console.error('[Rules] Error data:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermitTypes = async () => {
    console.log('[Rules] Fetching permit types...');
    try {
      const response = await api.get('/api/permit-types');
      const activePermitTypes = response.data.filter((pt: PermitType) => pt.is_active);
      console.log('[Rules] Permit types fetched:', activePermitTypes.length, 'active permit types');
      setPermitTypes(activePermitTypes);
    } catch (error: any) {
      console.error('[Rules] Error fetching permit types:', error);
      console.error('[Rules] Error response:', error.response);
      console.error('[Rules] Error status:', error.response?.status);
      console.error('[Rules] Error data:', error.response?.data);
    }
  };

  const fetchAttributes = async () => {
    console.log('[Rules] Fetching active attributes...');
    try {
      const response = await api.get('/api/attributes/active');
      console.log('[Rules] Attributes fetched:', response.data.length, 'attributes');
      setAttributes(response.data);
    } catch (error: any) {
      console.error('[Rules] Error fetching attributes:', error);
      console.error('[Rules] Error response:', error.response);
      console.error('[Rules] Error status:', error.response?.status);
      console.error('[Rules] Error data:', error.response?.data);
    }
  };

  const fetchAllFees = async () => {
    console.log('[Rules] Fetching all fees...');
    try {
      const response = await api.get('/api/fees/charges');
      console.log('[Rules] Fees fetched:', response.data.length, 'fees');
      setAllFees(response.data);
    } catch (error: any) {
      console.error('[Rules] Error fetching fees:', error);
      console.error('[Rules] Error response:', error.response);
      console.error('[Rules] Error status:', error.response?.status);
      console.error('[Rules] Error data:', error.response?.data);
    }
  };

  const fetchRuleWithFees = async (ruleId: string | number) => {
    try {
      const response = await api.get(`/api/assessment-rules/${ruleId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching rule with fees:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Rules] Submitting rule:', { formData, fees: ruleFees });
    try {
      const payload = {
        ...formData,
        permit_type_id: formData.permit_type_id,
        attribute_id: formData.attribute_id,
        fees: ruleFees,
      };

      if (editingRule) {
        console.log('[Rules] Updating rule:', editingRule.rule_id);
        const response = await api.put(`/api/assessment-rules/${editingRule.rule_id}`, payload);
        console.log('[Rules] Rule updated:', response.data);
      } else {
        console.log('[Rules] Creating new rule');
        const response = await api.post('/api/assessment-rules', payload);
        console.log('[Rules] Rule created:', response.data);
      }
      setShowModal(false);
      setEditingRule(null);
      setFormData({ permit_type_id: '', attribute_id: '', rule_name: '', description: '', is_active: true });
      setRuleFees([]);
      fetchRules();
    } catch (error: any) {
      console.error('[Rules] Error saving rule:', error);
      console.error('[Rules] Error response:', error.response);
      console.error('[Rules] Error status:', error.response?.status);
      console.error('[Rules] Error data:', error.response?.data);
      alert(error.response?.data?.error || 'Error saving rule');
    }
  };

  const handleEdit = async (rule: AssessmentRule) => {
    const fullRule = await fetchRuleWithFees(rule.rule_id);
    if (fullRule) {
      setEditingRule(fullRule);
      setFormData({
        permit_type_id: fullRule.permit_type_id.toString(),
        attribute_id: fullRule.attribute_id.toString(),
        rule_name: fullRule.rule_name,
        description: fullRule.description || '',
        is_active: fullRule.is_active,
      });
      setRuleFees(fullRule.fees || []);
      setShowModal(true);
    }
  };

  const handleDelete = async (ruleId: string | number) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/api/assessment-rules/${ruleId}`);
      fetchRules();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting rule');
    }
  };

  const addFee = () => {
    setRuleFees([
      ...ruleFees,
      {
        fee_id: '',
        fee_name: '',
        amount: 0,
        is_required: true,
        fee_order: ruleFees.length,
      },
    ]);
  };

  const removeFee = (index: number) => {
    setRuleFees(ruleFees.filter((_, i) => i !== index).map((fee, i) => ({ ...fee, fee_order: i })));
  };

  const updateFee = (index: number, field: keyof RuleFee, value: any) => {
    const updated = [...ruleFees];
    updated[index] = { ...updated[index], [field]: value };
    
    // If fee_id changed, update fee_name, default_amount, and amount
    if (field === 'fee_id') {
      const feeIdToMatch = typeof value === 'string' ? value : String(value);
      const selectedFee = allFees.find(f => String(f.fee_id) === feeIdToMatch);
      if (selectedFee) {
        updated[index].fee_name = selectedFee.fee_name;
        updated[index].default_amount = selectedFee.default_amount;
        updated[index].amount = selectedFee.default_amount; // Auto-populate with default amount
        console.log('[Rules] Fee selected - auto-populating amount:', selectedFee.default_amount);
      }
    }
    
    setRuleFees(updated);
  };

  const handlePermitTypeChange = (permitTypeId: string) => {
    console.log('[Rules] Permit type changed to:', permitTypeId);
    setFormData({ ...formData, permit_type_id: permitTypeId, attribute_id: '', rule_name: '' });
    console.log('[Rules] Form data updated, attribute_id and rule_name reset');
  };

  const handleAttributeChange = (attributeId: string) => {
    console.log('[Rules] Attribute changed to:', attributeId);
    setFormData({ ...formData, attribute_id: attributeId });
    console.log('[Rules] Form data updated');
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading rules...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Assessment Rule Management
                </h1>
                <p className="text-gray-500 mt-1">Configure fee rules for permit types</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingRule(null);
                setFormData({ permit_type_id: '', attribute_id: '', rule_name: '', description: '', is_active: true });
                setRuleFees([]);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rule
            </button>
          </div>

          {/* Table */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Permit Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Attribute
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Rule Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fees Count
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {rules.map((rule) => (
                  <tr key={rule.rule_id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{rule.permit_type_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {rule.attribute_name ? (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium">
                          {rule.attribute_name}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{rule.rule_name}</div>
                      {rule.description && (
                        <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{rule.description}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {rule.fees?.length || 0} fee(s)
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          rule.is_active
                            ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20'
                            : 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
                        }`}
                      >
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          title="Edit rule"
                          onClick={() => handleEdit(rule)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {hasRole('SuperAdmin') && (
                          <button
                            title="Delete rule"
                            onClick={() => handleDelete(rule.rule_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rules.length === 0 && (
              <div className="px-6 py-12 text-center">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-gray-500">No rules found. Click "Add Rule" to create one.</p>
              </div>
            )}
          </div>

          {/* Rule Form Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
              <div className="relative w-full max-w-3xl mx-4 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white">
                    {editingRule ? 'Edit Assessment Rule' : 'Add Assessment Rule'}
                  </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Permit Type *
                      </label>
                      <select
                        required
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        value={formData.permit_type_id}
                        onChange={(e) => handlePermitTypeChange(e.target.value)}
                        aria-label="Select permit type"
                      >
                        <option value="">Select Permit Type</option>
                        {permitTypes.map((pt) => (
                          <option key={pt.permit_type_id} value={pt.permit_type_id}>
                            {pt.permit_type_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Attribute *
                      </label>
                      <select
                        required
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        value={formData.attribute_id}
                        onChange={(e) => handleAttributeChange(e.target.value)}
                        aria-label="Select attribute"
                      >
                        <option value="">Select Attribute</option>
                        {attributes.map((attr) => (
                          <option key={attr.attribute_id} value={attr.attribute_id}>
                            {attr.attribute_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rule Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={formData.rule_name}
                      onChange={(e) =>
                        setFormData({ ...formData, rule_name: e.target.value })
                      }
                      placeholder="e.g., Mayor's Permit - Cellsite Rule"
                      aria-label="Rule name"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      aria-label="Rule description"
                    />
                  </div>

                  <div className="mb-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.checked })
                        }
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="mb-5">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Fees *
                      </label>
                      <button
                        type="button"
                        onClick={addFee}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Fee
                      </button>
                    </div>
                    {ruleFees.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-gray-500">No fees added. Click "Add Fee" to add fees.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ruleFees.map((fee, index) => (
                          <div key={index} className="flex gap-2 items-center p-4 bg-gray-50/50 border border-gray-200 rounded-xl hover:bg-gray-100/50 transition-colors duration-150">
                            <select
                              required
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                              value={fee.fee_id || ''}
                              onChange={(e) => updateFee(index, 'fee_id', e.target.value)}
                              aria-label={`Select fee for row ${index + 1}`}
                            >
                              <option value="">Select Fee</option>
                              {allFees.map((f) => (
                                <option key={f.fee_id} value={f.fee_id}>
                                  {f.category_name} - {f.fee_name}
                                </option>
                              ))}
                            </select>
                            <div className="w-40">
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₱</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  className="w-full bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                                  placeholder="0.00"
                                  value={fee.amount}
                                  onChange={(e) =>
                                    updateFee(index, 'amount', parseFloat(e.target.value) || 0)
                                  }
                                  aria-label={`Fee amount for row ${index + 1}`}
                                />
                              </div>
                              {fee.default_amount !== undefined && fee.default_amount !== fee.amount && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Default: ₱{fee.default_amount.toFixed(2)}
                                </div>
                              )}
                            </div>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={fee.is_required}
                                onChange={(e) => updateFee(index, 'is_required', e.target.checked)}
                              />
                              <span className="text-xs text-gray-600 font-medium">Req</span>
                            </label>
                            <button
                              type="button"
                              title="Remove fee"
                              onClick={() => removeFee(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingRule(null);
                        setRuleFees([]);
                      }}
                      className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200"
                    >
                      {editingRule ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

