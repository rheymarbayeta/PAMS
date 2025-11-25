'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

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
          <div>Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">System Settings</h1>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Default Address Settings</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure default address values for new applications. These will be pre-filled when creating new applications.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="default_municipality" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Municipality *
                </label>
                <input
                  id="default_municipality"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Dalaguete"
                  value={formData.default_municipality}
                  onChange={(e) => setFormData({ ...formData, default_municipality: e.target.value })}
                />
                {settings.default_municipality?.description && (
                  <p className="text-xs text-gray-500 mt-1">{settings.default_municipality.description}</p>
                )}
              </div>

              <div>
                <label htmlFor="default_province" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Province *
                </label>
                <input
                  id="default_province"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Cebu"
                  value={formData.default_province}
                  onChange={(e) => setFormData({ ...formData, default_province: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="default_country" className="block text-sm font-medium text-gray-700 mb-2">
                  Default Country *
                </label>
                <input
                  id="default_country"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Philippines"
                  value={formData.default_country}
                  onChange={(e) => setFormData({ ...formData, default_country: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">Municipal Treasurer Signatory</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure the Municipal Treasurer's information. This will be displayed in the assessment report.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="municipal_treasurer_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Municipal Treasurer Name *
                </label>
                <input
                  id="municipal_treasurer_name"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., HAIDEE D. OGOC"
                  value={formData.municipal_treasurer_name}
                  onChange={(e) => setFormData({ ...formData, municipal_treasurer_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="municipal_treasurer_position" className="block text-sm font-medium text-gray-700 mb-2">
                  Municipal Treasurer Position *
                </label>
                <input
                  id="municipal_treasurer_position"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., ACTING MUNICIPAL TREASURER"
                  value={formData.municipal_treasurer_position}
                  onChange={(e) => setFormData({ ...formData, municipal_treasurer_position: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-xl font-bold mb-4">Permit Signatory</h2>
            <p className="text-sm text-gray-600 mb-6">
              Configure the permit signatory's information. This will be displayed on permit documents.
            </p>

            <div className="space-y-4">
              <div>
                <label htmlFor="permit_signatory_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Permit Signatory Name *
                </label>
                <input
                  id="permit_signatory_name"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Juan De la Cruz"
                  value={formData.permit_signatory_name}
                  onChange={(e) => setFormData({ ...formData, permit_signatory_name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="permit_signatory_position" className="block text-sm font-medium text-gray-700 mb-2">
                  Permit Signatory Position *
                </label>
                <input
                  id="permit_signatory_position"
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Business Permit Officer"
                  value={formData.permit_signatory_position}
                  onChange={(e) => setFormData({ ...formData, permit_signatory_position: e.target.value })}
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

