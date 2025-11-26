'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import Link from 'next/link';

interface Attribute {
  attribute_id: string;
  attribute_name: string;
  description: string;
  is_active: boolean;
}

interface PermitType {
  permit_type_id: string;
  permit_type_name: string;
  attribute_id: string;
  attribute_name: string;
}

interface DisplayCondition {
  id: string;
  condition_type: 'attribute_name' | 'permit_type_name' | 'attribute_id';
  condition_value: string;
  display_mode: 'table_with_quantity' | 'table_simple' | 'paragraph';
  label?: string; // For display purposes
}

const DISPLAY_MODES = [
  { value: 'table_with_quantity', label: 'Table with Quantity', description: 'Shows fee names and quantities in a table' },
  { value: 'table_simple', label: 'Simple Table', description: 'Shows just fee names in a table' },
  { value: 'paragraph', label: 'Paragraph (Default)', description: 'Shows as regular paragraph text' },
];

const CONDITION_TYPES = [
  { value: 'attribute_name', label: 'By Attribute Name', description: 'Match by attribute name (e.g., PERYA)' },
  { value: 'permit_type_name', label: 'By Permit Type Name', description: 'Match by permit type name' },
  { value: 'attribute_id', label: 'By Attribute ID', description: 'Match by attribute ID' },
];

export default function PermitDisplaySettingsPage() {
  const [conditions, setConditions] = useState<DisplayCondition[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCondition, setEditingCondition] = useState<DisplayCondition | null>(null);
  
  // New condition form state
  const [newCondition, setNewCondition] = useState<Partial<DisplayCondition>>({
    condition_type: 'attribute_name',
    condition_value: '',
    display_mode: 'table_with_quantity',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [settingsResponse, attributesResponse, permitTypesResponse] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/attributes'),
        api.get('/api/permit-types'),
      ]);

      // Parse existing conditions from settings
      const settingsData = settingsResponse.data;
      const conditionsStr = settingsData.permit_tabular_display_conditions?.value;
      
      if (conditionsStr) {
        try {
          const parsedConditions = JSON.parse(conditionsStr);
          // Convert to our internal format with IDs
          const formattedConditions: DisplayCondition[] = parsedConditions.map((cond: any, index: number) => {
            let condition_type: DisplayCondition['condition_type'] = 'attribute_name';
            let condition_value = '';
            
            if (cond.attribute_name) {
              condition_type = 'attribute_name';
              condition_value = cond.attribute_name;
            } else if (cond.permit_type_name) {
              condition_type = 'permit_type_name';
              condition_value = cond.permit_type_name;
            } else if (cond.attribute_id) {
              condition_type = 'attribute_id';
              condition_value = cond.attribute_id;
            }
            
            return {
              id: `cond_${index}_${Date.now()}`,
              condition_type,
              condition_value,
              display_mode: cond.display_mode || 'table_with_quantity',
            };
          });
          setConditions(formattedConditions);
        } catch (e) {
          console.error('Error parsing conditions:', e);
          setConditions([]);
        }
      }

      setAttributes(attributesResponse.data);
      setPermitTypes(permitTypesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert conditions to the format expected by permit-report.html
      const conditionsForSave = conditions.map(cond => {
        const result: any = {
          display_mode: cond.display_mode,
        };
        
        if (cond.condition_type === 'attribute_name') {
          result.attribute_name = cond.condition_value;
        } else if (cond.condition_type === 'permit_type_name') {
          result.permit_type_name = cond.condition_value;
        } else if (cond.condition_type === 'attribute_id') {
          result.attribute_id = cond.condition_value;
        }
        
        return result;
      });

      await api.put('/api/settings/permit_tabular_display_conditions', {
        value: JSON.stringify(conditionsForSave),
        description: 'Conditions for displaying permit activities in tabular format'
      });

      alert('Display conditions saved successfully!');
    } catch (error: any) {
      console.error('Error saving conditions:', error);
      alert(error.response?.data?.error || 'Error saving conditions');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCondition = () => {
    if (!newCondition.condition_value) {
      alert('Please select a condition value');
      return;
    }

    const condition: DisplayCondition = {
      id: `cond_${Date.now()}`,
      condition_type: newCondition.condition_type as DisplayCondition['condition_type'],
      condition_value: newCondition.condition_value,
      display_mode: newCondition.display_mode as DisplayCondition['display_mode'],
    };

    setConditions([...conditions, condition]);
    setNewCondition({
      condition_type: 'attribute_name',
      condition_value: '',
      display_mode: 'table_with_quantity',
    });
    setShowAddForm(false);
  };

  const handleEditCondition = (condition: DisplayCondition) => {
    setEditingCondition(condition);
    setNewCondition({
      condition_type: condition.condition_type,
      condition_value: condition.condition_value,
      display_mode: condition.display_mode,
    });
  };

  const handleUpdateEditedCondition = () => {
    if (!editingCondition || !newCondition.condition_value) {
      alert('Please select a condition value');
      return;
    }

    setConditions(conditions.map(c => 
      c.id === editingCondition.id 
        ? {
            ...c,
            condition_type: newCondition.condition_type as DisplayCondition['condition_type'],
            condition_value: newCondition.condition_value as string,
            display_mode: newCondition.display_mode as DisplayCondition['display_mode'],
          }
        : c
    ));

    setEditingCondition(null);
    setNewCondition({
      condition_type: 'attribute_name',
      condition_value: '',
      display_mode: 'table_with_quantity',
    });
  };

  const handleCancelEdit = () => {
    setEditingCondition(null);
    setShowAddForm(false);
    setNewCondition({
      condition_type: 'attribute_name',
      condition_value: '',
      display_mode: 'table_with_quantity',
    });
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const handleUpdateCondition = (id: string, field: keyof DisplayCondition, value: string) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const getConditionLabel = (condition: DisplayCondition): string => {
    if (condition.condition_type === 'attribute_name') {
      const attr = attributes.find(a => a.attribute_name.toUpperCase() === condition.condition_value.toUpperCase());
      return attr ? `Attribute: ${attr.attribute_name}` : `Attribute: ${condition.condition_value}`;
    } else if (condition.condition_type === 'permit_type_name') {
      const pt = permitTypes.find(p => p.permit_type_name.toUpperCase() === condition.condition_value.toUpperCase());
      return pt ? `Permit Type: ${pt.permit_type_name}` : `Permit Type: ${condition.condition_value}`;
    } else if (condition.condition_type === 'attribute_id') {
      const attr = attributes.find(a => a.attribute_id === condition.condition_value);
      return attr ? `Attribute ID: ${attr.attribute_name} (${condition.condition_value})` : `Attribute ID: ${condition.condition_value}`;
    }
    return condition.condition_value;
  };

  const getDisplayModeLabel = (mode: string): string => {
    const found = DISPLAY_MODES.find(m => m.value === mode);
    return found ? found.label : mode;
  };

  const getValueOptions = () => {
    if (newCondition.condition_type === 'attribute_name') {
      return attributes.map(a => ({ value: a.attribute_name, label: a.attribute_name }));
    } else if (newCondition.condition_type === 'permit_type_name') {
      return permitTypes.map(p => ({ value: p.permit_type_name, label: p.permit_type_name }));
    } else if (newCondition.condition_type === 'attribute_id') {
      return attributes.map(a => ({ value: a.attribute_id, label: `${a.attribute_name} (${a.attribute_id})` }));
    }
    return [];
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading settings...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/admin/settings" className="hover:text-indigo-600 transition-colors">
                Settings
              </Link>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium">Permit Display Conditions</span>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-lg">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Permit Display Conditions
                </h1>
                <p className="text-sm text-gray-500">Configure how permit activities are displayed based on permit type attributes</p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">How Display Conditions Work</h3>
                <p className="text-sm text-gray-600 mb-3">
                  When generating a permit report, the system checks these conditions to determine how to display the permit activities section.
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    <strong>Table with Quantity:</strong> Shows fee names and quantities in a table format (ideal for PERYA permits)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    <strong>Simple Table:</strong> Shows just fee names in a table format
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                    <strong>Paragraph:</strong> Default display as paragraph text
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Conditions List */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Display Conditions ({conditions.length})</h2>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-200 transition-all duration-200 shadow-lg shadow-indigo-200 text-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Condition
              </button>
            </div>

            {conditions.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No conditions configured</h3>
                <p className="text-gray-500 text-sm mb-4">All permits will use the default paragraph display format.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Your First Condition
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {conditions.map((condition, index) => (
                  <div key={condition.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{getConditionLabel(condition)}</p>
                        <p className="text-sm text-gray-500">
                          Display as: <span className="font-medium text-indigo-600">{getDisplayModeLabel(condition.display_mode)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={condition.display_mode}
                        onChange={(e) => handleUpdateCondition(condition.id, 'display_mode', e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                        aria-label="Display mode"
                        title="Select display mode"
                      >
                        {DISPLAY_MODES.map(mode => (
                          <option key={mode.value} value={mode.value}>{mode.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleEditCondition(condition)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit condition"
                        aria-label="Edit condition"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemoveCondition(condition.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove condition"
                        aria-label="Remove condition"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add/Edit Condition Modal */}
          {(showAddForm || editingCondition) && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingCondition ? 'Edit Display Condition' : 'Add Display Condition'}
                  </h3>
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close"
                    aria-label="Close dialog"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Condition Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condition Type
                    </label>
                    <div className="space-y-2">
                      {CONDITION_TYPES.map(type => (
                        <label
                          key={type.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            newCondition.condition_type === type.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="condition_type"
                            value={type.value}
                            checked={newCondition.condition_type === type.value}
                            onChange={(e) => setNewCondition({ ...newCondition, condition_type: e.target.value as any, condition_value: '' })}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{type.label}</p>
                            <p className="text-sm text-gray-500">{type.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Condition Value */}
                  <div>
                    <label htmlFor="condition-value" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Value
                    </label>
                    <select
                      id="condition-value"
                      value={newCondition.condition_value}
                      onChange={(e) => setNewCondition({ ...newCondition, condition_value: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                      aria-label="Select condition value"
                    >
                      <option value="">-- Select --</option>
                      {getValueOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Display Mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Display Mode
                    </label>
                    <div className="space-y-2">
                      {DISPLAY_MODES.map(mode => (
                        <label
                          key={mode.value}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            newCondition.display_mode === mode.value
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="display_mode"
                            value={mode.value}
                            checked={newCondition.display_mode === mode.value}
                            onChange={(e) => setNewCondition({ ...newCondition, display_mode: e.target.value as any })}
                            className="mt-0.5"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{mode.label}</p>
                            <p className="text-sm text-gray-500">{mode.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingCondition ? handleUpdateEditedCondition : handleAddCondition}
                    disabled={!newCondition.condition_value}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {editingCondition ? 'Update Condition' : 'Add Condition'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Display Preview</h2>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Table with Quantity Preview */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                    Table with Quantity
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <p className="mb-3 text-gray-700">To conduct/engage in operating the following at <strong>Poblacion, Dalaguete, Cebu</strong>:</p>
                    <table className="w-full border-collapse border border-gray-300 mb-3">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-3 py-2 text-left">Activity / Item</th>
                          <th className="border border-gray-300 px-3 py-2 text-center w-20">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2">Ferris Wheel</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">2</td>
                        </tr>
                        <tr>
                          <td className="border border-gray-300 px-3 py-2">Carousel</td>
                          <td className="border border-gray-300 px-3 py-2 text-center">1</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="text-gray-700">Valid from <strong>November 26, 2025</strong> up to <strong>December 31, 2025</strong> only.</p>
                  </div>
                </div>

                {/* Paragraph Preview */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                    Paragraph (Default)
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm">
                    <p className="text-gray-700">To conduct/engage in operating <strong>amusement rides and games</strong> at <strong>Poblacion, Dalaguete, Cebu</strong> on <strong>November 26, 2025</strong> up to <strong>December 31, 2025</strong> only.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Link
              href="/admin/settings"
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Settings
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-indigo-800 focus:ring-4 focus:ring-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-200"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Conditions
                </>
              )}
            </button>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
