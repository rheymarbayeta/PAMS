'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

export default function AddPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState({
    property_name: '',
    property_code: '',
    address: '',
    description: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.property_name.trim()) {
        setError('Property/Building is required');
        return;
      }

      if (!formData.property_code.trim()) {
        setError('Property Code is required');
        return;
      }

      await api.post('/api/rights-and-rentals/properties', {
        property_name: formData.property_name.trim(),
        property_code: formData.property_code.trim(),
        address: formData.address.trim() || null,
        description: formData.description.trim() || null
      });

      router.push('/admin/rights-and-rentals/properties');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error creating property');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/admin/rights-and-rentals/properties" className="hover:text-gray-700">
                Properties
              </Link>
              <span>/</span>
              <span className="text-gray-900 font-medium">Add New Property</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Property</h1>
            <p className="text-gray-600">Create a new property/stall unit</p>
          </div>

          {/* Form Card */}
          <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 sm:p-8">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              )}

              {/* Property/Building */}
              <div className="mb-6">
                <label htmlFor="property_name" className="block text-sm font-semibold text-gray-900 mb-2">
                  Property/Building <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="property_name"
                  name="property_name"
                  value={formData.property_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Dalaguete Commercial Center"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 outline-none"
                  required
                />
              </div>

              {/* Property Code */}
              <div className="mb-6">
                <label htmlFor="property_code" className="block text-sm font-semibold text-gray-900 mb-2">
                  Property Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="property_code"
                  name="property_code"
                  value={formData.property_code}
                  onChange={handleInputChange}
                  placeholder="e.g., PROP-001"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 outline-none"
                  required
                />
              </div>

              {/* Address */}
              <div className="mb-6">
                <label htmlFor="address" className="block text-sm font-semibold text-gray-900 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Full address of the property"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 outline-none"
                />
              </div>

              {/* Description */}
              <div className="mb-8">
                <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Additional notes or description about the property"
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all duration-200 outline-none resize-none"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl font-medium hover:from-orange-700 hover:to-orange-800 focus:ring-4 focus:ring-orange-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Property
                    </>
                  )}
                </button>
                <Link
                  href="/admin/rights-and-rentals/properties"
                  className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 focus:ring-4 focus:ring-gray-200 transition-all duration-200"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
