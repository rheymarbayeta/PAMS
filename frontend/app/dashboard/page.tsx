'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useRouter } from 'next/navigation';

interface DashboardStats {
  pending: number;
  pendingApproval: number;
  approved: number;
  total: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    pendingApproval: 0,
    approved: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div>Loading...</div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition"
              onClick={() => router.push('/applications?filter=Pending')}
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending Applications
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition"
              onClick={() => router.push('/applications?filter=Pending Approval')}
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{stats.pendingApproval}</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending Approval
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition"
              onClick={() => router.push('/applications?filter=Approved')}
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Approved
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
            <div
              className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition"
              onClick={() => router.push('/applications')}
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Applications
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

