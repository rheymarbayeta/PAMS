'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { WizardSteps, WizardNav } from '@/components/ui/Wizard';
import { PageHeader } from '@/components/ui/Primitives';
import { VIOLATIONS } from '@/features/citations/constants';
import api from '@/services/api';
import { showAlert } from '@/utils/modal';

const STEPS = [
  { id: 'driver', label: 'Driver' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'violations', label: 'Violations' },
  { id: 'review', label: 'Review' },
];

export default function CreateCitationWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [enforcers, setEnforcers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    ticketNumber: '',
    driverName: '',
    driverAddress: '',
    licenseNumber: '',
    plateNumber: '',
    vehicleType: '',
    vehicleColor: '',
    vehicleOwner: '',
    violations: [] as string[],
    otherViolations: '',
    placeViolation: '',
    violationDate: new Date().toISOString().slice(0, 10),
    violationTime: '',
    fineAmount: '',
    enforcerId: '',
    remarks: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/enforcers');
        setEnforcers(Array.isArray(res.data) ? res.data : res.data?.data || []);
      } catch {
        setEnforcers([]);
      }
    })();
  }, []);

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleViolation = (v: string) => {
    setForm((prev) => {
      const nextViolations = prev.violations.includes(v)
        ? prev.violations.filter((x) => x !== v)
        : [...prev.violations, v];
      return {
        ...prev,
        violations: nextViolations,
        otherViolations: nextViolations.includes('Others') ? prev.otherViolations : '',
      };
    });
  };

  const canNext =
    (step === 0 && !!form.ticketNumber.trim() && !!form.driverName.trim()) ||
    (step === 1 && !!form.plateNumber.trim()) ||
    (step === 2 &&
      form.violations.length > 0 &&
      (!form.violations.includes('Others') || !!form.otherViolations.trim())) ||
    step === 3;

  const submit = async () => {
    try {
      if (form.violations.includes('Others') && !form.otherViolations.trim()) {
        await showAlert('Please specify the violation under Others.');
        return;
      }
      setSubmitting(true);
      const resolvedViolations = form.violations.map((v) =>
        v === 'Others' && form.otherViolations.trim()
          ? `Others: ${form.otherViolations.trim().toUpperCase()}`
          : v
      );
      const res = await api.post('/api/citations', {
        ticketNumber: form.ticketNumber.trim(),
        driverName: form.driverName,
        driverAddress: form.driverAddress || undefined,
        licenseNumber: form.licenseNumber || undefined,
        plateNumber: form.plateNumber,
        vehicleType: form.vehicleType || undefined,
        vehicleColor: form.vehicleColor || undefined,
        vehicleOwner: form.vehicleOwner || undefined,
        violations: resolvedViolations,
        otherViolations: form.otherViolations.trim() || undefined,
        violationLocation: form.placeViolation || undefined,
        placeViolation: form.placeViolation || undefined,
        violationDate: form.violationDate,
        violationTime: form.violationTime || undefined,
        fineAmount: parseFloat(form.fineAmount) || 0,
        enforcerId: form.enforcerId || undefined,
        remarks: form.remarks || undefined,
        paymentStatus: 'Pending',
      });
      const id = res.data?.citation_id || res.data?.data?.citation_id || res.data?.id;
      showAlert('Citation created');
      router.push(id ? `/citations/${id}` : '/citations');
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to create citation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={['citations', 'create_citations']}>
      <Layout>
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="New Citation"
            description="Guided citation entry"
            actions={
              <Link href="/citations" className="text-sm text-slate-600 hover:underline">
                Back to list
              </Link>
            }
          />
          <WizardSteps steps={STEPS} current={step} onStepClick={(i) => i <= step && setStep(i)} />

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            {step === 0 && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Ticket number *
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.ticketNumber}
                    onChange={(e) => set('ticketNumber', e.target.value)}
                    placeholder="e.g. TKT-2026-001234"
                    autoFocus
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Driver name *
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.driverName}
                    onChange={(e) => set('driverName', e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Address
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.driverAddress}
                    onChange={(e) => set('driverAddress', e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  License number
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.licenseNumber}
                    onChange={(e) => set('licenseNumber', e.target.value)}
                  />
                </label>
              </>
            )}

            {step === 1 && (
              <>
                <label className="block text-sm font-medium text-slate-700">
                  Plate number *
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.plateNumber}
                    onChange={(e) => set('plateNumber', e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Vehicle type
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                      value={form.vehicleType}
                      onChange={(e) => set('vehicleType', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Color
                    <input
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                      value={form.vehicleColor}
                      onChange={(e) => set('vehicleColor', e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Vehicle owner
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.vehicleOwner}
                    onChange={(e) => set('vehicleOwner', e.target.value)}
                  />
                </label>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border border-slate-100 rounded-lg p-3">
                  {VIOLATIONS.map((v) => (
                    <label key={v} className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.violations.includes(v)}
                        onChange={() => toggleViolation(v)}
                        className="mt-0.5"
                      />
                      <span>{v}</span>
                    </label>
                  ))}
                </div>
                {form.violations.includes('Others') && (
                  <label className="block text-sm font-medium text-slate-700">
                    Specify other violation
                    <input
                      type="text"
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                      placeholder="Describe the violation committed"
                      value={form.otherViolations}
                      onChange={(e) => set('otherViolations', e.target.value)}
                      required
                    />
                  </label>
                )}
                <label className="block text-sm font-medium text-slate-700">
                  Place of violation
                  <input
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.placeViolation}
                    onChange={(e) => set('placeViolation', e.target.value)}
                  />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block text-sm font-medium text-slate-700">
                    Date
                    <input
                      type="date"
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                      value={form.violationDate}
                      onChange={(e) => set('violationDate', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Time
                    <input
                      type="time"
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                      value={form.violationTime}
                      onChange={(e) => set('violationTime', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Fine amount
                    <input
                      type="number"
                      min="0"
                      className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                      value={form.fineAmount}
                      onChange={(e) => set('fineAmount', e.target.value)}
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Enforcer
                  <select
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={form.enforcerId}
                    onChange={(e) => set('enforcerId', e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {enforcers.map((e) => (
                      <option key={e.enforcer_id || e.id} value={e.enforcer_id || e.id}>
                        {e.full_name || e.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {step === 3 && (
              <div className="text-sm text-slate-700 space-y-2">
                <p>
                  <strong>Ticket #:</strong> {form.ticketNumber}
                </p>
                <p>
                  <strong>Driver:</strong> {form.driverName}
                </p>
                <p>
                  <strong>Plate:</strong> {form.plateNumber}
                </p>
                <p>
                  <strong>Violations:</strong>{' '}
                  {form.violations
                    .map((v) =>
                      v === 'Others' && form.otherViolations.trim()
                        ? `Others: ${form.otherViolations.trim()}`
                        : v
                    )
                    .join(', ') || '—'}
                </p>
                <p>
                  <strong>Fine:</strong> ₱{Number(form.fineAmount || 0).toLocaleString()}
                </p>
                <p>
                  <strong>Date:</strong> {form.violationDate}
                </p>
                <label className="block text-sm font-medium text-slate-700 pt-2">
                  Remarks
                  <textarea
                    className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                    rows={3}
                    value={form.remarks}
                    onChange={(e) => set('remarks', e.target.value)}
                  />
                </label>
              </div>
            )}

            <WizardNav
              onBack={step > 0 ? () => setStep(step - 1) : undefined}
              onNext={() => (step === 3 ? submit() : setStep(step + 1))}
              canNext={canNext}
              isLast={step === 3}
              nextLabel={step === 3 ? 'Create citation' : 'Continue'}
              submitting={submitting}
            />
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
