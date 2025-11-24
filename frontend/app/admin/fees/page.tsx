'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface FeeCategory {
  category_id: number;
  category_name: string;
}

interface Fee {
  fee_id: number;
  category_id: number;
  fee_name: string;
  default_amount: number;
  category_name?: string;
}

export default function FeesPage() {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'fees'>('categories');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [categoryForm, setCategoryForm] = useState({ category_name: '' });
  const [feeForm, setFeeForm] = useState({
    category_id: '',
    fee_name: '',
    default_amount: '',
  });

  useEffect(() => {
    fetchCategories();
    fetchFees();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/fees/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFees = async () => {
    try {
      const response = await api.get('/api/fees/charges');
      setFees(response.data);
    } catch (error) {
      console.error('Error fetching fees:', error);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/api/fees/categories/${editingCategory.category_id}`, categoryForm);
      } else {
        await api.post('/api/fees/categories', categoryForm);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ category_name: '' });
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving category');
    }
  };

  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFee) {
        await api.put(`/api/fees/charges/${editingFee.fee_id}`, feeForm);
      } else {
        await api.post('/api/fees/charges', feeForm);
      }
      setShowFeeModal(false);
      setEditingFee(null);
      setFeeForm({ category_id: '', fee_name: '', default_amount: '' });
      fetchFees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving fee');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/api/fees/categories/${id}`);
      fetchCategories();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting category');
    }
  };

  const handleDeleteFee = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fee?')) return;
    try {
      await api.delete(`/api/fees/charges/${id}`);
      fetchFees();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting fee');
    }
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
            <h1 className="text-3xl font-bold text-gray-900">Fee Management</h1>
          </div>

          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'categories'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab('fees')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fees'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fees & Charges
              </button>
            </nav>
          </div>

          {activeTab === 'categories' && (
            <div>
              <div className="mb-4">
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ category_name: '' });
                    setShowCategoryModal(true);
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Add Category
                </button>
              </div>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {categories.map((category) => (
                    <li key={category.category_id}>
                      <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                        <div className="text-sm font-medium text-gray-900">
                          {category.category_name}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryForm({ category_name: category.category_name });
                              setShowCategoryModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.category_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div>
              <div className="mb-4">
                <button
                  onClick={() => {
                    setEditingFee(null);
                    setFeeForm({ category_id: '', fee_name: '', default_amount: '' });
                    setShowFeeModal(true);
                  }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Add Fee
                </button>
              </div>
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {fees.map((fee) => (
                    <li key={fee.fee_id}>
                      <div className="px-4 py-4 sm:px-6 flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {fee.fee_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {fee.category_name} • ${typeof fee.default_amount === 'number' 
                              ? fee.default_amount.toFixed(2) 
                              : parseFloat(fee.default_amount || '0').toFixed(2)}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingFee(fee);
                              setFeeForm({
                                category_id: fee.category_id.toString(),
                                fee_name: fee.fee_name,
                                default_amount: (typeof fee.default_amount === 'number' 
                                  ? fee.default_amount 
                                  : parseFloat(fee.default_amount || '0')).toString(),
                              });
                              setShowFeeModal(true);
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteFee(fee.fee_id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {showCategoryModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-bold mb-4">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <form onSubmit={handleCategorySubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Category Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={categoryForm.category_name}
                      onChange={(e) =>
                        setCategoryForm({ category_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryModal(false);
                        setEditingCategory(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showFeeModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <h3 className="text-lg font-bold mb-4">
                  {editingFee ? 'Edit Fee' : 'Add Fee'}
                </h3>
                <form onSubmit={handleFeeSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={feeForm.category_id}
                      onChange={(e) =>
                        setFeeForm({ ...feeForm, category_id: e.target.value })
                      }
                    >
                      <option value="">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Fee Name
                    </label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={feeForm.fee_name}
                      onChange={(e) =>
                        setFeeForm({ ...feeForm, fee_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Default Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      value={feeForm.default_amount}
                      onChange={(e) =>
                        setFeeForm({ ...feeForm, default_amount: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFeeModal(false);
                        setEditingFee(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      {editingFee ? 'Update' : 'Create'}
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

