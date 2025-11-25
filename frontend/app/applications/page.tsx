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
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

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
        return 'bg-yellow-100 text-yellow-800';
      case 'Assessed':
        return 'bg-blue-100 text-blue-800';
      case 'Pending Approval':
        return 'bg-orange-100 text-orange-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredApplications = filter === 'all' 
    ? applications 
    : applications.filter(app => app.status === filter);

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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
            <div className="flex flex-col items-end">
              <label htmlFor="status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2"
                aria-label="Filter applications by status"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Assessed">Assessed</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {filteredApplications.length === 0 ? (
                <li className="px-4 py-4 text-center text-gray-500">
                  No applications found
                </li>
              ) : (
                filteredApplications.map((app) => (
                  <li
                    key={app.application_id}
                    className="px-4 py-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 cursor-pointer"
                        onClick={() => router.push(`/applications/${app.application_id}`)}
                      >
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {app.application_number || `Application #${app.application_id}`}
                          </div>
                          <span
                            className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              app.status
                            )}`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500">
                          <span className="font-medium">{app.entity_name}</span> • {app.permit_type}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Created by {app.creator_name} • {new Date(app.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {user?.role_name === 'SuperAdmin' && (
                          <button
                            onClick={(e) => handleDeleteApplication(e, app.application_id)}
                            className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 border border-red-300"
                            title="Delete application (SuperAdmin only)"
                          >
                            Delete
                          </button>
                        )}
                        <svg
                          className="h-5 w-5 text-gray-400"
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
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

