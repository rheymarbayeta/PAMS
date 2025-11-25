'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface PermitType {
  permit_type_id: number;
  permit_type_name: string;
  attribute_id: string | null;
  attribute_name: string | null;
  description: string | null;
  is_active: boolean;
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
  const [permitTypes, setPermitTypes] = useState<PermitType[]>([]);
  const [allFees, setAllFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFeesModal, setShowFeesModal] = useState(false);
  const [editingPermitType, setEditingPermitType] = useState<PermitType | null>(null);
  const [formData, setFormData] = useState({
    permit_type_name: '',
    attribute_id: '',
    description: '',
    is_active: true,
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
    fetchAttributes();
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
        attribute_id: formData.attribute_id || null,
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
      setFormData({ permit_type_name: '', attribute_id: '', description: '', is_active: true });
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
        attribute_id: fullPermitType.attribute_id || '',
        description: fullPermitType.description || '',
        is_active: fullPermitType.is_active,
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
          <div>Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Permit Type Management</h1>
            <button
              onClick={() => {
                setEditingPermitType(null);
                setFormData({ permit_type_name: '', attribute_id: '', description: '', is_active: true });
                setPermitTypeFees([]);
                setShowModal(true);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Add Permit Type
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permit Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Attribute
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {permitTypes.map((permitType) => (
                  <tr key={permitType.permit_type_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {permitType.permit_type_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {permitType.attribute_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {permitType.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          permitType.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {permitType.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(permitType)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleManageFees(permitType)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Manage Fees
                        </button>
                        <button
                          onClick={() => handleDelete(permitType.permit_type_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Permit Type Form Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">
                  {editingPermitType ? 'Edit Permit Type' : 'Add Permit Type'}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Permit Type Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.permit_type_name}
                      onChange={(e) =>
                        setFormData({ ...formData, permit_type_name: e.target.value })
                      }
                      aria-label="Permit type name"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Attribute
                    </label>
                    <div className="flex gap-2">
                      <select
                        className="mt-1 flex-1 border border-gray-300 rounded-md px-3 py-2"
                        value={formData.attribute_id}
                        onChange={(e) =>
                          setFormData({ ...formData, attribute_id: e.target.value })
                        }
                        aria-label="Select attribute"
                      >
                        <option value="">No Attribute</option>
                        {attributes.map((attr) => (
                          <option key={attr.attribute_id} value={attr.attribute_id}>
                            {attr.attribute_name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAttributeModal(true)}
                        className="mt-1 px-3 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        + Add New
                      </button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      aria-label="Permit type description"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({ ...formData, is_active: e.target.checked })
                        }
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Default Fees (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={addFeeToPermitType}
                        className="text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        + Add Fee
                      </button>
                    </div>
                    {permitTypeFees.map((fee, index) => (
                      <div key={index} className="flex gap-2 mb-2 items-center">
                        <select
                          required
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2"
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
                          className="w-32 border border-gray-300 rounded-md px-3 py-2"
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
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="mr-1"
                            checked={fee.is_required}
                            onChange={(e) =>
                              updatePermitTypeFee(index, 'is_required', e.target.checked)
                            }
                          />
                          <span className="text-xs text-gray-600">Required</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeFeeFromPermitType(index)}
                          className="px-3 py-2 text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingPermitType(null);
                        setPermitTypeFees([]);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Manage Default Fees</h3>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Default Assessment Fees
                    </label>
                    <button
                      type="button"
                      onClick={addFeeToPermitType}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      + Add Fee
                    </button>
                  </div>
                  {permitTypeFees.length === 0 ? (
                    <p className="text-sm text-gray-500">No fees configured. Click "Add Fee" to add default fees.</p>
                  ) : (
                    <div className="space-y-2">
                      {permitTypeFees.map((fee, index) => (
                        <div key={index} className="flex gap-2 items-center p-3 border border-gray-200 rounded-md">
                          <select
                            required
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2"
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
                            className="w-32 border border-gray-300 rounded-md px-3 py-2"
                            placeholder="Amount"
                            value={fee.default_amount}
                            onChange={(e) =>
                              updatePermitTypeFee(
                                index,
                                'default_amount',
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-1"
                              checked={fee.is_required}
                              onChange={(e) =>
                                updatePermitTypeFee(index, 'is_required', e.target.checked)
                              }
                            />
                            <span className="text-xs text-gray-600">Required</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => removeFeeFromPermitType(index)}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeesModal(false);
                      setCurrentPermitTypeId(null);
                      setPermitTypeFees([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveFees}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    Save Fees
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Attribute Modal */}
          {showAttributeModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-bold mb-4">Add New Attribute</h3>
                <form onSubmit={handleCreateAttribute}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Attribute Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={attributeFormData.attribute_name}
                      onChange={(e) =>
                        setAttributeFormData({ ...attributeFormData, attribute_name: e.target.value })
                      }
                      placeholder="e.g., Cellsite"
                      aria-label="Attribute name"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                      value={attributeFormData.description}
                      onChange={(e) =>
                        setAttributeFormData({ ...attributeFormData, description: e.target.value })
                      }
                      aria-label="Attribute description"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={attributeFormData.is_active}
                        onChange={(e) =>
                          setAttributeFormData({ ...attributeFormData, is_active: e.target.checked })
                        }
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttributeModal(false);
                        setAttributeFormData({ attribute_name: '', description: '', is_active: true });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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

