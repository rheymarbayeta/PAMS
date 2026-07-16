'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import LeaseContractForm from '@/components/LeaseContractForm';
import { WizardSteps } from '@/components/ui/Wizard';
import api from '@/services/api';

const STEPS = [
  { id: 'parties', label: 'Parties & Units' },
  { id: 'terms', label: 'Contract Terms' },
  { id: 'opening', label: 'Opening Balances' },
  { id: 'review', label: 'Submit' },
];

export default function AddLeaseContractPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const response = await api.post('/api/rights-and-rentals/lease-contracts', data);
      router.push(`/admin/rights-and-rentals/lease-contracts/${response.data.id}`);
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Link
                href="/admin/rights-and-rentals/lease-contracts"
                className="text-indigo-600 hover:text-indigo-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Add New Lease Contract</h1>
                <p className="text-gray-600 mt-1">Guided lease setup — complete the form sections below</p>
              </div>
            </div>
            <WizardSteps steps={STEPS} current={guideStep} onStepClick={setGuideStep} />
            <p className="text-sm text-slate-500 mb-4">
              {guideStep === 0 && 'Select lessee, property, and units.'}
              {guideStep === 1 && 'Enter contract dates and monthly amounts.'}
              {guideStep === 2 && 'Enter legacy opening balances if applicable.'}
              {guideStep === 3 && 'Review fields in the form, then submit.'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 md:p-8">
            <LeaseContractForm
              onSubmit={handleSubmit}
              submitLabel="Create Lease Contract"
              isLoading={isLoading}
            />
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
