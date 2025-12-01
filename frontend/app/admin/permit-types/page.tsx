'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface PermitType {
  permit_type_id: number;
  permit_type_name: string;
  attribute_id: string | null;
  attribute_name: string | null;
  description: string | null;
  is_active: boolean;
  validity_date: string | null;
  validity_type: 'fixed' | 'custom';
  fees?: PermitTypeFee[];
}

interface PermitTypeFee {
  permit_type_fee_id?: number;
  fee_id: number;
  fee_name: string;
  category_name: string;
  default_amount: number;
  is_required: boolean;
}

interface Fee {
  fee_id: number;
  fee_name: string;
  category_name: string;
  default_amount: number;
}

export default function PermitTypesPage() {
  const { hasRole } = useAuth();
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([]);
  const [allFees, setAllFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [editingPermitType, setEditingPermitType] = useState<PermitType | null>(null);
  const [formData, setFormData] = useState({
    permit_type_name: '',
    description: '',
    is_active: true,
    validity_date: '',
    validity_type: 'fixed' as 'fixed' | 'custom',
  });
  const [attributes, setAttributes] = useState<Array<{ attribute_id: string; attribute_name: string }>>([]);
  const [permitTypeFees, setPermitTypeFees] = useState<PermitTypeFee[]>([]);
  const [currentPermitTypeId, setCurrentPermitTypeId] = useState<number | null>(null);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [attributeFormData, setAttributeFormData] = useState({
    attribute_name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchPermitTypes();
    fetchAllFees();
  }, []);

  const fetchAttributes = async () => {
    console.log('[PermitTypes] Fetching active attributes...');
    try {
      const response = await api.get('/api/attributes/active');
      console.log('[PermitTypes] Attributes fetched:', response.data);
      setAttributes(response.data);
    } catch (error: any) {
      console.error('[PermitTypes] Error fetching attributes:', error);
      console.error('[PermitTypes] Error response:', error.response);
      console.error('[PermitTypes] Error status:', error.response?.status);
      console.error('[PermitTypes] Error data:', error.response?.data);
    }
  };

  const handleCreateAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PermitTypes] Creating attribute:', attributeFormData);
    try {
      const response = await api.post('/api/attributes', attributeFormData);
      console.log('[PermitTypes] Attribute created successfully:', response.data);
      setShowAttributeModal(false);
      setAttributeFormData({ attribute_name: '', description: '', is_active: true });
      await fetchAttributes();
      // Auto-select the newly created attribute
      if (response.data.attribute_id) {
        setFormData({ ...formData, attribute_id: response.data.attribute_id.toString() });
        console.log('[PermitTypes] Auto-selected new attribute:', response.data.attribute_id);
      }
      alert('Attribute created successfully!');
    } catch (error: any) {
      console.error('[PermitTypes] Error creating attribute:', error);
      console.error('[PermitTypes] Error response:', error.response);
      console.error('[PermitTypes] Error status:', error.response?.status);
      console.error('[PermitTypes] Error data:', error.response?.data);
      alert(error.response?.data?.error || 'Error creating attribute');
    }
  };

  const fetchPermitTypes = async () => {
    console.log('[PermitTypes] Fetching permit types...');
    try {
      const response = await api.get('/api/permit-types');
      console.log('[PermitTypes] Permit types fetched:', response.data);
      setPermitTypes(response.data);
    } catch (error: any) {
      console.error('[PermitTypes] Error fetching permit types:', error);
      console.error('[PermitTypes] Error response:', error.response);
      console.error('[PermitTypes] Error status:', error.response?.status);
      console.error('[PermitTypes] Error data:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllFees = async () => {
    console.log('[PermitTypes] Fetching all fees...');
    try {
      const response = await api.get('/api/fees/charges');
      console.log('[PermitTypes] Fees fetched:', response.data.length, 'fees');
      setAllFees(response.data);
    } catch (error: any) {
      console.error('[PermitTypes] Error fetching fees:', error);
      console.error('[PermitTypes] Error response:', error.response);
      console.error('[PermitTypes] Error status:', error.response?.status);
      console.error('[PermitTypes] Error data:', error.response?.data);
    }
  };

  const fetchPermitTypeWithFees = async (permitTypeId: number) => {
    try {
      const response = await api.get(`/api/permit-types/${permitTypeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching permit type with fees:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PermitTypes] Submitting permit type:', { formData, fees: permitTypeFees });
    try {
      const payload = {
        ...formData,
        attribute_id: null, // No longer using attribute on permit types
        fees: permitTypeFees,
      };

      if (editingPermitType) {
        console.log('[PermitTypes] Updating permit type:', editingPermitType.permit_type_id);
        const response = await api.put(`/api/permit-types/${editingPermitType.permit_type_id}`, payload);
        console.log('[PermitTypes] Permit type updated:', response.data);
      } else {
        console.log('[PermitTypes] Creating new permit type');
        const response = await api.post('/api/permit-types', payload);
        console.log('[PermitTypes] Permit type created:', response.data);
      }
      setShowModal(false);
      setEditingPermitType(null);
      setFormData({ permit_type_name: '', description: '', is_active: true, validity_date: '', validity_type: 'fixed' });
      setPermitTypeFees([]);
      fetchPermitTypes();
    } catch (error: any) {
      console.error('[PermitTypes] Error saving permit type:', error);
      console.error('[PermitTypes] Error response:', error.response);
      console.error('[PermitTypes] Error status:', error.response?.status);
      console.error('[PermitTypes] Error data:', error.response?.data);
      alert(error.response?.data?.error || 'Error saving permit type');
    }
  };

  const handleEdit = async (permitType: PermitType) => {
    const fullPermitType = await fetchPermitTypeWithFees(permitType.permit_type_id);
    if (fullPermitType) {
      setEditingPermitType(fullPermitType);
      setFormData({
        permit_type_name: fullPermitType.permit_type_name,
        description: fullPermitType.description || '',
        is_active: fullPermitType.is_active,
        validity_date: fullPermitType.validity_date || '',
        validity_type: fullPermitType.validity_type || 'fixed',
      });
      setPermitTypeFees(fullPermitType.fees || []);
      setShowModal(true);
    }
  };

  const handleManageFees = async (permitType: PermitType) => {
    const fullPermitType = await fetchPermitTypeWithFees(permitType.permit_type_id);
    if (fullPermitType) {
      setCurrentPermitTypeId(permitType.permit_type_id);
      setPermitTypeFees(fullPermitType.fees || []);
      setShowFeesModal(true);
    }
  };

  const handleSaveFees = async () => {
    if (!currentPermitTypeId) return;

    try {
      const permitType = permitTypes.find(pt => pt.permit_type_id === currentPermitTypeId);
      if (!permitType) return;

      await api.put(`/api/permit-types/${currentPermitTypeId}`, {
        permit_type_name: permitType.permit_type_name,
        description: permitType.description,
        is_active: permitType.is_active,
        validity_date: permitType.validity_date || null,
        fees: permitTypeFees,
      });

      setShowFeesModal(false);
      setCurrentPermitTypeId(null);
      fetchPermitTypes();
      alert('Fees updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving fees');
    }
  };

  const handleDelete = async (permitTypeId: number) => {
    if (!confirm('Are you sure you want to delete this permit type?')) return;
    try {
      await api.delete(`/api/permit-types/${permitTypeId}`);
      fetchPermitTypes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting permit type');
    }
  };

  const addFeeToPermitType = () => {
    setPermitTypeFees([
      ...permitTypeFees,
      {
        fee_id: 0,
        fee_name: '',
        category_name: '',
        default_amount: 0,
        is_required: true,
      },
    ]);
  };

  const removeFeeFromPermitType = (index: number) => {
    setPermitTypeFees(permitTypeFees.filter((_, i) => i !== index));
  };

  const updatePermitTypeFee = (index: number, field: keyof PermitTypeFee, value: any) => {
    const updated = [...permitTypeFees];
    updated[index] = { ...updated[index], [field]: value };
    
    // If fee_id changed, update fee_name and category_name
    if (field === 'fee_id') {
      const selectedFee = allFees.find(f => f.fee_id === parseInt(value));
      if (selectedFee) {
        updated[index].fee_name = selectedFee.fee_name;
        updated[index].category_name = selectedFee.category_name;
        updated[index].default_amount = selectedFee.default_amount;
      }
    }
    
    setPermitTypeFees(updated);
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading permit types...</p>
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
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Permit Type Management
                </h1>
                <p className="text-gray-500 mt-1">Configure permit types and their default fees</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingPermitType(null);
                setFormData({ permit_type_name: '', description: '', is_active: true, validity_date: '', validity_type: 'fixed' });
                setPermitTypeFees([]);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Permit Type
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
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Validity
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
                {permitTypes.map((permitType) => (
                  <tr key={permitType.permit_type_id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-violet-100 to-purple-100 rounded-lg">
                          <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{permitType.permit_type_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {permitType.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {permitType.validity_type === 'custom' ? (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                          Custom (N/A)
                        </span>
                      ) : permitType.validity_date ? (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                          {new Date(permitType.validity_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          permitType.is_active
                            ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20'
                            : 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
                        }`}
                      >
                        {permitType.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          title="Edit permit type"
                          onClick={() => handleEdit(permitType)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          title="Manage fees"
                          onClick={() => handleManageFees(permitType)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {hasRole('SuperAdmin') && (
                          <button
                            title="Delete permit type"
                            onClick={() => handleDelete(permitType.permit_type_id)}
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
                {permitTypes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-500">No permit types yet. Add your first permit type!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Permit Type Form Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
              <div className="relative w-full max-w-2xl mx-4 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white">
                    {editingPermitType ? 'Edit Permit Type' : 'Add Permit Type'}
                  </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto">
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Permit Type Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={formData.permit_type_name}
                      onChange={(e) =>
                        setFormData({ ...formData, permit_type_name: e.target.value })
                      }
                      placeholder="e.g., Mayor's Permit, Special Mayor's Permit"
                      aria-label="Permit type name"
                    />
                    <p className="text-xs text-gray-400 mt-1">This will serve as the permit category for grouping in the dashboard</p>
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
                      aria-label="Permit type description"
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Validity
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          checked={formData.validity_type === 'custom'}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, validity_type: 'custom', validity_date: '' });
                            } else {
                              setFormData({ ...formData, validity_type: 'fixed' });
                            }
                          }}
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700">N/A (Custom Validity)</span>
                          <p className="text-xs text-gray-400">Validity will be based on the "Date" parameter in the application</p>
                        </div>
                      </label>
                      {formData.validity_type === 'fixed' && (
                        <div className="flex items-center gap-3 pl-1">
                          <input
                            type="date"
                            className="w-48 bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            value={formData.validity_date}
                            onChange={(e) =>
                              setFormData({ ...formData, validity_date: e.target.value })
                            }
                            aria-label="Permit validity date"
                          />
                          <p className="text-xs text-gray-400">e.g., December 31, 2025</p>
                        </div>
                      )}
                    </div>
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
                        Default Fees (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={addFeeToPermitType}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Fee
                      </button>
                    </div>
                    <div className="space-y-3">
                      {permitTypeFees.map((fee, index) => (
                        <div key={index} className="flex gap-2 items-center p-3 bg-gray-50/50 border border-gray-200 rounded-xl">
                          <select
                            required
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={fee.fee_id}
                            onChange={(e) =>
                              updatePermitTypeFee(index, 'fee_id', parseInt(e.target.value))
                            }
                            aria-label={`Select fee for row ${index + 1}`}
                          >
                            <option value={0}>Select Fee</option>
                            {allFees.map((f) => (
                              <option key={f.fee_id} value={f.fee_id}>
                                {f.category_name} - {f.fee_name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-28 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Amount"
                            value={fee.default_amount}
                            onChange={(e) =>
                              updatePermitTypeFee(
                                index,
                                'default_amount',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            aria-label={`Default amount for row ${index + 1}`}
                          />
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={fee.is_required}
                              onChange={(e) =>
                                updatePermitTypeFee(index, 'is_required', e.target.checked)
                              }
                            />
                            <span className="text-xs text-gray-600">Req</span>
                          </label>
                          <button
                            type="button"
                            title="Remove fee"
                            onClick={() => removeFeeFromPermitType(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingPermitType(null);
                        setPermitTypeFees([]);
                      }}
                      className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200"
                    >
                      {editingPermitType ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Manage Fees Modal */}
          {showFeesModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
              <div className="relative w-full max-w-3xl mx-4 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white">Manage Default Fees</h3>
                </div>
                <div className="p-6 overflow-y-auto">
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Default Assessment Fees
                    </label>
                    <button
                      type="button"
                      onClick={addFeeToPermitType}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Fee
                    </button>
                  </div>
                  {permitTypeFees.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-gray-500">No fees configured. Click "Add Fee" to add default fees.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {permitTypeFees.map((fee, index) => (
                        <div key={index} className="flex gap-2 items-center p-4 bg-gray-50/50 border border-gray-200 rounded-xl hover:bg-gray-100/50 transition-colors duration-150">
                          <select
                            required
                            className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            value={fee.fee_id}
                            onChange={(e) =>
                              updatePermitTypeFee(index, 'fee_id', parseInt(e.target.value))
                            }
                            aria-label={`Select fee for row ${index + 1}`}
                          >
                            <option value={0}>Select Fee</option>
                            {allFees.map((f) => (
                              <option key={f.fee_id} value={f.fee_id}>
                                {f.category_name} - {f.fee_name}
                              </option>
                            ))}
                          </select>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₱</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className="w-32 bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                              placeholder="0.00"
                              value={fee.default_amount}
                              onChange={(e) =>
                                updatePermitTypeFee(
                                  index,
                                  'default_amount',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              checked={fee.is_required}
                              onChange={(e) =>
                                updatePermitTypeFee(index, 'is_required', e.target.checked)
                              }
                            />
                            <span className="text-xs text-gray-600 font-medium">Required</span>
                          </label>
                          <button
                            type="button"
                            title="Remove fee"
                            onClick={() => removeFeeFromPermitType(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/30">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeesModal(false);
                      setCurrentPermitTypeId(null);
                      setPermitTypeFees([]);
                    }}
                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFees}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200"
                  >
                    Save Fees
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Attribute Modal */}
          {showAttributeModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-[60] flex items-start justify-center pt-20">
              <div className="relative w-full max-w-md mx-4 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">Add New Attribute</h3>
                </div>
                <form onSubmit={handleCreateAttribute} className="p-6">
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attribute Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={attributeFormData.attribute_name}
                      onChange={(e) =>
                        setAttributeFormData({ ...attributeFormData, attribute_name: e.target.value })
                      }
                      placeholder="e.g., Cellsite"
                      aria-label="Attribute name"
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      rows={3}
                      value={attributeFormData.description}
                      onChange={(e) =>
                        setAttributeFormData({ ...attributeFormData, description: e.target.value })
                      }
                      aria-label="Attribute description"
                    />
                  </div>
                  <div className="mb-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        checked={attributeFormData.is_active}
                        onChange={(e) =>
                          setAttributeFormData({ ...attributeFormData, is_active: e.target.checked })
                        }
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttributeModal(false);
                        setAttributeFormData({ attribute_name: '', description: '', is_active: true });
                      }}
                      className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200"
                    >
                      Create
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

