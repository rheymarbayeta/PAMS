'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { LoadingSpinner, EmptyState } from '@/components/ui/PageStates';
import api from '@/services/api';

interface Task {
  id: string;
  module: string;
  type: string;
  title: string;
  subtitle?: string;
  status?: string;
  href: string;
  created_at?: string;
}

export default function MyWorkPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/tasks');
        setTasks(res.data.data || []);
        setSummary(res.data.summary?.by_module || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ProtectedRoute allowedPermissions={['tasks_view', 'dashboard_view', 'applications', 'waterworks_view']}>
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">My Work</h1>
            <p className="text-sm text-slate-500 mt-1">
              Pending actions across permits, waterworks, and other modules
            </p>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading tasks..." />
          ) : tasks.length === 0 ? (
            <EmptyState title="You're all caught up" description="No pending tasks right now." />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-4 text-xs text-slate-600">
                {Object.entries(summary).map(([mod, count]) => (
                  <span key={mod} className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200">
                    {mod}: {count}
                  </span>
                ))}
              </div>
              <ul className="space-y-2">
                {tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={task.href}
                      className="block bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{task.title}</p>
                          {task.subtitle && (
                            <p className="text-xs text-slate-500 mt-0.5">{task.subtitle}</p>
                          )}
                        </div>
                        <span className="text-xs uppercase tracking-wide text-slate-400 flex-shrink-0">
                          {task.module}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
