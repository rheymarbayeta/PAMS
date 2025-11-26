'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

export default function PrintPermitPage() {
  const params = useParams();

  useEffect(() => {
    const printPermit = async () => {
      try {
        const response = await api.get(`/api/applications/${params.id}/print`, {
          responseType: 'blob',
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `permit-${params.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Open in new tab as well
        window.open(url, '_blank');
      } catch (error: any) {
        alert(error.response?.data?.error || 'Error generating PDF');
      }
    };

    printPermit();
  }, [params.id]);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4 py-6 sm:px-0">
          <div className="bg-white shadow-lg shadow-gray-200/50 rounded-2xl border border-gray-100 p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Generating PDF Permit</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent"></div>
              <p className="text-gray-600">Please wait...</p>
            </div>
            <p className="text-sm text-gray-500">
              If the download doesn&apos;t start automatically, please check your browser&apos;s download settings or pop-up blocker.
            </p>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

