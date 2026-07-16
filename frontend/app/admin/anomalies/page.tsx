'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/ui/Primitives';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import api from '@/services/api';

interface Anomaly {
  type: string;
  severity: string;
  module: string;
  reference_id?: string;
  message: string;
  score?: number;
  detected_at?: string;
  account_number?: string;
}

const severityStyles: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function AnomaliesPage() {
  const [rows, setRows] = useState<Anomaly[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/anomalies');
        setRows(res.data.data || []);
        setCount(res.data.count ?? res.data.data?.length ?? 0);
      } catch (err) {
        console.error(err);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ProtectedRoute allowedPermissions={['dashboard_view', 'waterworks_view', 'settings']}>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <PageHeader
            title="Anomalies"
            description={`Rule-based anomaly detection across modules (${count} detected)`}
          />

          {loading ? (
            <LoadingSpinner />
          ) : rows.length === 0 ? (
            <EmptyState title="No anomalies detected" description="Everything looks normal for now." />
          ) : (
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div
                  key={`${row.type}-${row.reference_id}-${i}`}
                  className="bg-white border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded border ${
                        severityStyles[row.severity] || severityStyles.low
                      }`}
                    >
                      {row.severity}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{row.module}</span>
                    <span className="text-xs font-mono text-slate-400">{row.type}</span>
                    {row.score != null && (
                      <span className="text-xs text-slate-400 ml-auto">Score: {row.score.toFixed(2)}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-800">{row.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                    {row.reference_id && <span>Ref: {row.reference_id}</span>}
                    {row.account_number && <span>Account: {row.account_number}</span>}
                    {row.detected_at && (
                      <span>{new Date(row.detected_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
