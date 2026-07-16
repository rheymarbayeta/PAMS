'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/ui/Primitives';
import { LoadingSpinner } from '@/components/ui/PageStates';
import api from '@/services/api';

interface CheckResult {
  status: string;
  latency_ms?: number;
  error?: string;
  reason?: string;
  http_status?: number | null;
  path?: string;
  stats?: Record<string, unknown>;
}

interface HealthResponse {
  status: string;
  time?: string;
  checks?: Record<string, CheckResult>;
}

const statusStyles: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  degraded: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-slate-50 text-slate-500 border-slate-200',
};

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/health/detailed');
      setHealth(res.data);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch health status');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ProtectedRoute allowedPermissions={['settings']}>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="System Health"
            description="Deep health checks for database, disk, queue, and integrations"
            actions={
              <button
                type="button"
                onClick={load}
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Refresh
              </button>
            }
          />

          {loading ? (
            <LoadingSpinner />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          ) : health ? (
            <div className="space-y-4">
              <div
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
                  statusStyles[health.status] || statusStyles.ok
                }`}
              >
                Overall: {health.status}
                {health.time && (
                  <span className="text-xs opacity-70 font-normal">
                    — {new Date(health.time).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(health.checks || {}).map(([name, check]) => (
                  <div key={name} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-slate-800 capitalize">{name}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded border ${
                          statusStyles[check.status] || statusStyles.ok
                        }`}
                      >
                        {check.status}
                      </span>
                    </div>
                    <dl className="text-xs text-slate-600 space-y-1">
                      {check.latency_ms != null && (
                        <div className="flex justify-between">
                          <dt>Latency</dt>
                          <dd>{check.latency_ms} ms</dd>
                        </div>
                      )}
                      {check.http_status != null && (
                        <div className="flex justify-between">
                          <dt>HTTP</dt>
                          <dd>{check.http_status}</dd>
                        </div>
                      )}
                      {check.path && (
                        <div className="flex justify-between">
                          <dt>Path</dt>
                          <dd className="truncate ml-2">{check.path}</dd>
                        </div>
                      )}
                      {check.reason && (
                        <div>
                          <dt className="text-slate-500">Reason</dt>
                          <dd>{check.reason}</dd>
                        </div>
                      )}
                      {check.error && (
                        <div className="text-red-600">
                          <dt>Error</dt>
                          <dd>{check.error}</dd>
                        </div>
                      )}
                      {check.stats && Object.keys(check.stats).length > 0 && (
                        <div>
                          <dt className="text-slate-500 mb-0.5">Queue stats</dt>
                          <dd className="font-mono text-[10px] bg-slate-50 rounded p-2 overflow-x-auto">
                            {JSON.stringify(check.stats)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
