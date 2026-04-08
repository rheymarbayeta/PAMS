'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface QuantityFeeConfig {
  quantity_fee_id: string;
  rule_id: string;
  is_enabled: number;
  quantity_label: string;
  quantity_description: string;
  base_rate: number;
  base_rate_label: string;
  rate_formula: string | null;
  additional_charges: { charge_name: string; amount: number }[];
  min_quantity: number;
  max_quantity: number;
}

interface AssessmentRule {
  rule_id: string;
  rule_name: string;
  permit_type_id: string;
  attribute_id: string;
}

export default function QuantityFeeConfigPage() {
  const params = useParams();
  const ruleId = params.ruleId as string;

  const [rule, setRule] = useState<AssessmentRule | null>(null);
  const [config, setConfig] = useState<QuantityFeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    is_enabled: 1,
    quantity_label: '',
    quantity_description: '',
    base_rate: 0,
    base_rate_label: '',
    rate_formula: '',
    additional_charges: [] as { charge_name: string; amount: number }[],
    min_quantity: 1,
    max_quantity: 999
  });

  useEffect(() => {
    fetchData();
  }, [ruleId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ruleRes, configRes] = await Promise.all([
        api.get(`/api/assessment-rules/${ruleId}`),
        api.get(`/api/assessment-rules/${ruleId}/quantity-fee`).catch(() => null)
      ]);

      setRule(ruleRes.data);

      if (configRes && configRes.data) {
        setConfig(configRes.data);
        setFormData({
          is_enabled: configRes.data.is_enabled,
          quantity_label: configRes.data.quantity_label,
          quantity_description: configRes.data.quantity_description || '',
          base_rate: configRes.data.base_rate,
          base_rate_label: configRes.data.base_rate_label || '',
          rate_formula: configRes.data.rate_formula || '',
          additional_charges: configRes.data.additional_charges || [],
          min_quantity: configRes.data.min_quantity || 1,
          max_quantity: configRes.data.max_quantity || 999
        });
      }
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCharge = () => {
    setFormData({
      ...formData,
      additional_charges: [
        ...formData.additional_charges,
        { charge_name: '', amount: 0 }
      ]
    });
  };

  const handleRemoveCharge = (index: number) => {
    setFormData({
      ...formData,
      additional_charges: formData.additional_charges.filter((_, i) => i !== index)
    });
  };

  const handleChargeChange = (index: number, field: string, value: any) => {
    const updated = [...formData.additional_charges];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, additional_charges: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.post(`/api/quantity-fees`, {
        rule_id: ruleId,
        ...formData
      });

      setSuccess('Quantity fee configuration saved successfully!');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quantity-Based Fee Configuration</h1>
          <p className="text-gray-500 mt-2">{rule?.rule_name}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Enable/Disable */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.is_enabled === 1}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked ? 1 : 0 })}
                className="w-5 h-5"
              />
              <span className="text-sm font-medium text-gray-700">Enable Quantity-Based Fee Calculation</span>
            </label>
          </div>

          {formData.is_enabled === 1 && (
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity Label *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Days, Units, Machines"
                    value={formData.quantity_label}
                    onChange={(e) => setFormData({ ...formData, quantity_label: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Rate Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., per day, per unit"
                    value={formData.base_rate_label}
                    onChange={(e) => setFormData({ ...formData, base_rate_label: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  placeholder="Description shown to assessor during assessment"
                  value={formData.quantity_description}
                  onChange={(e) => setFormData({ ...formData, quantity_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Fee Calculation */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Calculation</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Rate (₱) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_rate}
                      onChange={(e) => setFormData({ ...formData, base_rate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Multiplied by quantity</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Formula (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., {qty} * 500 + 50"
                      value={formData.rate_formula}
                      onChange={(e) => setFormData({ ...formData, rate_formula: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use {'{qty}'} as quantity placeholder</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({ ...formData, min_quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.max_quantity}
                      onChange={(e) => setFormData({ ...formData, max_quantity: parseInt(e.target.value) || 999 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Charges */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Additional Fixed Charges</h3>
                  <button
                    type="button"
                    onClick={handleAddCharge}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    + Add Charge
                  </button>
                </div>

                {formData.additional_charges.length === 0 ? (
                  <p className="text-gray-500 text-sm">No additional charges configured</p>
                ) : (
                  <div className="space-y-3">
                    {formData.additional_charges.map((charge, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          placeholder="Charge name (e.g., Computer Fee)"
                          value={charge.charge_name}
                          onChange={(e) => handleChargeChange(index, 'charge_name', e.target.value)}
                          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={charge.amount}
                          onChange={(e) => handleChargeChange(index, 'amount', parseFloat(e.target.value) || 0)}
                          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCharge(index)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Example */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Example Calculation</h4>
                <p className="text-sm text-blue-800">
                  If quantity is 5: (5 × ₱{formData.base_rate.toFixed(2)})
                  {formData.additional_charges.length > 0 &&
                    ` + ${formData.additional_charges.map(c => `₱${c.amount.toFixed(2)}`).join(' + ')}`
                  } = ₱
                  {(
                    5 * formData.base_rate +
                    formData.additional_charges.reduce((sum, c) => sum + c.amount, 0)
                  ).toFixed(2)}
                </p>
              </div>
            </>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
