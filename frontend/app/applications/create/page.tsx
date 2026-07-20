'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import { WizardSteps, WizardNav } from '@/components/ui/Wizard';
import { PageHeader, Button } from '@/components/ui/Primitives';
import api from '@/services/api';
import { showAlert } from '@/utils/modal';

const STEPS = [
  { id: 'entity', label: 'Entity' },
  { id: 'permit', label: 'Permit' },
  { id: 'location', label: 'Location' },
  { id: 'review', label: 'Review' },
];

const emptyEntityForm = {
  entity_name: '',
  entity_type: 'INDIVIDUAL',
  firstname: '',
  lastname: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
};

export default function CreateApplicationWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [entities, setEntities] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showAddEntity, setShowAddEntity] = useState(false);
  const [savingEntity, setSavingEntity] = useState(false);
  const [entityForm, setEntityForm] = useState(emptyEntityForm);
  const [form, setForm] = useState({
    entity_id: '',
    entity_name: '',
    rule_id: '',
    permit_type: '',
    barangay: '',
    municipality: 'Dalaguete',
    province: 'Cebu',
    street: '',
  });

  const loadEntities = async () => {
    const e = await api.get('/api/entities');
    return Array.isArray(e.data) ? e.data : e.data?.data || [];
  };

  useEffect(() => {
    (async () => {
      try {
        const [list, r] = await Promise.all([
          loadEntities(),
          api.get('/api/assessment-rules'),
        ]);
        setEntities(list);
        const active = (r.data || []).filter((x: any) => x.is_active);
        setRules(active);

        const params = new URLSearchParams(window.location.search);
        const presetEntity = params.get('entity_id');
        if (presetEntity) {
          const match = list.find((x: any) => x.entity_id === presetEntity);
          if (match) {
            setForm((prev) => ({
              ...prev,
              entity_id: match.entity_id,
              entity_name: match.entity_name,
            }));
          }
        }
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const selectedRule = rules.find((r) => r.rule_id === form.rule_id);

  const canNext =
    (step === 0 && !!form.entity_id) ||
    (step === 1 && !!form.rule_id) ||
    (step === 2 && !!form.barangay) ||
    step === 3;

  const createEntity = async () => {
    if (!entityForm.entity_name.trim()) {
      showAlert('Entity name is required');
      return;
    }
    try {
      setSavingEntity(true);
      const res = await api.post('/api/entities', {
        ...entityForm,
        entity_name: entityForm.entity_name.trim(),
        contact_person:
          entityForm.contact_person.trim() ||
          [entityForm.firstname, entityForm.lastname].filter(Boolean).join(' ') ||
          null,
      });
      const created = res.data;
      const list = await loadEntities();
      setEntities(list);
      setForm((f) => ({
        ...f,
        entity_id: created.entity_id,
        entity_name: created.entity_name,
      }));
      setEntityForm(emptyEntityForm);
      setShowAddEntity(false);
      showAlert('Entity created and selected');
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to create entity');
    } finally {
      setSavingEntity(false);
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      const permitLabel = selectedRule
        ? `${selectedRule.permit_type_name}${selectedRule.attribute_name ? ` - ${selectedRule.attribute_name}` : ''}`
        : form.permit_type;
      const res = await api.post('/api/applications', {
        entity_id: form.entity_id,
        permit_type: permitLabel,
        rule_id: form.rule_id,
        parameters: [
          { param_name: 'Barangay', param_value: form.barangay },
          { param_name: 'Municipality', param_value: form.municipality },
          { param_name: 'Province', param_value: form.province },
          { param_name: 'Street/Sitio', param_value: form.street },
        ].filter((p) => p.param_value),
      });
      showAlert('Application created');
      router.push(`/applications/${res.data.application_id || res.data.id}`);
    } catch (err: any) {
      showAlert(err.response?.data?.error || 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedPermissions={['create_applications', 'applications']}>
      <Layout>
        <div className="max-w-3xl mx-auto">
          <PageHeader
            title="New Application"
            description="Guided application wizard"
          />

          <WizardSteps steps={STEPS} current={step} onStepClick={(i) => i <= step && setStep(i)} />

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            {step === 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="block text-sm font-medium text-slate-700">Select entity</label>
                  <button
                    type="button"
                    onClick={() => setShowAddEntity((v) => !v)}
                    className="text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    {showAddEntity ? 'Cancel' : '+ Add new entity'}
                  </button>
                </div>

                {!showAddEntity ? (
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    value={form.entity_id}
                    onChange={(e) => {
                      const ent = entities.find((x) => x.entity_id === e.target.value);
                      setForm((f) => ({
                        ...f,
                        entity_id: e.target.value,
                        entity_name: ent?.entity_name || '',
                      }));
                    }}
                  >
                    <option value="">Choose...</option>
                    {entities.map((ent) => (
                      <option key={ent.entity_id} value={ent.entity_id}>
                        {ent.entity_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
                    <p className="text-sm text-slate-600">
                      Create a new entity here, or use the{' '}
                      <Link
                        href="/admin/entities/add-entity"
                        className="text-teal-700 hover:underline"
                      >
                        full entity form
                      </Link>{' '}
                      (eTracs search, etc.).
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Entity name *
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={entityForm.entity_name}
                        onChange={(e) =>
                          setEntityForm((f) => ({ ...f, entity_name: e.target.value }))
                        }
                        placeholder="Business or individual name"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                        <select
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                          value={entityForm.entity_type}
                          onChange={(e) =>
                            setEntityForm((f) => ({ ...f, entity_type: e.target.value }))
                          }
                        >
                          <option value="INDIVIDUAL">Individual</option>
                          <option value="JURIDICAL">Juridical / Business</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                        <input
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                          value={entityForm.phone}
                          onChange={(e) => setEntityForm((f) => ({ ...f, phone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          First name
                        </label>
                        <input
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                          value={entityForm.firstname}
                          onChange={(e) =>
                            setEntityForm((f) => ({ ...f, firstname: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Last name
                        </label>
                        <input
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                          value={entityForm.lastname}
                          onChange={(e) =>
                            setEntityForm((f) => ({ ...f, lastname: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Contact person
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={entityForm.contact_person}
                        onChange={(e) =>
                          setEntityForm((f) => ({ ...f, contact_person: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={entityForm.address}
                        onChange={(e) => setEntityForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setShowAddEntity(false);
                          setEntityForm(emptyEntityForm);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="button" onClick={createEntity} disabled={savingEntity}>
                        {savingEntity ? 'Saving…' : 'Save & select entity'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Assessment rule / permit type</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={form.rule_id}
                  onChange={(e) => {
                    const rule = rules.find((x) => x.rule_id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      rule_id: e.target.value,
                      permit_type: rule
                        ? `${rule.permit_type_name}${rule.attribute_name ? ` - ${rule.attribute_name}` : ''}`
                        : '',
                    }));
                  }}
                >
                  <option value="">Choose...</option>
                  {rules.map((rule) => (
                    <option key={rule.rule_id} value={rule.rule_id}>
                      {rule.rule_name || `${rule.permit_type_name} - ${rule.attribute_name}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {step === 2 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {(['street', 'barangay', 'municipality', 'province'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium text-slate-700 capitalize">{field}</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-1"
                      value={(form as any)[field]}
                      onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            {step === 3 && (
              <dl className="text-sm space-y-2">
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Entity</dt><dd className="font-medium">{form.entity_name}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Permit</dt><dd className="font-medium text-right">{form.permit_type}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-slate-500">Location</dt><dd className="font-medium text-right">{[form.street, form.barangay, form.municipality, form.province].filter(Boolean).join(', ')}</dd></div>
              </dl>
            )}

            <WizardNav
              onBack={step > 0 ? () => setStep((s) => s - 1) : undefined}
              onNext={() => {
                if (step < STEPS.length - 1) setStep((s) => s + 1);
                else submit();
              }}
              canNext={canNext && !showAddEntity}
              isLast={step === STEPS.length - 1}
              nextLabel={step === STEPS.length - 1 ? 'Create application' : 'Continue'}
              submitting={submitting}
            />
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
