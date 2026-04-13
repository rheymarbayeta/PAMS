'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import Link from 'next/link';

export default function DiscoTemplateSettingsPage() {
  const [discoHeaderLine1, setDiscoHeaderLine1] = useState<string>('');
  const [discoHeaderLine2, setDiscoHeaderLine2] = useState<string>('');
  const [discoHeaderLine3, setDiscoHeaderLine3] = useState<string>('');
  const [discoHeaderLine4, setDiscoHeaderLine4] = useState<string>('');
  const [discoHeaderLine5, setDiscoHeaderLine5] = useState<string>('');
  const [discoHeaderFontSize, setDiscoHeaderFontSize] = useState<string>('');
  const [discoHeaderLogoLeft, setDiscoHeaderLogoLeft] = useState<string>('');
  const [discoHeaderLogoRight, setDiscoHeaderLogoRight] = useState<string>('');
  const [pnpChiefName, setPnpChiefName] = useState<string>('');
  const [pnpChiefRank, setPnpChiefRank] = useState<string>('');
  const [discoBodyFontSize, setDiscoBodyFontSize] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLeft, setUploadingLeft] = useState(false);
  const [uploadingRight, setUploadingRight] = useState(false);
  const [logoLeftPreview, setLogoLeftPreview] = useState<string>('');
  const [logoRightPreview, setLogoRightPreview] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const settingsResponse = await api.get('/api/settings');
      const settingsData = settingsResponse.data;

      // Load disco template settings
      setDiscoHeaderLine1(settingsData.disco_header_line_1?.value || 'REPUBLIC OF THE PHILIPPINES');
      setDiscoHeaderLine2(settingsData.disco_header_line_2?.value || 'PROVINCE OF CEBU');
      setDiscoHeaderLine3(settingsData.disco_header_line_3?.value || 'MUNICIPALITY OF DALAGUETE');
      setDiscoHeaderLine4(settingsData.disco_header_line_4?.value || '');
      setDiscoHeaderLine5(settingsData.disco_header_line_5?.value || '');
      setDiscoHeaderFontSize(settingsData.disco_header_font_size?.value || '15');
      
      const logoLeft = settingsData.disco_header_logo_left?.value || '';
      const logoRight = settingsData.disco_header_logo_right?.value || '';
      
      setDiscoHeaderLogoLeft(logoLeft);
      setDiscoHeaderLogoRight(logoRight);
      setLogoLeftPreview(logoLeft);
      setLogoRightPreview(logoRight);

      // Load PNP chief information
      setPnpChiefName(settingsData.disco_pnp_chief_name?.value || '');
      setPnpChiefRank(settingsData.disco_pnp_chief_rank?.value || '');

      // Load body font size
      setDiscoBodyFontSize(settingsData.disco_body_font_size?.value || '15');
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscoSettings = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.put('/api/settings/disco_header_line_1', {
          value: discoHeaderLine1,
          description: 'First line of the Disco permit header'
        }),
        api.put('/api/settings/disco_header_line_2', {
          value: discoHeaderLine2,
          description: 'Second line of the Disco permit header'
        }),
        api.put('/api/settings/disco_header_line_3', {
          value: discoHeaderLine3,
          description: 'Third line of the Disco permit header'
        }),
        api.put('/api/settings/disco_header_line_4', {
          value: discoHeaderLine4,
          description: 'Fourth line of the Disco permit header'
        }),
        api.put('/api/settings/disco_header_line_5', {
          value: discoHeaderLine5,
          description: 'Fifth line of the Disco permit header'
        }),
        api.put('/api/settings/disco_header_font_size', {
          value: discoHeaderFontSize,
          description: 'Font size (px) for Disco permit header text'
        }),
        api.put('/api/settings/disco_header_logo_left', {
          value: discoHeaderLogoLeft,
          description: 'Left logo URL for Disco permit header'
        }),
        api.put('/api/settings/disco_header_logo_right', {
          value: discoHeaderLogoRight,
          description: 'Right logo URL for Disco permit header'
        }),
        api.put('/api/settings/disco_pnp_chief_name', {
          value: pnpChiefName,
          description: 'PNP Chief name for Disco permit'
        }),
        api.put('/api/settings/disco_pnp_chief_rank', {
          value: pnpChiefRank,
          description: 'PNP Chief rank for Disco permit'
        }),
        api.put('/api/settings/disco_body_font_size', {
          value: discoBodyFontSize,
          description: 'Font size (px) for Disco permit body text'
        }),
      ]);
      alert('Disco permit template settings saved!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving disco settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File, position: 'left' | 'right') => {
    if (position === 'left') {
      setUploadingLeft(true);
    } else {
      setUploadingRight(true);
    }

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post('/api/settings/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const imageUrl = response.data.url;

      if (position === 'left') {
        setDiscoHeaderLogoLeft(imageUrl);
        setLogoLeftPreview(imageUrl);
      } else {
        setDiscoHeaderLogoRight(imageUrl);
        setLogoRightPreview(imageUrl);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || `Error uploading ${position} logo`);
    } finally {
      if (position === 'left') {
        setUploadingLeft(false);
      } else {
        setUploadingRight(false);
      }
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
              <span className="text-gray-900 font-medium">Disco Permit Template</span>
            </div>
            
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-rose-600 to-pink-700 flex items-center justify-center shadow-lg">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Disco Permit Template
                </h1>
                <p className="text-sm text-gray-500">Configure the header and layout settings for Disco permit reports</p>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-6 mb-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Customize Your Disco Permit</h3>
                <p className="text-sm text-gray-600">
                  These settings control the appearance of the disco permit report header. You can customize the header text lines, font size, and add logos on either side of the header.
                </p>
              </div>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="p-6 space-y-6">
              {/* Header Text Lines */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Header Text Lines</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line 1</label>
                    <input
                      type="text"
                      value={discoHeaderLine1}
                      onChange={(e) => setDiscoHeaderLine1(e.target.value)}
                      placeholder="e.g. REPUBLIC OF THE PHILIPPINES"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line 2</label>
                    <input
                      type="text"
                      value={discoHeaderLine2}
                      onChange={(e) => setDiscoHeaderLine2(e.target.value)}
                      placeholder="e.g. PROVINCE OF CEBU"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line 3</label>
                    <input
                      type="text"
                      value={discoHeaderLine3}
                      onChange={(e) => setDiscoHeaderLine3(e.target.value)}
                      placeholder="e.g. MUNICIPALITY OF DALAGUETE"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line 4 (Optional)</label>
                    <input
                      type="text"
                      value={discoHeaderLine4}
                      onChange={(e) => setDiscoHeaderLine4(e.target.value)}
                      placeholder="e.g. Department Name"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Line 5 (Optional)</label>
                    <input
                      type="text"
                      value={discoHeaderLine5}
                      onChange={(e) => setDiscoHeaderLine5(e.target.value)}
                      placeholder="e.g. Additional info"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Header Formatting */}
              <div className="border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Header Formatting</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Font Size (px)</label>
                    <input
                      type="number"
                      value={discoHeaderFontSize}
                      onChange={(e) => setDiscoHeaderFontSize(e.target.value)}
                      placeholder="15"
                      min="7"
                      max="20"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Range: 7-20 px</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Left Logo URL</label>
                    <input
                      type="text"
                      value={discoHeaderLogoLeft}
                      onChange={(e) => setDiscoHeaderLogoLeft(e.target.value)}
                      placeholder="/images/logo.png"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Right Logo URL</label>
                    <input
                      type="text"
                      value={discoHeaderLogoRight}
                      onChange={(e) => setDiscoHeaderLogoRight(e.target.value)}
                      placeholder="/images/logo.png"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional</p>
                  </div>
                </div>

                {/* Logo Upload Section */}
                <h3 className="text-base font-semibold text-gray-900 mb-3">Upload Logos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Left Logo</label>
                    <div className="border-2 border-dashed border-rose-300 rounded-xl p-4 bg-rose-50 hover:bg-rose-100 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleLogoUpload(e.target.files[0], 'left');
                          }
                        }}
                        disabled={uploadingLeft}
                        className="hidden"
                        id="left-logo-input"
                      />
                      <label
                        htmlFor="left-logo-input"
                        className="cursor-pointer block"
                      >
                        <div className="text-center">
                          <svg className="mx-auto h-8 w-8 text-rose-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-18-6l6 6m0 0l-6 6m6-6H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">
                            {uploadingLeft ? 'Uploading...' : 'Click to upload left logo'}
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                        </div>
                      </label>
                    </div>
                    {logoLeftPreview && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Preview:</p>
                        <img src={logoLeftPreview} alt="Left Logo Preview" className="h-16 object-contain rounded border border-gray-200" />
                      </div>
                    )}
                  </div>

                  {/* Right Logo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Right Logo</label>
                    <div className="border-2 border-dashed border-rose-300 rounded-xl p-4 bg-rose-50 hover:bg-rose-100 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleLogoUpload(e.target.files[0], 'right');
                          }
                        }}
                        disabled={uploadingRight}
                        className="hidden"
                        id="right-logo-input"
                      />
                      <label
                        htmlFor="right-logo-input"
                        className="cursor-pointer block"
                      >
                        <div className="text-center">
                          <svg className="mx-auto h-8 w-8 text-rose-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20a4 4 0 004 4h24a4 4 0 004-4V20m-18-6l6 6m0 0l-6 6m6-6H6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="mt-2 text-sm text-gray-600">
                            {uploadingRight ? 'Uploading...' : 'Click to upload right logo'}
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                        </div>
                      </label>
                    </div>
                    {logoRightPreview && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-gray-600 mb-2">Preview:</p>
                        <img src={logoRightPreview} alt="Right Logo Preview" className="h-16 object-contain rounded border border-gray-200" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* PNP Chief Information */}
              <div className="border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">PNP Chief Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chief Name</label>
                    <input
                      type="text"
                      value={pnpChiefName}
                      onChange={(e) => setPnpChiefName(e.target.value)}
                      placeholder="e.g. General Juan dela Cruz"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Full name of the PNP Chief</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chief Rank</label>
                    <input
                      type="text"
                      value={pnpChiefRank}
                      onChange={(e) => setPnpChiefRank(e.target.value)}
                      placeholder="e.g. PNP Chief"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Rank or title of the PNP Chief</p>
                  </div>
                </div>
              </div>

              {/* Body Font Size */}
              <div className="border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Body Text Formatting</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Font Size (px)</label>
                    <input
                      type="number"
                      value={discoBodyFontSize}
                      onChange={(e) => setDiscoBodyFontSize(e.target.value)}
                      placeholder="15"
                      min="10"
                      max="18"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-700 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 outline-none transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">Controls the font size of the main permit text (Range: 10-18 px)</p>
                  </div>
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
              onClick={handleSaveDiscoSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 text-white rounded-xl font-medium hover:from-rose-700 hover:to-rose-800 focus:ring-4 focus:ring-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-rose-200"
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
