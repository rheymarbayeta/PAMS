'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader, Button } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import api from '@/services/api';

type Frequency = 'daily' | 'weekly' | 'monthly';

interface ScheduledReport {
  schedule_id: string;
  name: string;
  report_type: string;
  frequency: string;
  is_active?: number;
  next_run_at?: string;
  created_at?: string;
}

export default function ScheduledReportsPage() {
  const [rows, setRows] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    report_type: 'applications_summary',
    frequency: 'daily' as Frequency,
  });

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/scheduled-reports');
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
    if (!form.name.trim() || !form.report_type.trim()) return;
    try {
      setSaving(true);
      await api.post('/api/scheduled-reports', form);
      setForm({ name: '', report_type: 'applications_summary', frequency: 'daily' });
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to create scheduled report');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={['reports', 'view_reports', 'settings']}>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Scheduled Reports"
            description="Automated report generation on a recurring schedule"
          />

          <form
            onSubmit={handleCreate}
            className="bg-white border border-slate-200 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Daily applications summary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Report Type</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.report_type}
                onChange={(e) => setForm({ ...form, report_type: e.target.value })}
                placeholder="applications_summary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Frequency</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Schedule'}
            </Button>
          </form>

          {loading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No scheduled reports" description="Create a schedule to run reports automatically." />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Frequency</th>
                    <th className="px-4 py-3 font-medium">Next Run</th>
                    <th className="px-4 py-3 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.schedule_id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.report_type}</td>
                      <td className="px-4 py-3 capitalize">{row.frequency}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.next_run_at ? new Date(row.next_run_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {row.is_active !== 0 ? (
                          <span className="text-emerald-700 text-xs font-medium">Yes</span>
                        ) : (
                          <span className="text-slate-400 text-xs">No</span>
                        )}
                      </td>
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
