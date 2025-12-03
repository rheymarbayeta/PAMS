'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Attribute {
  attribute_id: string;
  attribute_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AttributesPage() {
  const { hasRole } = useAuth();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState({
    attribute_name: '',
    description: '',
    is_active: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/attributes');
      setAttributes(response.data);
    } catch (error) {
      console.error('Error fetching attributes:', error);
      setError('Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!formData.attribute_name.trim()) {
      setError('Attribute name is required');
      return;
    }

    try {
      if (editingAttribute) {
        await api.put(`/api/attributes/${editingAttribute.attribute_id}`, formData);
        setSuccessMessage('Attribute updated successfully');
      } else {
        await api.post('/api/attributes', formData);
        setSuccessMessage('Attribute added successfully');
      }
      setShowModal(false);
      setFormData({ attribute_name: '', description: '', is_active: true });
      setEditingAttribute(null);
      fetchAttributes();
    } catch (error: any) {
      console.error('Error saving attribute:', error);
      setError(error.response?.data?.error || 'Failed to save attribute');
    }
  };

  const handleEdit = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setFormData({
      attribute_name: attribute.attribute_name,
      description: attribute.description || '',
      is_active: attribute.is_active,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attribute?')) {
      return;
    }

    try {
      await api.delete(`/api/attributes/${id}`);
      setSuccessMessage('Attribute deleted successfully');
      fetchAttributes();
    } catch (error: any) {
      console.error('Error deleting attribute:', error);
      setError(error.response?.data?.error || 'Failed to delete attribute');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
        <Layout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading attributes...</p>
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
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Attributes Management
                </h1>
                <p className="text-gray-500 mt-1">Manage permit attributes and categories</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingAttribute(null);
                setFormData({ attribute_name: '', description: '', is_active: true });
                setError(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Attribute
            </button>
          </div>

          {/* Success and Error Messages */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Table */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Attribute Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {attributes.map((attribute) => (
                  <tr key={attribute.attribute_id} className="hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-lg">
                          <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{attribute.attribute_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {attribute.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          attribute.is_active
                            ? 'bg-green-100 text-green-700 ring-1 ring-green-600/20'
                            : 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
                        }`}
                      >
                        {attribute.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(attribute.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          title="Edit attribute"
                          onClick={() => handleEdit(attribute)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {hasRole('SuperAdmin') && (
                          <button
                            title="Delete attribute"
                            onClick={() => handleDelete(attribute.attribute_id)}
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
                {attributes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                      <p className="text-gray-500">No attributes yet. Add your first attribute!</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
              <div className="relative w-full max-w-2xl mx-4 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">
                    {editingAttribute ? 'Edit Attribute' : 'Add Attribute'}
                  </h3>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                  {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  )}

                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Attribute Name *
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={formData.attribute_name}
                      onChange={(e) =>
                        setFormData({ ...formData, attribute_name: e.target.value })
                      }
                      placeholder="e.g., PERYA, MOBILE GAME ROOM"
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
                      placeholder="Enter attribute description"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
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

                  <div className="flex justify-end gap-3 border-t border-gray-100 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingAttribute(null);
                        setFormData({ attribute_name: '', description: '', is_active: true });
                        setError(null);
                      }}
                      className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200"
                    >
                      {editingAttribute ? 'Update Attribute' : 'Add Attribute'}
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
