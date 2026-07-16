'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader, Button } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import api from '@/services/api';

type OrgUnitType = 'municipality' | 'office' | 'barangay' | 'division';

interface OrgUnit {
  org_unit_id: string;
  code: string;
  name: string;
  type: string;
  parent_name?: string;
  user_count?: number;
  is_active?: number;
}

export default function OrgUnitsPage() {
  const [rows, setRows] = useState<OrgUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', type: 'office' as OrgUnitType });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/org-units');
      setRows(res.data.data || []);
    } catch (err) {
      console.error(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) return;
    try {
      setSaving(true);
      await api.post('/api/org-units', form);
      setForm({ code: '', name: '', type: 'office' });
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to create org unit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={['settings', 'users', 'org_units_manage']}>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Org Units"
            description="Organizational hierarchy for user assignment and routing"
          />

          <form
            onSubmit={handleCreate}
            className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. MHO"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Municipal Health Office"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as OrgUnitType })}
              >
                <option value="municipality">Municipality</option>
                <option value="office">Office</option>
                <option value="barangay">Barangay</option>
                <option value="division">Division</option>
              </select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Add Unit'}
            </Button>
          </form>

          {loading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No org units yet" description="Create your first organizational unit above." />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Parent</th>
                    <th className="px-4 py-3 font-medium text-right">Users</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.org_unit_id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-slate-800">{row.code}</td>
                      <td className="px-4 py-3">{row.name}</td>
                      <td className="px-4 py-3 capitalize">{row.type}</td>
                      <td className="px-4 py-3 text-slate-500">{row.parent_name || '—'}</td>
                      <td className="px-4 py-3 text-right">{row.user_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
