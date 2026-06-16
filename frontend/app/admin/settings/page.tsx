'use client';

import { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import Link from 'next/link';

interface Setting {
  value: string;
  description: string;
}

function SignatureUploadField({
  label,
  description,
  savedUrl,
  previewUrl,
  uploading,
  onFileSelect,
  onClear,
}: {
  label: string;
  description?: string;
  savedUrl: string;
  previewUrl: string;
  uploading: boolean;
  onFileSelect: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const displayUrl = previewUrl || (savedUrl ? (savedUrl.startsWith('http') ? savedUrl : `${apiBase}${savedUrl}`) : null);

  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-indigo-300 transition-colors">
        {displayUrl ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex justify-center flex-1 min-h-[80px] items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayUrl} alt="E-Signature preview" className="h-16 w-auto max-w-full object-contain" />
            </div>
            <div className="flex gap-2 sm:flex-col">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-medium disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Change'}
              </button>
              <button
                type="button"
                onClick={onClear}
                disabled={uploading}
                className="text-sm px-4 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 font-medium disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center gap-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50 w-full py-6"
          >
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span className="text-sm font-medium">{uploading ? 'Uploading…' : 'Upload e-signature'}</span>
            <span className="text-xs text-gray-400">PNG or JPG with transparent background recommended · up to 5 MB</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

interface Settings {
  default_municipality?: Setting;
  default_province?: Setting;
  default_country?: Setting;
  municipal_treasurer_name?: Setting;
  municipal_treasurer_position?: Setting;
  municipal_treasurer_signature?: Setting;
  permit_signatory_name?: Setting;
  permit_signatory_position?: Setting;
  permit_signatory_signature?: Setting;
  permit_by_signatory_name?: Setting;
  permit_by_signatory_title?: Setting;
  permit_by_signatory_signature?: Setting;
  permit_by_signatory_enabled?: Setting;
  citation_signatory_enabled?: Setting;
  citation_prepared_by_position?: Setting;
  citation_certified_by_name?: Setting;
  citation_certified_by_position?: Setting;
  citation_certified_by_signature?: Setting;
  billing_surcharge_enabled?: Setting;
  billing_surcharge_percentage?: Setting;
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
    municipal_treasurer_signature: '',
    permit_signatory_name: '',
    permit_signatory_position: '',
    permit_signatory_signature: '',
    permit_by_signatory_name: '',
    permit_by_signatory_title: '',
    permit_by_signatory_signature: '',
    permit_by_signatory_enabled: 'true',
    citation_signatory_enabled: 'true',
    citation_prepared_by_position: '',
    citation_certified_by_name: '',
    citation_certified_by_position: '',
    citation_certified_by_signature: '',
    billing_surcharge_enabled: 'true',
    billing_surcharge_percentage: '20',
  });
  const [signaturePreview, setSignaturePreview] = useState<Record<string, string>>({});
  const [signatureUploading, setSignatureUploading] = useState<Record<string, boolean>>({});

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
        municipal_treasurer_signature: settingsData.municipal_treasurer_signature?.value || '',
        permit_signatory_name: settingsData.permit_signatory_name?.value || '',
        permit_signatory_position: settingsData.permit_signatory_position?.value || '',
        permit_signatory_signature: settingsData.permit_signatory_signature?.value || '',
        permit_by_signatory_name: settingsData.permit_by_signatory_name?.value || '',
        permit_by_signatory_title: settingsData.permit_by_signatory_title?.value || '',
        permit_by_signatory_signature: settingsData.permit_by_signatory_signature?.value || '',
        permit_by_signatory_enabled: settingsData.permit_by_signatory_enabled?.value || 'true',
        citation_signatory_enabled: settingsData.citation_signatory_enabled?.value ?? 'true',
        citation_prepared_by_position: settingsData.citation_prepared_by_position?.value || '',
        citation_certified_by_name: settingsData.citation_certified_by_name?.value || '',
        citation_certified_by_position: settingsData.citation_certified_by_position?.value || '',
        citation_certified_by_signature: settingsData.citation_certified_by_signature?.value || '',
        billing_surcharge_enabled: settingsData.billing_surcharge_enabled?.value ?? 'true',
        billing_surcharge_percentage: settingsData.billing_surcharge_percentage?.value || '20',
      });
      setSignaturePreview({});
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureUpload = async (key: keyof typeof formData, file: File) => {
    setSignatureUploading((prev) => ({ ...prev, [key]: true }));
    const localPreview = URL.createObjectURL(file);
    setSignaturePreview((prev) => ({ ...prev, [key]: localPreview }));
    try {
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/api/settings/upload-logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setFormData((prev) => ({ ...prev, [key]: res.data.url }));
    } catch {
      alert('Failed to upload e-signature. Please try again.');
      setSignaturePreview((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } finally {
      setSignatureUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleSignatureClear = (key: keyof typeof formData) => {
    setFormData((prev) => ({ ...prev, [key]: '' }));
    setSignaturePreview((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
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
        api.put(`/api/settings/municipal_treasurer_signature`, { value: formData.municipal_treasurer_signature, description: 'E-signature image URL for Municipal Treasurer' }),
        api.put(`/api/settings/permit_signatory_name`, { value: formData.permit_signatory_name }),
        api.put(`/api/settings/permit_signatory_position`, { value: formData.permit_signatory_position }),
        api.put(`/api/settings/permit_signatory_signature`, { value: formData.permit_signatory_signature, description: 'E-signature image URL for permit signatory' }),
        api.put(`/api/settings/permit_by_signatory_name`, { value: formData.permit_by_signatory_name }),
        api.put(`/api/settings/permit_by_signatory_title`, { value: formData.permit_by_signatory_title }),
        api.put(`/api/settings/permit_by_signatory_signature`, { value: formData.permit_by_signatory_signature, description: 'E-signature image URL for permit BY signatory' }),
        api.put(`/api/settings/permit_by_signatory_enabled`, { value: formData.permit_by_signatory_enabled }),
        api.put(`/api/settings/citation_signatory_enabled`, { value: formData.citation_signatory_enabled }),
        api.put(`/api/settings/citation_prepared_by_position`, { value: formData.citation_prepared_by_position }),
        api.put(`/api/settings/citation_certified_by_name`, { value: formData.citation_certified_by_name }),
        api.put(`/api/settings/citation_certified_by_position`, { value: formData.citation_certified_by_position }),
        api.put(`/api/settings/citation_certified_by_signature`, { value: formData.citation_certified_by_signature, description: 'E-signature image URL for citation certified-by signatory' }),
        api.put(`/api/settings/billing_surcharge_enabled`, { value: formData.billing_surcharge_enabled, description: 'Apply late payment surcharge on billing statements (true/false)' }),
        api.put(`/api/settings/billing_surcharge_percentage`, { value: formData.billing_surcharge_percentage, description: 'Late payment surcharge percentage for billing statements' }),
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
                <Link
                  href="/admin/settings/permit-header"
                  className="group flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-.293.707L13 15.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-5.586L4.293 7.707A1 1 0 014 7V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Permit Header</h3>
                    <p className="text-sm text-gray-500 mt-1">Upload logos and customize header text on permit documents</p>
                  </div>
                </Link>
                <Link
                  href="/admin/settings/assessment-header"
                  className="group flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50/50 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors">Assessment Header</h3>
                    <p className="text-sm text-gray-500 mt-1">Upload logos and customize header text on assessment documents</p>
                  </div>
                </Link>
                <Link
                  href="/admin/settings/mahjong-template"
                  className="group flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <span className="text-white font-bold text-lg">麻</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">Mahjong Template</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure mahjong permit template attributes and signatories</p>
                  </div>
                </Link>
                <Link
                  href="/admin/settings/disco-template"
                  className="group flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-rose-300 hover:bg-rose-50/50 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-rose-700 transition-colors">Disco Template</h3>
                    <p className="text-sm text-gray-500 mt-1">Customize disco permit header text and formatting</p>
                  </div>
                </Link>
                <Link
                  href="/admin/settings/role-permissions"
                  className="group flex items-start gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">Role Permissions</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure permissions and access levels for user roles</p>
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
              <SignatureUploadField
                label="E-Signature"
                description="Displayed on billing statements and assessment reports. PNG with transparent background works best."
                savedUrl={formData.municipal_treasurer_signature}
                previewUrl={signaturePreview.municipal_treasurer_signature || ''}
                uploading={!!signatureUploading.municipal_treasurer_signature}
                onFileSelect={(file) => handleSignatureUpload('municipal_treasurer_signature', file)}
                onClear={() => handleSignatureClear('municipal_treasurer_signature')}
              />
            </div>

            {/* Billing Surcharge */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Billing Surcharge</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Enable surcharge</span>
                  <input
                    type="checkbox"
                    checked={formData.billing_surcharge_enabled === 'true'}
                    onChange={(e) => setFormData({ ...formData, billing_surcharge_enabled: e.target.checked ? 'true' : 'false' })}
                    className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-2 focus:ring-amber-500"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Configure the late payment surcharge applied to unpaid previous balances on rights and rentals billing statements.
              </p>

              <div className={`max-w-xs transition-opacity duration-200 ${formData.billing_surcharge_enabled === 'false' ? 'opacity-50 pointer-events-none' : ''}`}>
                <label htmlFor="billing_surcharge_percentage" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Surcharge Percentage (%)
                </label>
                <input
                  id="billing_surcharge_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                  placeholder="e.g., 20"
                  value={formData.billing_surcharge_percentage}
                  onChange={(e) => setFormData({ ...formData, billing_surcharge_percentage: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Example: 20 means a 20% surcharge on the previous month&apos;s unpaid balance.
                </p>
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
              <SignatureUploadField
                label="E-Signature"
                description="Displayed on permit documents above the signatory name."
                savedUrl={formData.permit_signatory_signature}
                previewUrl={signaturePreview.permit_signatory_signature || ''}
                uploading={!!signatureUploading.permit_signatory_signature}
                onFileSelect={(file) => handleSignatureUpload('permit_signatory_signature', file)}
                onClear={() => handleSignatureClear('permit_signatory_signature')}
              />
            </div>

            {/* Permit BY Signatory */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Permit BY Signatory</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Enable</span>
                  <input
                    type="checkbox"
                    checked={formData.permit_by_signatory_enabled === 'true'}
                    onChange={(e) => setFormData({ ...formData, permit_by_signatory_enabled: e.target.checked ? 'true' : 'false' })}
                    className="w-5 h-5 rounded border-gray-300 text-orange-600 focus:ring-2 focus:ring-orange-500"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Configure the "BY" signatory's information (displayed above the "APPROVED BY" section on permit documents). Toggle to enable or disable this section.
              </p>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-200 ${formData.permit_by_signatory_enabled === 'false' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label htmlFor="permit_by_signatory_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    BY Signatory Name *
                  </label>
                  <input
                    id="permit_by_signatory_name"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., MARIA SANTOS"
                    value={formData.permit_by_signatory_name}
                    onChange={(e) => setFormData({ ...formData, permit_by_signatory_name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="permit_by_signatory_title" className="block text-sm font-medium text-gray-700 mb-1.5">
                    BY Signatory Position *
                  </label>
                  <input
                    id="permit_by_signatory_title"
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., CITY BUSINESS PERMIT OFFICER"
                    value={formData.permit_by_signatory_title}
                    onChange={(e) => setFormData({ ...formData, permit_by_signatory_title: e.target.value })}
                  />
                </div>
              </div>
              <SignatureUploadField
                label="E-Signature"
                description="Displayed on permit documents in the BY section."
                savedUrl={formData.permit_by_signatory_signature}
                previewUrl={signaturePreview.permit_by_signatory_signature || ''}
                uploading={!!signatureUploading.permit_by_signatory_signature}
                onFileSelect={(file) => handleSignatureUpload('permit_by_signatory_signature', file)}
                onClear={() => handleSignatureClear('permit_by_signatory_signature')}
              />
            </div>

            {/* Citation Report Signatory */}
            <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Citation Report Signatory</h2>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm font-medium text-gray-700">Enable</span>
                  <input
                    type="checkbox"
                    checked={formData.citation_signatory_enabled === 'true'}
                    onChange={(e) => setFormData({ ...formData, citation_signatory_enabled: e.target.checked ? 'true' : 'false' })}
                    className="w-5 h-5 rounded border-gray-300 text-cyan-600 focus:ring-2 focus:ring-cyan-500"
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Configure the signatory block displayed at the bottom of the citation ticket report. Toggle to enable or disable. The "Prepared by" name is automatically filled with the logged-in user's name.
              </p>

              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-200 ${formData.citation_signatory_enabled === 'false' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label htmlFor="citation_prepared_by_position" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Prepared By — Position
                  </label>
                  <input
                    id="citation_prepared_by_position"
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., Traffic Enforcer"
                    value={formData.citation_prepared_by_position}
                    onChange={(e) => setFormData({ ...formData, citation_prepared_by_position: e.target.value })}
                  />
                </div>
                <div>
                  {/* spacer */}
                </div>
                <div>
                  <label htmlFor="citation_certified_by_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Certified Correct By — Name
                  </label>
                  <input
                    id="citation_certified_by_name"
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., HAIDEE D. OGOC"
                    value={formData.citation_certified_by_name}
                    onChange={(e) => setFormData({ ...formData, citation_certified_by_name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="citation_certified_by_position" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Certified Correct By — Position
                  </label>
                  <input
                    id="citation_certified_by_position"
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50/50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200 outline-none"
                    placeholder="e.g., ACTING MUNICIPAL TREASURER"
                    value={formData.citation_certified_by_position}
                    onChange={(e) => setFormData({ ...formData, citation_certified_by_position: e.target.value })}
                  />
                </div>
                <SignatureUploadField
                  label="Certified Correct By — E-Signature"
                  description="Displayed on citation ticket reports for the certified-by signatory."
                  savedUrl={formData.citation_certified_by_signature}
                  previewUrl={signaturePreview.citation_certified_by_signature || ''}
                  uploading={!!signatureUploading.citation_certified_by_signature}
                  onFileSelect={(file) => handleSignatureUpload('citation_certified_by_signature', file)}
                  onClear={() => handleSignatureClear('citation_certified_by_signature')}
                />
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

