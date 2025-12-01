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
  issued: number;
  released: number;
  total: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    pendingApproval: 0,
    approved: 0,
    issued: 0,
    released: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [permitCategories, setPermitCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetchPermitCategories();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedCategory]);

  const fetchPermitCategories = async () => {
    try {
      const response = await api.get('/api/dashboard/permit-categories');
      setPermitCategories(response.data);
    } catch (error) {
      console.error('Error fetching permit categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = selectedCategory ? `?permitCategory=${encodeURIComponent(selectedCategory)}` : '';
      const response = await api.get(`/api/dashboard/stats${params}`);
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
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-slate-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-slate-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-slate-600 font-medium">Loading dashboard...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                  Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">Overview of application statistics</p>
              </div>
            </div>
          </div>

          {/* Permit Category Tabs */}
          {permitCategories.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    selectedCategory === ''
                      ? 'bg-slate-800 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Permits
                </button>
                {permitCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedCategory === category
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid - 2 columns on mobile, 3 on tablet, 6 on desktop */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 sm:grid-cols-3 xl:grid-cols-6">
            {/* Pending Applications */}
            <div
              className="group bg-white rounded-xl border border-slate-200 p-3 sm:p-5 cursor-pointer hover:border-amber-300 hover:shadow-soft transition-all duration-200 active:scale-[0.98]"
              onClick={() => router.push('/applications?filter=Pending')}
            >
              <div className="flex items-start sm:items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 truncate">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.pending}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-amber-600">
                <span className="font-medium">View all</span>
                <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Pending Approval */}
            <div
              className="group bg-white rounded-xl border border-slate-200 p-3 sm:p-5 cursor-pointer hover:border-orange-300 hover:shadow-soft transition-all duration-200 active:scale-[0.98]"
              onClick={() => router.push('/applications?filter=Pending Approval')}
            >
              <div className="flex items-start sm:items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 truncate">For Approval</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.pendingApproval}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-orange-600">
                <span className="font-medium">View all</span>
                <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Approved */}
            <div
              className="group bg-white rounded-xl border border-slate-200 p-3 sm:p-5 cursor-pointer hover:border-teal-300 hover:shadow-soft transition-all duration-200 active:scale-[0.98]"
              onClick={() => router.push('/applications?filter=Approved')}
            >
              <div className="flex items-start sm:items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Approved</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.approved}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-teal-600">
                <span className="font-medium">View all</span>
                <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Issued */}
            <div
              className="group bg-white rounded-xl border border-slate-200 p-3 sm:p-5 cursor-pointer hover:border-sky-300 hover:shadow-soft transition-all duration-200 active:scale-[0.98]"
              onClick={() => router.push('/applications?filter=Issued')}
            >
              <div className="flex items-start sm:items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Issued</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.issued}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-sky-50 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-sky-600">
                <span className="font-medium">View all</span>
                <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Released */}
            <div
              className="group bg-white rounded-xl border border-slate-200 p-3 sm:p-5 cursor-pointer hover:border-emerald-300 hover:shadow-soft transition-all duration-200 active:scale-[0.98]"
              onClick={() => router.push('/applications?filter=Released')}
            >
              <div className="flex items-start sm:items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Released</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.released}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-emerald-600">
                <span className="font-medium">View all</span>
                <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Total Applications */}
            <div
              className="group bg-white rounded-xl border border-slate-200 p-3 sm:p-5 cursor-pointer hover:border-slate-400 hover:shadow-soft transition-all duration-200 active:scale-[0.98]"
              onClick={() => router.push('/applications')}
            >
              <div className="flex items-start sm:items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1">Total</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.total}</p>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-slate-600">
                <span className="font-medium">View all</span>
                <svg className="ml-1 h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

