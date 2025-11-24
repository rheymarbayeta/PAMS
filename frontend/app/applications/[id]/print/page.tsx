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
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <p>Generating PDF permit...</p>
            <p className="text-sm text-gray-500 mt-2">
              If the download doesn't start, check your browser's download settings.
            </p>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

