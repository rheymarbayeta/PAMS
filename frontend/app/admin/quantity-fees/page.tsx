'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import Link from 'next/link';
import { showAlert, showConfirm } from '@/utils/modal';

interface AssessmentRule {
  rule_id: string;
  permit_type_name: string;
  attribute_name: string;
  rule_name: string;
}

interface RuleFee {
  fee_id: string;
  fee_name: string;
  amount: number;
}

interface QuantityFeeConfig {
  quantity_fee_id: string;
  rule_id: string;
  selected_fee_id: string;
  selected_fee_name?: string;
  selected_fee_amount?: number;
  is_enabled: boolean;
  quantity_label: string;
  quantity_description?: string;
  additional_charges?: Array<{ fee_id: string; charge_name: string; amount: number }>;
  min_quantity: number;
  max_quantity: number;
}

export default function QuantityFeesPage() {
  const [rules, setRules] = useState<AssessmentRule[]>([]);
  const [ruleFees, setRuleFees] = useState<Map<string, RuleFee[]>>(new Map());
  const [configs, setConfigs] = useState<Map<string, QuantityFeeConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    selected_fee_id: '',
    quantity_label: '',
    quantity_description: '',
    min_quantity: '1',
    max_quantity: '999',
    is_enabled: true,
    additional_charges: [] as any[]
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/assessment-rules');
      setRules(response.data || []);
      
      // Fetch fees and quantity configs for each rule
      const feesMap = new Map<string, RuleFee[]>();
      const configsMap = new Map<string, QuantityFeeConfig>();

      for (const rule of response.data || []) {
        // Fetch fees for this rule
        try {
          const feesRes = await api.get(`/api/assessment-rules/${rule.rule_id}/fees`);
          if (feesRes.data) {
            // Convert amounts to numbers
            const fees = feesRes.data.map((fee: any) => ({
              ...fee,
              amount: parseFloat(fee.amount) || 0
            }));
            feesMap.set(rule.rule_id, fees);
          }
        } catch (err) {
          console.error(`Error fetching fees for rule ${rule.rule_id}:`, err);
        }

        // Fetch quantity config for this rule
        try {
          const configRes = await api.get(`/api/quantity-fees/assessment-rules/${rule.rule_id}/quantity-fee`);
          if (configRes.data) {
            configsMap.set(rule.rule_id, configRes.data);
          }
        } catch (err) {
          // 404 is expected if no config exists
          if ((err as any).response?.status !== 404) {
            console.error(`Error fetching quantity config for rule ${rule.rule_id}:`, err);
          }
        }
      }

      setRuleFees(feesMap);
      setConfigs(configsMap);
    } catch (error: any) {
      console.error('Error fetching rules:', error);
      alert('Error loading assessment rules');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRule = (ruleId: string) => {
    setSelectedRule(ruleId);
    const existingConfig = configs.get(ruleId);

    if (existingConfig) {
      setFormData({
        selected_fee_id: existingConfig.selected_fee_id,
        quantity_label: existingConfig.quantity_label,
        quantity_description: existingConfig.quantity_description || '',
        min_quantity: existingConfig.min_quantity.toString(),
        max_quantity: existingConfig.max_quantity.toString(),
        is_enabled: existingConfig.is_enabled,
        additional_charges: existingConfig.additional_charges || []
      });
    } else {
      setFormData({
        selected_fee_id: '',
        quantity_label: '',
        quantity_description: '',
        min_quantity: '1',
        max_quantity: '999',
        is_enabled: true,
        additional_charges: []
      });
    }

    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRule || !formData.selected_fee_id || !formData.quantity_label) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);

      // Filter additional_charges to exclude the selected fee
      const filteredCharges = formData.additional_charges.filter(
        charge => charge.fee_id !== formData.selected_fee_id
      );

      const payload = {
        rule_id: selectedRule,
        selected_fee_id: formData.selected_fee_id,
        quantity_label: formData.quantity_label,
        quantity_description: formData.quantity_description,
        min_quantity: parseInt(formData.min_quantity) || 1,
        max_quantity: parseInt(formData.max_quantity) || 999,
        is_enabled: formData.is_enabled,
        additional_charges: filteredCharges.length > 0 ? filteredCharges : null
      };

      await api.post('/api/quantity-fees', payload);

      // Re-fetch configs
      const configRes = await api.get(`/api/quantity-fees/assessment-rules/${selectedRule}/quantity-fee`);
      const newConfigs = new Map(configs);
      newConfigs.set(selectedRule, configRes.data);
      setConfigs(newConfigs);

      showAlert('Quantity fee configuration saved successfully', 'Success');
      setShowModal(false);
    } catch (error: any) {
      showAlert(error.response?.data?.error || 'Error saving configuration', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    showConfirm(
      'Are you sure you want to delete this quantity fee configuration?',
      'Confirm Delete',
      async () => {
        try {
          await api.delete(`/api/quantity-fees/${ruleId}`);
          const newConfigs = new Map(configs);
          newConfigs.delete(ruleId);
          setConfigs(newConfigs);
          showAlert('Configuration deleted successfully', 'Success');
        } catch (error: any) {
          showAlert(error.response?.data?.error || 'Error deleting configuration', 'Error');
        }
      },
      undefined,
      { isDangerous: true }
    );
  };

  const ruleList = rules.filter(r => ruleFees.has(r.rule_id) && ruleFees.get(r.rule_id)!.length > 0);
  const fees = selectedRule ? ruleFees.get(selectedRule) || [] : [];
  const selectedFeeInfo = fees.find(f => f.fee_id === formData.selected_fee_id);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 mt-2">Quantity-Based Fee Configuration</h1>
              <p className="text-gray-600 mt-1">Configure assessment rules to use quantity-based pricing</p>
            </div>

            {/* Rules List */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="divide-y">
                {ruleList.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No assessment rules with fees found
                  </div>
                ) : (
                  ruleList.map((rule) => {
                    const config = configs.get(rule.rule_id);
                    return (
                      <div key={rule.rule_id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{rule.rule_name}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {rule.permit_type_name} → {rule.attribute_name}
                            </p>
                            {config && (
                              <div className="mt-2 text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  ✓ Configured
                                </span>
                                <span className="ml-2 text-gray-600">
                                  {config.quantity_label} ({config.min_quantity}-{config.max_quantity})
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEditRule(rule.rule_id)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                            >
                              {config ? 'Edit' : 'Configure'}
                            </button>
                            {config && (
                              <button
                                onClick={() => handleDelete(rule.rule_id)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
                    <h2 className="text-2xl font-bold">Quantity Fee Configuration</h2>
                  </div>

                  <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Selected Fee */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Base Fee * <span className="text-xs text-gray-500">(Will be multiplied by quantity)</span>
                      </label>
                      <select
                        value={formData.selected_fee_id}
                        onChange={(e) => setFormData({ ...formData, selected_fee_id: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      >
                        <option value="">-- Select a fee --</option>
                        {fees.map((fee) => (
                          <option key={fee.fee_id} value={fee.fee_id}>
                            {fee.fee_name} (₱{fee.amount.toFixed(2)})
                          </option>
                        ))}
                      </select>
                      {selectedFeeInfo && (
                        <p className="text-sm text-indigo-600 mt-1">
                          Example: 5 × ₱{selectedFeeInfo.amount.toFixed(2)} = ₱{(5 * selectedFeeInfo.amount).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Quantity Label */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity Label * <span className="text-xs text-gray-500">e.g., Days, Units, Machine</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Days, Units"
                        value={formData.quantity_label}
                        onChange={(e) => setFormData({ ...formData, quantity_label: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-xs text-gray-500">(Optional - shown to assessor)</span>
                      </label>
                      <textarea
                        placeholder="e.g., Enter the number of days the permit is needed for"
                        value={formData.quantity_description}
                        onChange={(e) => setFormData({ ...formData, quantity_description: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>

                    {/* Min/Max Quantity */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.min_quantity}
                          onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={formData.max_quantity}
                          onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Additional Charges */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Additional Charges <span className="text-xs text-gray-500">(Fixed charges not multiplied by quantity)</span>
                      </label>
                      <p className="text-xs text-gray-600 mb-3">
                        Select which other fees should be added as fixed charges (not based on quantity):
                      </p>
                      {fees.length === 0 ? (
                        <p className="text-sm text-gray-500">No fees available</p>
                      ) : (
                        <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                          {fees.map((fee) => {
                            const isSelected = fee.fee_id === formData.selected_fee_id;
                            const isChecked = formData.additional_charges.some(c => c.fee_id === fee.fee_id);
                            return (
                              <div key={fee.fee_id} className="flex items-center gap-3 p-2 bg-white rounded border border-gray-100">
                                <input
                                  type="checkbox"
                                  checked={isChecked && !isSelected}
                                  disabled={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        additional_charges: [
                                          ...formData.additional_charges,
                                          {
                                            fee_id: fee.fee_id,
                                            charge_name: fee.fee_name,
                                            amount: fee.amount
                                          }
                                        ]
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        additional_charges: formData.additional_charges.filter(c => c.fee_id !== fee.fee_id)
                                      });
                                    }
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {fee.fee_name}
                                    {isSelected && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">(Base Fee)</span>}
                                  </p>
                                  <p className="text-xs text-gray-600">₱{(typeof fee.amount === 'number' ? fee.amount : parseFloat(fee.amount || '0')).toFixed(2)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_enabled"
                        checked={formData.is_enabled}
                        onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <label htmlFor="is_enabled" className="text-sm font-medium text-gray-700">
                        Enable Quantity-Based Fees
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Configuration'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
