'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

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
  const { hasRole } = useAuth();
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

  const formatCurrency = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove any non-digit characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    let formattedValue = parts[0];
    if (parts.length > 1) {
      formattedValue += '.' + parts[1].substring(0, 2);
    }
    setFeeForm({ ...feeForm, default_amount: formattedValue });
  };

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
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Loading fees...</p>
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
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Fee Management
              </h1>
              <p className="text-gray-500 mt-1">Manage fee categories and charges</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 mb-6">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('categories')}
                className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'categories'
                    ? 'text-indigo-600 bg-gradient-to-b from-indigo-50 to-transparent border-b-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Categories
              </button>
              <button
                onClick={() => setActiveTab('fees')}
                className={`flex-1 py-4 px-6 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                  activeTab === 'fees'
                    ? 'text-indigo-600 bg-gradient-to-b from-indigo-50 to-transparent border-b-2 border-indigo-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Fees & Charges
              </button>
            </nav>
          </div>

          {activeTab === 'categories' && (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ category_name: '' });
                    setShowCategoryModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Category
                </button>
              </div>
              <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {categories.map((category) => (
                    <li key={category.category_id} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <div className="px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{category.category_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            title="Edit category"
                            onClick={() => {
                              setEditingCategory(category);
                              setCategoryForm({ category_name: category.category_name });
                              setShowCategoryModal(true);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {hasRole('SuperAdmin') && (
                            <button
                              title="Delete category"
                              onClick={() => handleDeleteCategory(category.category_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                  {categories.length === 0 && (
                    <li className="px-6 py-12 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <p className="text-gray-500">No categories yet. Add your first category!</p>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'fees' && (
            <div>
              <div className="mb-6">
                <button
                  onClick={() => {
                    setEditingFee(null);
                    setFeeForm({ category_id: '', fee_name: '', default_amount: '' });
                    setShowFeeModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Fee
                </button>
              </div>
              <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden">
                <ul className="divide-y divide-gray-100">
                  {fees.map((fee) => (
                    <li key={fee.fee_id} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <div className="px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg">
                            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{fee.fee_name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{fee.category_name}</span>
                              <span className="text-sm font-semibold text-emerald-600">
                                ₱ {typeof fee.default_amount === 'number' 
                                  ? fee.default_amount.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})
                                  : parseFloat(fee.default_amount || '0').toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            title="Edit fee"
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
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {hasRole('SuperAdmin') && (
                            <button
                              title="Delete fee"
                              onClick={() => handleDeleteFee(fee.fee_id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                  {fees.length === 0 && (
                    <li className="px-6 py-12 text-center">
                      <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500">No fees yet. Add your first fee!</p>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {showCategoryModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20">
              <div className="relative w-full max-w-md mx-4 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">
                    {editingCategory ? 'Edit Category' : 'Add Category'}
                  </h3>
                </div>
                <form onSubmit={handleCategorySubmit} className="p-6">
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category Name
                    </label>
                    <input
                      type="text"
                      title="Category Name"
                      placeholder="Enter category name"
                      required
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={categoryForm.category_name}
                      onChange={(e) =>
                        setCategoryForm({ category_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCategoryModal(false);
                        setEditingCategory(null);
                      }}
                      className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200"
                    >
                      {editingCategory ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showFeeModal && (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-20">
              <div className="relative w-full max-w-md mx-4 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                  <h3 className="text-lg font-semibold text-white">
                    {editingFee ? 'Edit Fee' : 'Add Fee'}
                  </h3>
                </div>
                <form onSubmit={handleFeeSubmit} className="p-6">
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      title="Fee Category"
                      required
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
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
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fee Name
                    </label>
                    <input
                      type="text"
                      title="Fee Name"
                      placeholder="Enter fee name"
                      required
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={feeForm.fee_name}
                      onChange={(e) =>
                        setFeeForm({ ...feeForm, fee_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3 text-gray-500 font-semibold">₱</span>
                      <input
                        type="text"
                        title="Default Amount"
                        placeholder="0.00"
                        required
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                        value={formatCurrency(feeForm.default_amount)}
                        onChange={handleAmountChange}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFeeModal(false);
                        setEditingFee(null);
                      }}
                      className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-xl transition-all duration-200"
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

