'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface Application {
  application_id: number;
  application_number: string | null;
  entity_name: string;
  permit_type: string;
  status: string;
  creator_name: string;
  assessor_name: string | null;
  approver_name: string | null;
  created_at: string;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { user, hasRole } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchApplications();
    const urlFilter = new URLSearchParams(window.location.search).get('filter');
    if (urlFilter) {
      setFilter(urlFilter);
    }
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/api/applications');
      setApplications(response.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApplication = async (e: React.MouseEvent, applicationId: number) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/applications/${applicationId}`);
      alert('Application deleted successfully');
      fetchApplications();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting application');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Assessed':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Pending Approval':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Approved':
      case 'Paid':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Issued':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Released':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredApplications = (filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter))
    .filter(app => 
      (app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      app.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.permit_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
              <p className="mt-4 text-slate-600 font-medium">Loading applications...</p>
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">
                  Applications
                </h1>
                <p className="text-xs sm:text-sm text-slate-500">{filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:flex-none sm:min-w-64">
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 pl-10 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none"
                  aria-label="Search applications"
                />
                <svg className="absolute left-3 top-3 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <label htmlFor="status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full sm:w-auto border border-slate-200 rounded-lg px-3 sm:px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all duration-200 outline-none cursor-pointer"
                aria-label="Filter applications by status"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Assessed">Assessed</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Paid">Paid</option>
                <option value="Issued">Issued</option>
                <option value="Released">Released</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {filteredApplications.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-slate-100 flex items-center justify-center mb-3 sm:mb-4">
                  <svg className="h-6 w-6 sm:h-8 sm:w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">No applications found</p>
                <p className="text-slate-400 text-sm mt-1">Try adjusting your filter</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredApplications.map((app, index) => (
                  <li
                    key={app.application_id}
                    className="group hover:bg-slate-50/80 transition-colors duration-150"
                  >
                    <div className="px-4 sm:px-6 py-4 sm:py-5 flex items-start sm:items-center justify-between gap-3">
                      <div 
                        className="flex-1 cursor-pointer min-w-0"
                        onClick={() => router.push(`/applications/${app.application_id}`)}
                      >
                        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-wrap">
                          <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px] sm:max-w-none">
                            {app.application_number || `Application #${app.application_id}`}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border ${getStatusColor(app.status)}`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <div className="mt-1.5 sm:mt-2 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 text-sm text-slate-600">
                          <span className="font-medium text-slate-700 truncate">{app.entity_name}</span>
                          <span className="hidden sm:inline text-slate-300">•</span>
                          <span className="text-slate-500 text-xs sm:text-sm">{app.permit_type}</span>
                        </div>
                        <div className="mt-1 sm:mt-1.5 flex items-center gap-2 text-[10px] sm:text-xs text-slate-400">
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="hidden sm:inline">Created by {app.creator_name}</span>
                          <span className="sm:hidden">{app.creator_name}</span>
                          <span className="text-slate-300">•</span>
                          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {/* SuperAdmin can delete any, others can only delete Pending applications */}
                        {(hasRole('SuperAdmin') || (hasRole(['Admin', 'Application Creator']) && app.status === 'Pending')) && (
                          <button
                            onClick={(e) => handleDeleteApplication(e, app.application_id)}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-md border border-red-200 hover:border-red-600 transition-all duration-200"
                            title={hasRole('SuperAdmin') ? 'Delete application' : 'Delete pending application'}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                        <div 
                          className="h-8 w-8 sm:h-8 sm:w-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-teal-100 transition-colors cursor-pointer touch-target"
                          onClick={() => router.push(`/applications/${app.application_id}`)}
                        >
                          <svg
                            className="h-4 w-4 text-slate-400 group-hover:text-teal-600 transition-colors"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

