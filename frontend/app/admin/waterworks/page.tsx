'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import waterworksService, { WaterSupply, RateTier, BillingModel } from '@/services/waterworksService';
import api from '@/services/api';
import { showAlert, showConfirm } from '@/utils/modal';
import { formatPeso } from '@/utils/formatters';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];
const SUPPLY_CODE_MAX_LENGTH = 20;
const SCHEDULE_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function formatOrdinal(day: number): string {
  const mod10 = day % 10;
  const mod100 = day % 100;
  if (mod10 === 1 && mod100 !== 11) return `${day}st`;
  if (mod10 === 2 && mod100 !== 12) return `${day}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${day}rd`;
  return `${day}th`;
}

function formatReadingSchedule(supply: Pick<WaterSupply, 'reading_day_from' | 'reading_day_to'>): string {
  const from = supply.reading_day_from;
  const to = supply.reading_day_to;
  if (!from && !to) return '—';
  if (from && to) {
    return from === to
      ? `${formatOrdinal(from)} of the month`
      : `${formatOrdinal(from)} – ${formatOrdinal(to)} of the month`;
  }
  if (from) return `From ${formatOrdinal(from)} of the month`;
  return `Until ${formatOrdinal(to!)} of the month`;
}

function formatBillingSchedule(supply: Pick<WaterSupply, 'billing_day'>): string {
  return supply.billing_day ? `${formatOrdinal(supply.billing_day)} of the month` : '—';
}

function sanitizeSupplyCodeInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, SUPPLY_CODE_MAX_LENGTH);
}

interface UserOption {
  user_id: string;
  full_name: string;
  username: string;
}

const BILLING_MODEL_LABELS: Record<BillingModel, string> = {
  progressive: 'Progressive (minimum + per m³ blocks)',
  bracket_flat: 'Bracket flat (one charge by consumption range)',
  per_unit_deduction: 'Per m³ with deduction',
};

const PROGRESSIVE_TIERS: RateTier[] = [
  { tier_id: '1', tier_order: 1, from_m3: 0, to_m3: 10, charge_type: 'minimum', rate_amount: 100.6, description: 'Minimum charge (up to 10 m³)' },
  { tier_id: '2', tier_order: 2, from_m3: 11, to_m3: 20, charge_type: 'per_cubic', rate_amount: 11.25, description: '11 – 20 m³' },
  { tier_id: '3', tier_order: 3, from_m3: 21, to_m3: 30, charge_type: 'per_cubic', rate_amount: 12.4, description: '21 – 30 m³' },
  { tier_id: '4', tier_order: 4, from_m3: 31, to_m3: 40, charge_type: 'per_cubic', rate_amount: 14.65, description: '31 – 40 m³' },
  { tier_id: '5', tier_order: 5, from_m3: 41, to_m3: null, charge_type: 'per_cubic', rate_amount: 16.75, description: '41 m³ and above' },
];

const BRACKET_FLAT_TIERS: RateTier[] = [
  { tier_id: '1', tier_order: 1, from_m3: 1, to_m3: 5, charge_type: 'flat_bracket', rate_amount: 35, description: 'Flat rate (1 – 5 m³)' },
  { tier_id: '2', tier_order: 2, from_m3: 5, to_m3: 10, charge_type: 'flat_bracket', rate_amount: 42, description: 'Flat rate (5 – 10 m³)' },
  { tier_id: '3', tier_order: 3, from_m3: 10, to_m3: 15, charge_type: 'flat_bracket', rate_amount: 46, description: 'Flat rate (10 – 15 m³)' },
  { tier_id: '4', tier_order: 4, from_m3: 15, to_m3: 20, charge_type: 'flat_bracket', rate_amount: 51, description: 'Flat rate (15 – 20 m³)' },
  { tier_id: '5', tier_order: 5, from_m3: 20, to_m3: null, charge_type: 'flat_bracket', rate_amount: 56, description: 'Flat rate (20 m³ and above)' },
];

const DEDUCTION_TIERS: RateTier[] = [
  { tier_id: '1', tier_order: 1, from_m3: 6, to_m3: 10, charge_type: 'deduction', rate_amount: 30, description: 'Deduction (6 – 10 m³)' },
  { tier_id: '2', tier_order: 2, from_m3: 11, to_m3: null, charge_type: 'deduction', rate_amount: 60, description: 'Deduction (11 m³ and above)' },
];

const DEFAULT_RATE_TIERS = PROGRESSIVE_TIERS;

function tiersForBillingModel(model: BillingModel): RateTier[] {
  if (model === 'bracket_flat') return cloneTiers(BRACKET_FLAT_TIERS, 'bracket_flat');
  if (model === 'per_unit_deduction') return cloneTiers(DEDUCTION_TIERS, 'per_unit_deduction');
  return cloneTiers(PROGRESSIVE_TIERS, 'progressive');
}

function defaultBaseUnitRate(model: BillingModel): number {
  return model === 'per_unit_deduction' ? 60 : 0;
}

function buildTierDescription(tier: RateTier, billingModel: BillingModel = 'progressive'): string {
  if (tier.charge_type === 'minimum') {
    return tier.to_m3 != null ? `Minimum charge (up to ${tier.to_m3} m³)` : 'Minimum charge';
  }
  if (tier.charge_type === 'deduction') {
    const range = tier.to_m3 != null ? `${tier.from_m3} – ${tier.to_m3} m³` : `${tier.from_m3} m³ and above`;
    return `Deduction (${range})`;
  }
  if (tier.charge_type === 'flat_bracket' || billingModel === 'bracket_flat') {
    const range = tier.to_m3 != null ? `${tier.from_m3} – ${tier.to_m3} m³` : `${tier.from_m3} m³ and above`;
    return `Flat rate (${range})`;
  }
  if (tier.to_m3 == null) {
    return `${tier.from_m3} m³ and above`;
  }
  return `${tier.from_m3} – ${tier.to_m3} m³`;
}

function cloneTiers(tiers: RateTier[], billingModel: BillingModel = 'progressive'): RateTier[] {
  return tiers.map((tier, index) => ({
    ...tier,
    tier_order: index + 1,
    from_m3: Number(tier.from_m3),
    to_m3: tier.to_m3 == null ? null : Number(tier.to_m3),
    rate_amount: Number(tier.rate_amount),
    description: tier.description || buildTierDescription(tier, billingModel),
  }));
}

function formatTierRate(tier: RateTier, billingModel: BillingModel = 'progressive'): string {
  if (tier.charge_type === 'minimum') {
    return `${formatPeso(tier.rate_amount)} (up to ${tier.to_m3} m³)`;
  }
  if (tier.charge_type === 'flat_bracket') {
    const range = tier.to_m3 ? `${tier.from_m3}–${tier.to_m3} m³` : `${tier.from_m3}+ m³`;
    return `${range} → ${formatPeso(tier.rate_amount)} flat`;
  }
  if (tier.charge_type === 'deduction') {
    const range = tier.to_m3 ? `${tier.from_m3}–${tier.to_m3} m³` : `${tier.from_m3}+ m³`;
    return `${range} → −${formatPeso(tier.rate_amount)}`;
  }
  const range = tier.to_m3 ? `${tier.from_m3}–${tier.to_m3} m³` : `${tier.from_m3}+ m³`;
  return `${range} @ ${formatPeso(tier.rate_amount)}/m³`;
}

export default function WaterworksSuppliesPage() {
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [defaultTiers, setDefaultTiers] = useState<RateTier[]>(DEFAULT_RATE_TIERS);
  const [formTiers, setFormTiers] = useState<RateTier[]>(cloneTiers(DEFAULT_RATE_TIERS, 'progressive'));
  const [billingModel, setBillingModel] = useState<BillingModel>('progressive');
  const [baseUnitRate, setBaseUnitRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WaterSupply | null>(null);
  const [showReaders, setShowReaders] = useState<string | null>(null);
  const [readers, setReaders] = useState<any[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loadingNextCode, setLoadingNextCode] = useState(false);

  const [form, setForm] = useState({
    supply_code: '',
    supply_name: '',
    location: '',
    description: '',
    reading_day_from: '',
    reading_day_to: '',
    billing_day: '',
    status: 'active' as WaterSupply['status'],
  });

  const fetchSupplies = async () => {
    try {
      setLoading(true);
      const res = await waterworksService.getSupplies({ search, page, limit: 15 });
      setSupplies(res.data);
      setTotalPages(res.pagination.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, [search, page]);

  useEffect(() => {
    waterworksService.getRateTiers().then((tiers) => {
      if (tiers.length) {
        setDefaultTiers(tiers);
      }
    }).catch(() => {});
  }, []);

  const openCreate = async () => {
    setEditing(null);
    setForm({ supply_code: '', supply_name: '', location: '', description: '', reading_day_from: '', reading_day_to: '', billing_day: '', status: 'active' });
    setBillingModel('progressive');
    setBaseUnitRate(0);
    setFormTiers(cloneTiers(defaultTiers.length ? defaultTiers : DEFAULT_RATE_TIERS, 'progressive'));
    setShowModal(true);
    try {
      setLoadingNextCode(true);
      const nextCode = await waterworksService.getNextSupplyCode();
      setForm((prev) => ({ ...prev, supply_code: nextCode }));
    } catch (e) {
      console.error(e);
      showAlert('Could not generate supply code. Save again to retry.', 'Warning');
    } finally {
      setLoadingNextCode(false);
    }
  };

  const handleSupplyCodeChange = (supply_code: string) => {
    setForm((prev) => ({ ...prev, supply_code: sanitizeSupplyCodeInput(supply_code) }));
  };

  const openEdit = async (s: WaterSupply) => {
    setEditing(s);
    setForm({
      supply_code: s.supply_code,
      supply_name: s.supply_name,
      location: s.location || '',
      description: s.description || '',
      reading_day_from: s.reading_day_from ? String(s.reading_day_from) : '',
      reading_day_to: s.reading_day_to ? String(s.reading_day_to) : '',
      billing_day: s.billing_day ? String(s.billing_day) : '',
      status: s.status,
    });
    try {
      const full = await waterworksService.getSupply(s.supply_id);
      setForm((prev) => ({
        ...prev,
        reading_day_from: full.reading_day_from ? String(full.reading_day_from) : '',
        reading_day_to: full.reading_day_to ? String(full.reading_day_to) : '',
        billing_day: full.billing_day ? String(full.billing_day) : '',
      }));
      const model = (full.billing_model || 'progressive') as BillingModel;
      setBillingModel(model);
      setBaseUnitRate(Number(full.rate_per_cubic_meter) || defaultBaseUnitRate(model));
      const tiers = full.rate_tiers?.length
        ? full.rate_tiers
        : await waterworksService.getRateTiers(s.supply_id);
      setFormTiers(cloneTiers(tiers.length ? tiers : tiersForBillingModel(model), model));
    } catch {
      setBillingModel((s.billing_model || 'progressive') as BillingModel);
      setBaseUnitRate(Number(s.rate_per_cubic_meter) || 0);
      setFormTiers(cloneTiers(defaultTiers, (s.billing_model || 'progressive') as BillingModel));
    }
    setShowModal(true);
  };

  const handleBillingModelChange = (model: BillingModel) => {
    setBillingModel(model);
    setBaseUnitRate(defaultBaseUnitRate(model));
    setFormTiers(tiersForBillingModel(model));
  };

  const addTier = () => {
    setFormTiers((prev) => {
      const nextOrder = prev.length + 1;
      const last = prev[prev.length - 1];
      const from = last?.to_m3 != null ? last.to_m3 + (billingModel === 'bracket_flat' ? 0.1 : 1) : (last?.from_m3 ?? 0) + 10;
      let charge_type: RateTier['charge_type'] = 'per_cubic';
      if (billingModel === 'bracket_flat') charge_type = 'flat_bracket';
      if (billingModel === 'per_unit_deduction') charge_type = 'deduction';
      const tier: RateTier = {
        tier_id: `new-${nextOrder}`,
        tier_order: nextOrder,
        from_m3: from,
        to_m3: null,
        charge_type,
        rate_amount: 0,
        description: '',
      };
      tier.description = buildTierDescription(tier, billingModel);
      return [...prev, tier];
    });
  };

  const removeTier = (index: number) => {
    if (formTiers.length <= 1) return;
    if (billingModel === 'progressive' && index === 0) return;
    setFormTiers((prev) => cloneTiers(prev.filter((_, i) => i !== index), billingModel));
  };

  const updateTierField = (
    index: number,
    field: 'from_m3' | 'to_m3' | 'rate_amount',
    value: string
  ) => {
    setFormTiers((prev) => prev.map((tier, i) => {
      if (i !== index) return tier;
      const updated = { ...tier };
      if (field === 'rate_amount') {
        updated.rate_amount = parseFloat(value) || 0;
      } else if (field === 'to_m3') {
        updated.to_m3 = value === '' ? null : parseFloat(value) || 0;
      } else {
        updated.from_m3 = parseFloat(value) || 0;
      }
      updated.description = buildTierDescription(updated, billingModel);
      return updated;
    }));
  };

  const validateFormTiers = (): string | null => {
    if (billingModel === 'per_unit_deduction' && baseUnitRate <= 0) {
      return 'Base rate per m³ is required for per-unit deduction billing';
    }
    for (const tier of formTiers) {
      if (tier.from_m3 < 0 || (tier.to_m3 != null && tier.to_m3 < 0)) {
        return 'Cubic ranges cannot be negative';
      }
      if (tier.to_m3 != null && tier.from_m3 > tier.to_m3) {
        return `Invalid range on "${tier.description}": From must be less than or equal to To`;
      }
      if (tier.rate_amount < 0) {
        return 'Rates cannot be negative';
      }
    }
    return null;
  };

  const validateSchedule = (): string | null => {
    const from = form.reading_day_from ? parseInt(form.reading_day_from, 10) : null;
    const to = form.reading_day_to ? parseInt(form.reading_day_to, 10) : null;
    const billing = form.billing_day ? parseInt(form.billing_day, 10) : null;

    for (const [label, day] of [['Reading from', from], ['Reading to', to], ['Billing', billing]] as const) {
      if (day != null && (day < 1 || day > 31)) {
        return `${label} day must be between 1 and 31`;
      }
    }
    if (from != null && to != null && from > to) {
      return 'Reading schedule: From day must be on or before To day';
    }
    return null;
  };

  const handleSave = async () => {
    if (!form.supply_name) {
      showAlert('Supply name is required', 'Validation');
      return;
    }
    if (!editing && !form.supply_code) {
      showAlert('Supply code is being generated. Please wait or try again.', 'Validation');
      return;
    }
    const scheduleError = validateSchedule();
    if (scheduleError) {
      showAlert(scheduleError, 'Validation');
      return;
    }
    const tierError = validateFormTiers();
    if (tierError) {
      showAlert(tierError, 'Validation');
      return;
    }
    try {
      const payload = {
        ...form,
        reading_day_from: form.reading_day_from ? parseInt(form.reading_day_from, 10) : null,
        reading_day_to: form.reading_day_to ? parseInt(form.reading_day_to, 10) : null,
        billing_day: form.billing_day ? parseInt(form.billing_day, 10) : null,
        billing_model: billingModel,
        base_unit_rate: billingModel === 'per_unit_deduction' ? baseUnitRate : undefined,
        rate_tiers: formTiers.map(({ tier_order, from_m3, to_m3, charge_type, rate_amount }, index) => ({
          tier_order: index + 1,
          from_m3,
          to_m3,
          charge_type,
          rate_amount,
          description: buildTierDescription(
            { tier_order, from_m3, to_m3, charge_type, rate_amount, tier_id: '', description: '' },
            billingModel
          ),
        })),
      };
      if (editing) {
        await waterworksService.updateSupply(editing.supply_id, payload);
      } else {
        await waterworksService.createSupply(payload);
      }
      setShowModal(false);
      fetchSupplies();
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to save supply', 'Error');
    }
  };

  const handleDelete = (s: WaterSupply) => {
    showConfirm(`Delete water supply "${s.supply_name}"?`, 'Confirm', async () => {
      try {
        await waterworksService.deleteSupply(s.supply_id);
        fetchSupplies();
      } catch (e: any) {
        showAlert(e.response?.data?.error || 'Failed to delete', 'Error');
      }
    }, undefined, { isDangerous: true });
  };

  const openReaders = async (supplyId: string) => {
    setShowReaders(supplyId);
    try {
      const [readerList, usersRes] = await Promise.all([
        waterworksService.getSupplyReaders({ supply_id: supplyId }),
        api.get('/api/users'),
      ]);
      setReaders(readerList);
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const assignReader = async () => {
    if (!showReaders || !selectedUserId) return;
    try {
      await waterworksService.assignReader(showReaders, selectedUserId);
      setSelectedUserId('');
      openReaders(showReaders);
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to assign reader', 'Error');
    }
  };

  const removeReader = async (assignmentId: string) => {
    try {
      await waterworksService.removeReader(assignmentId);
      if (showReaders) openReaders(showReaders);
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to remove reader', 'Error');
    }
  };

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Water Supplies</h1>
              <p className="text-gray-600 text-sm">Manage water supply systems and their cubic rates</p>
            </div>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Add Supply
            </button>
          </div>

          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-blue-900 mb-2">Default rate template (for new supplies)</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              {defaultTiers.map((tier) => (
                <li key={tier.tier_id}>• {tier.description ? `${tier.description}: ` : ''}{formatTierRate(tier, 'progressive')}</li>
              ))}
            </ul>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search supplies..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Schedule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Accounts</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {supplies.map((s) => (
                    <tr key={s.supply_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{s.supply_code}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.supply_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.location || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>Read: {formatReadingSchedule(s)}</div>
                        <div className="text-xs text-gray-500">Bill: {formatBillingSchedule(s)}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {BILLING_MODEL_LABELS[(s.billing_model || 'progressive') as BillingModel].split('(')[0].trim()}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">{s.account_count ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm space-x-2">
                        <Link href={`/admin/waterworks/accounts?supply_id=${s.supply_id}`} className="text-blue-600 hover:underline">Accounts</Link>
                        <button onClick={() => openReaders(s.supply_id)} className="text-indigo-600 hover:underline">Readers</button>
                        <button onClick={() => openEdit(s)} className="text-gray-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {!supplies.length && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No water supplies found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowModal(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              className="relative flex w-full max-w-xl max-h-[min(90dvh,calc(100vh-2rem))] flex-col overflow-hidden rounded-xl bg-white shadow-xl"
            >
              <div className="shrink-0 border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">{editing ? 'Edit Supply' : 'New Water Supply'}</h2>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="text-2xl leading-none text-gray-400 hover:text-gray-600"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supply Name *</label>
                  <input
                    value={form.supply_name}
                    onChange={(e) => setForm({ ...form, supply_name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supply Code Number *</label>
                  <input
                    value={loadingNextCode && !editing ? 'Generating...' : form.supply_code}
                    onChange={(e) => handleSupplyCodeChange(e.target.value)}
                    readOnly={!editing}
                    maxLength={SUPPLY_CODE_MAX_LENGTH}
                    className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${!editing ? 'bg-gray-50 text-gray-700' : ''}`}
                  />
                  {!editing && (
                    <p className="mt-1 text-xs text-gray-500">Auto-generated (8 characters, letters and numbers, e.g. WS000001)</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Model</label>
                  <select
                    value={billingModel}
                    onChange={(e) => handleBillingModelChange(e.target.value as BillingModel)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {(Object.keys(BILLING_MODEL_LABELS) as BillingModel[]).map((model) => (
                      <option key={model} value={model}>{BILLING_MODEL_LABELS[model]}</option>
                    ))}
                  </select>
                </div>
                {billingModel === 'per_unit_deduction' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate (₱/m³)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={baseUnitRate || ''}
                      onChange={(e) => setBaseUnitRate(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Cubic Rates</label>
                    <button
                      type="button"
                      onClick={addTier}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      + Add tier
                    </button>
                  </div>
                  <div className="rounded-lg border border-gray-200 divide-y max-h-72 overflow-y-auto">
                    {formTiers.map((tier, index) => (
                      <div key={`${tier.tier_order}-${index}`} className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-gray-800">
                            {tier.charge_type === 'minimum'
                              ? 'Minimum block'
                              : billingModel === 'bracket_flat'
                                ? `Bracket ${index + 1}`
                                : billingModel === 'per_unit_deduction'
                                  ? `Deduction ${index + 1}`
                                  : `Tier ${tier.tier_order}`}
                            <span className="ml-2 text-xs font-normal text-gray-500">{formatTierRate(tier, billingModel)}</span>
                          </p>
                          {!(billingModel === 'progressive' && index === 0) && formTiers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeTier(index)}
                              className="text-xs text-red-600 hover:underline shrink-0"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        {tier.charge_type === 'minimum' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Up to (m³)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.to_m3 ?? ''}
                                onChange={(e) => updateTierField(index, 'to_m3', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Minimum (₱)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.rate_amount}
                                onChange={(e) => updateTierField(index, 'rate_amount', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">From (m³)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.from_m3}
                                onChange={(e) => updateTierField(index, 'from_m3', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">To (m³)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.to_m3 ?? ''}
                                placeholder={index === formTiers.length - 1 ? '∞' : ''}
                                onChange={(e) => updateTierField(index, 'to_m3', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                {billingModel === 'per_unit_deduction'
                                  ? 'Deduction (₱)'
                                  : billingModel === 'bracket_flat'
                                    ? 'Flat charge (₱)'
                                    : 'Rate (₱/m³)'}
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={tier.rate_amount}
                                onChange={(e) => updateTierField(index, 'rate_amount', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded-lg text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reading Schedule</label>
                  <p className="text-xs text-gray-500 mb-2">Day(s) of the month when meter reading is conducted</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">From day</label>
                      <select
                        value={form.reading_day_from}
                        onChange={(e) => setForm({ ...form, reading_day_from: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Not set</option>
                        {SCHEDULE_DAYS.map((day) => (
                          <option key={`read-from-${day}`} value={day}>{formatOrdinal(day)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">To day</label>
                      <select
                        value={form.reading_day_to}
                        onChange={(e) => setForm({ ...form, reading_day_to: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Not set</option>
                        {SCHEDULE_DAYS.map((day) => (
                          <option key={`read-to-${day}`} value={day}>{formatOrdinal(day)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Billing Schedule</label>
                  <p className="text-xs text-gray-500 mb-2">Day of the month when bills are generated / due</p>
                  <select
                    value={form.billing_day}
                    onChange={(e) => setForm({ ...form, billing_day: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">Not set</option>
                    {SCHEDULE_DAYS.map((day) => (
                      <option key={`bill-${day}`} value={day}>{formatOrdinal(day)} of the month</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WaterSupply['status'] })} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              </div>
              <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 flex justify-end gap-2">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </div>
        )}

        {showReaders && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-bold mb-4">Meter Reader Assignments</h2>
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meter Reader</label>
                  <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Select user...</option>
                    {users.map((u) => (
                      <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.username})</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={assignReader} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Add</button>
                </div>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {readers.map((r) => (
                  <li key={r.assignment_id} className="flex justify-between items-center text-sm border-b pb-2">
                    <span>{r.full_name}</span>
                    <button onClick={() => removeReader(r.assignment_id)} className="text-red-600 text-xs">Remove</button>
                  </li>
                ))}
                {!readers.length && <li className="text-gray-500 text-sm">No readers assigned</li>}
              </ul>
              <button onClick={() => setShowReaders(null)} className="mt-4 w-full px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
