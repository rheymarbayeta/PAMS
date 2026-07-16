'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader, Button } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import api from '@/services/api';

interface ApprovalChain {
  chain_id: string;
  name: string;
  step_count?: number;
  is_active?: number;
  created_at?: string;
}

export default function ApprovalChainsPage() {
  const [rows, setRows] = useState<ApprovalChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [step1Role, setStep1Role] = useState('Assessor');
  const [step1Sla, setStep1Sla] = useState('48');
  const [step2Role, setStep2Role] = useState('Approver');
  const [step2Sla, setStep2Sla] = useState('48');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/approval-chains');
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
    if (!name.trim()) return;
    try {
      setSaving(true);
      await api.post('/api/approval-chains', {
        name: name.trim(),
        steps: [
          { role_name: step1Role.trim(), sla_hours: parseInt(step1Sla, 10) || 48, step_order: 1 },
          { role_name: step2Role.trim(), sla_hours: parseInt(step2Sla, 10) || 48, step_order: 2 },
        ],
      });
      setName('');
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to create approval chain');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={['settings', 'permits']}>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Approval Chains"
            description="Define multi-step approval workflows with SLA targets"
          />

          <form
            onSubmit={handleCreate}
            className="bg-white border border-slate-200 rounded-xl p-4 mb-6 space-y-4"
          >
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Chain Name</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Standard permit approval"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-100 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Step 1</p>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={step1Role}
                  onChange={(e) => setStep1Role(e.target.value)}
                  placeholder="Role name"
                />
                <input
                  type="number"
                  min={1}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={step1Sla}
                  onChange={(e) => setStep1Sla(e.target.value)}
                  placeholder="SLA hours"
                />
              </div>
              <div className="border border-slate-100 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase">Step 2</p>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={step2Role}
                  onChange={(e) => setStep2Role(e.target.value)}
                  placeholder="Role name"
                />
                <input
                  type="number"
                  min={1}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={step2Sla}
                  onChange={(e) => setStep2Sla(e.target.value)}
                  placeholder="SLA hours"
                />
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Chain'}
            </Button>
          </form>

          {loading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No approval chains" description="Create a chain to define approval steps." />
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Steps</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.chain_id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                      <td className="px-4 py-3">{row.step_count ?? 0}</td>
                      <td className="px-4 py-3">
                        {row.is_active !== 0 ? (
                          <span className="text-emerald-700 text-xs font-medium">Active</span>
                        ) : (
                          <span className="text-slate-400 text-xs">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString() : '—'}
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
