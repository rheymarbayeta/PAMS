'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { PageHeader } from '@/components/ui/Primitives';
import { useAuth } from '@/contexts/AuthContext';

const REPORT_CARDS = [
  {
    href: '/reports',
    title: 'Permit Reports',
    description: 'Application listings, status filters, and export',
    permissions: ['reports', 'view_reports', 'applications'],
  },
  {
    href: '/admin/waterworks/reports',
    title: 'Waterworks Collection',
    description: 'Billing and collection summaries',
    permissions: ['waterworks_reports', 'waterworks_view'],
  },
  {
    href: '/admin/rights-and-rentals/reports',
    title: 'Rights & Rentals Reports',
    description: 'Lease and payment reports',
    permissions: ['rights_rentals_view_reports', 'rights_rentals_view'],
  },
  {
    href: '/admin/report-templates',
    title: 'Report Templates',
    description: 'HTML/DOCX template management',
    permissions: ['reports', 'settings'],
  },
  {
    href: '/admin/payments-ledger',
    title: 'Payment Ledger',
    description: 'Cross-module payment reconciliation',
    permissions: ['reports', 'view_reports', 'settings'],
  },
];

export default function ReportsHubPage() {
  const { hasPermission } = useAuth();

  const visible = REPORT_CARDS.filter((c) => hasPermission(c.permissions));

  return (
    <ProtectedRoute allowedPermissions={['reports', 'view_reports', 'waterworks_reports', 'rights_rentals_view_reports', 'settings']}>
      <Layout>
        <div className="max-w-5xl mx-auto">
          <PageHeader
            title="Reports Hub"
            description="One place for permit, waterworks, rentals, and ledger reports"
          />
          <div className="grid sm:grid-cols-2 gap-4">
            {visible.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-teal-300 hover:bg-teal-50/40 transition-colors"
              >
                <h2 className="text-base font-semibold text-slate-800">{card.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
