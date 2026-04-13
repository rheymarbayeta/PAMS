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

export default function MahjongTemplateSettingsPage() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [mahjongTemplateAttributes, setMahjongTemplateAttributes] = useState<string[]>([]);
  const [pnpChiefName, setPnpChiefName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsResponse, attributesResponse] = await Promise.all([
        api.get('/api/settings'),
        api.get('/api/attributes'),
      ]);

      const settingsData = settingsResponse.data;

      // Load mahjong template settings
      const mahjongRaw = settingsData.permit_mahjong_template_attributes?.value || '';
      setMahjongTemplateAttributes(mahjongRaw ? mahjongRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : []);
      setPnpChiefName(settingsData.permit_pnp_chief_name?.value || '');

      setAttributes(attributesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMahjongSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put('/api/settings/permit_mahjong_template_attributes', {
          value: mahjongTemplateAttributes.join(','),
          description: 'Comma-separated attribute names that use the Mahjong permit template'
        }),
        api.put('/api/settings/permit_pnp_chief_name', {
          value: pnpChiefName,
          description: 'PNP Chief name displayed in the Mahjong permit template'
        }),
      ]);
      alert('Mahjong template settings saved!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving mahjong settings');
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
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Link href="/admin/settings" className="hover:text-indigo-600 transition-colors">
                Settings
              </Link>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium">Mahjong Permit Template</span>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">麻</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Mahjong Permit Template
                </h1>
                <p className="text-sm text-gray-500">Configure which permits use the Mahjong template and signatory details</p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Mahjong Permit Configuration</h3>
                <p className="text-sm text-gray-600">
                  Permits with the selected attributes will use the dedicated mahjong permit template. You can also configure the PNP Chief name that appears on these permits.
                </p>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="p-6 space-y-6">
              {/* Attributes Selection */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Template Attributes</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Permits with these attributes will open the Mahjong template instead of the default template.
                </p>
                {attributes.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No attributes available.</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-80 overflow-y-auto">
                    {attributes.map((attr) => {
                      const checked = mahjongTemplateAttributes.includes(attr.attribute_name);
                      return (
                        <label
                          key={attr.attribute_id}
                          className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            checked ? 'bg-amber-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMahjongTemplateAttributes([...mahjongTemplateAttributes, attr.attribute_name]);
                              } else {
                                setMahjongTemplateAttributes(mahjongTemplateAttributes.filter(a => a !== attr.attribute_name));
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                          />
                          <div className="flex-1">
                            <span className="text-sm text-gray-700 font-medium">{attr.attribute_name}</span>
                            {attr.description && (
                              <span className="text-xs text-gray-400 ml-2">{attr.description}</span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PNP Chief Name */}
              <div className="border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">PNP Chief Name</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name and Rank
                  </label>
                  <input
                    type="text"
                    value={pnpChiefName}
                    onChange={(e) => setPnpChiefName(e.target.value)}
                    placeholder="e.g. PSSUPT JOHN DOE"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This name and rank will be displayed at the bottom of the Mahjong permit as the CC/PNP Chief signatory.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Link
              href="/admin/settings"
              className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Settings
            </Link>
            <button
              onClick={handleSaveMahjongSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 focus:ring-4 focus:ring-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-amber-200"
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
      </Layout>
    </ProtectedRoute>
  );
}
