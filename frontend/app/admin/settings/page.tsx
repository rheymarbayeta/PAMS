'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import Link from 'next/link';

interface Setting {
  value: string;
  description: string;
}

interface Settings {
  default_municipality?: Setting;
  default_province?: Setting;
  default_country?: Setting;
  municipal_treasurer_name?: Setting;
  municipal_treasurer_position?: Setting;
  permit_signatory_name?: Setting;
  permit_signatory_position?: Setting;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    default_municipality: '',
    default_province: '',
    default_country: '',
    municipal_treasurer_name: '',
    municipal_treasurer_position: '',
    permit_signatory_name: '',
    permit_signatory_position: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const settingsData = response.data;
      setSettings(settingsData);
      setFormData({
        default_municipality: settingsData.default_municipality?.value || '',
        default_province: settingsData.default_province?.value || '',
        default_country: settingsData.default_country?.value || '',
        municipal_treasurer_name: settingsData.municipal_treasurer_name?.value || '',
        municipal_treasurer_position: settingsData.municipal_treasurer_position?.value || '',
        permit_signatory_name: settingsData.permit_signatory_name?.value || '',
        permit_signatory_position: settingsData.permit_signatory_position?.value || '',
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put(`/api/settings/default_municipality`, { value: formData.default_municipality }),
        api.put(`/api/settings/default_province`, { value: formData.default_province }),
        api.put(`/api/settings/default_country`, { value: formData.default_country }),
        api.put(`/api/settings/municipal_treasurer_name`, { value: formData.municipal_treasurer_name }),
        api.put(`/api/settings/municipal_treasurer_position`, { value: formData.municipal_treasurer_position }),
        api.put(`/api/settings/permit_signatory_name`, { value: formData.permit_signatory_name }),
        api.put(`/api/settings/permit_signatory_position`, { value: formData.permit_signatory_position }),
      ]);
      alert('Settings saved successfully');
      fetchSettings();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving settings');
    } finally {
      setSaving(false);
    }
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
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  System Settings
                </h1>
                <p className="text-sm text-gray-500">Configure application defaults and signatory information</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Quick Links */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Advanced Settings</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Configure advanced system settings for specialized features.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link
                  href="/admin/settings/permit-display"
                  className="group flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Permit Display Conditions</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure how permit activities are displayed (table vs paragraph format)</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Default Address Settings */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Default Address Settings</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Configure default address values for new applications. These will be pre-filled when creating new applications.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="default_municipality" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Default Municipality *
                  </label>
                  <input
                    id="default_municipality"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., Dalaguete"
                    value={formData.default_municipality}
                    onChange={(e) => setFormData({ ...formData, default_municipality: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="default_province" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Default Province *
                  </label>
                  <input
                    id="default_province"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., Cebu"
                    value={formData.default_province}
                    onChange={(e) => setFormData({ ...formData, default_province: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="default_country" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Default Country *
                  </label>
                  <input
                    id="default_country"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., Philippines"
                    value={formData.default_country}
                    onChange={(e) => setFormData({ ...formData, default_country: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Municipal Treasurer Signatory */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Municipal Treasurer Signatory</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Configure the Municipal Treasurer's information. This will be displayed in the assessment report.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="municipal_treasurer_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Municipal Treasurer Name *
                  </label>
                  <input
                    id="municipal_treasurer_name"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., HAIDEE D. OGOC"
                    value={formData.municipal_treasurer_name}
                    onChange={(e) => setFormData({ ...formData, municipal_treasurer_name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="municipal_treasurer_position" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Municipal Treasurer Position *
                  </label>
                  <input
                    id="municipal_treasurer_position"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., ACTING MUNICIPAL TREASURER"
                    value={formData.municipal_treasurer_position}
                    onChange={(e) => setFormData({ ...formData, municipal_treasurer_position: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Permit Signatory */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Permit Signatory</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Configure the permit signatory's information. This will be displayed on permit documents.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="permit_signatory_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Permit Signatory Name *
                  </label>
                  <input
                    id="permit_signatory_name"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., Juan De la Cruz"
                    value={formData.permit_signatory_name}
                    onChange={(e) => setFormData({ ...formData, permit_signatory_name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="permit_signatory_position" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Permit Signatory Position *
                  </label>
                  <input
                    id="permit_signatory_position"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., Business Permit Officer"
                    value={formData.permit_signatory_position}
                    onChange={(e) => setFormData({ ...formData, permit_signatory_position: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
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
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

