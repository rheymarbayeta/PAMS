'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import waterworksService, {
  RateComputationAssetRow,
  RateComputationOpexRow,
  RateComputationStaffRow,
  WaterSupply,
} from '@/services/waterworksService';
import { formatPeso } from '@/utils/formatters';
import { showAlert } from '@/utils/modal';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

type TabKey = 'revenue' | 'expenses' | 'rate' | 'results';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'revenue', label: '1. Revenue' },
  { key: 'expenses', label: '2. Expenses' },
  { key: 'rate', label: '3. Water Rate' },
  { key: 'results', label: 'Results' },
];

function num(v: string | number | undefined | null, fallback = 0) {
  if (v === '' || v === undefined || v === null) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function RateComputationPage() {
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [supplyId, setSupplyId] = useState('');
  const [tab, setTab] = useState<TabKey>('revenue');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyClass, setApplyClass] = useState<'tapstand' | 'residential' | 'commercial'>('residential');
  const [isDefault, setIsDefault] = useState(true);
  const [computation, setComputation] = useState<any>(null);

  const [form, setForm] = useState({
    household_count: 0,
    avg_household_size: 5,
    liters_per_person_day: 60,
    days_per_month: 30,
    inflation_rate_percent: 10,
    amortization_monthly: 0,
    expense_benefits: 0,
    expense_watershed_management: 0,
    expense_climate_change: 0,
    expense_capability_building: 0,
    min_volume_m3: 3,
    excess_block_size_m3: 5,
    escalation_percent: 10,
    markup_tapstand_percent: 0,
    markup_residential_percent: 10,
    markup_commercial_percent: 20,
    notes: '',
  });
  const [staff, setStaff] = useState<RateComputationStaffRow[]>([]);
  const [opex, setOpex] = useState<RateComputationOpexRow[]>([]);
  const [assets, setAssets] = useState<RateComputationAssetRow[]>([]);

  useEffect(() => {
    waterworksService.getSupplies({ limit: 100 }).then((r) => {
      setSupplies(r.data || []);
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const fromQuery = params?.get('supply') || '';
      if (fromQuery) setSupplyId(fromQuery);
      else if (r.data?.length && !supplyId) setSupplyId(r.data[0].supply_id);
    });
  }, []);

  const loadWorksheet = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await waterworksService.getRateComputation(id);
      setIsDefault(!!data.is_default);
      setForm({
        household_count: num(data.household_count ?? data.worksheet?.household_count as number),
        avg_household_size: num(data.avg_household_size ?? data.worksheet?.avg_household_size as number, 5),
        liters_per_person_day: num(data.liters_per_person_day ?? data.worksheet?.liters_per_person_day as number, 60),
        days_per_month: num(data.days_per_month ?? data.worksheet?.days_per_month as number, 30),
        inflation_rate_percent: num(data.inflation_rate_percent ?? data.worksheet?.inflation_rate_percent as number, 10),
        amortization_monthly: num(data.amortization_monthly ?? data.worksheet?.amortization_monthly as number),
        expense_benefits: num(data.expense_benefits ?? data.worksheet?.expense_benefits as number),
        expense_watershed_management: num(data.expense_watershed_management ?? data.worksheet?.expense_watershed_management as number),
        expense_climate_change: num(data.expense_climate_change ?? data.worksheet?.expense_climate_change as number),
        expense_capability_building: num(data.expense_capability_building ?? data.worksheet?.expense_capability_building as number),
        min_volume_m3: num(data.min_volume_m3 ?? data.worksheet?.min_volume_m3 as number, 3),
        excess_block_size_m3: num(data.excess_block_size_m3 ?? data.worksheet?.excess_block_size_m3 as number, 5),
        escalation_percent: num(data.escalation_percent ?? data.worksheet?.escalation_percent as number, 10),
        markup_tapstand_percent: num(data.markup_tapstand_percent ?? data.worksheet?.markup_tapstand_percent as number),
        markup_residential_percent: num(data.markup_residential_percent ?? data.worksheet?.markup_residential_percent as number, 10),
        markup_commercial_percent: num(data.markup_commercial_percent ?? data.worksheet?.markup_commercial_percent as number, 20),
        notes: String(data.notes ?? data.worksheet?.notes ?? ''),
      });
      setStaff((data.staff as RateComputationStaffRow[]) || []);
      setOpex((data.opex as RateComputationOpexRow[]) || []);
      setAssets((data.assets as RateComputationAssetRow[]) || []);
      setComputation(data.computation);
    } catch (e: any) {
      showAlert(e?.response?.data?.error || 'Failed to load rate computation', 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supplyId) loadWorksheet(supplyId);
  }, [supplyId, loadWorksheet]);

  const selectedSupply = useMemo(
    () => supplies.find((s) => s.supply_id === supplyId),
    [supplies, supplyId]
  );

  const buildPayload = () => {
    const staffDaily = staff.reduce((s, r) => s + num(r.headcount) * num(r.monthly_rate), 0);
    const honorarium = Math.round(staffDaily * Math.max(1, form.days_per_month) * 100) / 100;
    return {
      ...form,
      notes: form.notes.trim() || null,
      staff: staff.map((s, i) => ({
        role_name: s.role_name,
        headcount: num(s.headcount),
        monthly_rate: num(s.monthly_rate),
        sort_order: i + 1,
      })),
      opex: opex.map((o, i) => {
        const isHon = String(o.category_name || '').trim().toLowerCase() === 'honorarium';
        return {
          category_name: o.category_name,
          amount_monthly: isHon ? honorarium : num(o.amount_monthly),
          sort_order: i + 1,
        };
      }),
      assets: assets.map((a, i) => ({
        component_name: a.component_name,
        cost: num(a.cost),
        service_life_years: Math.max(0.01, num(a.service_life_years, 1)),
        depreciable_percent: num(a.depreciable_percent),
        sort_order: i + 1,
      })),
    };
  };

  const handleSave = async () => {
    if (!supplyId) return;
    setSaving(true);
    try {
      const data = await waterworksService.saveRateComputation(supplyId, buildPayload());
      setIsDefault(false);
      setStaff(data.staff || []);
      setOpex(data.opex || []);
      setAssets(data.assets || []);
      setComputation(data.computation);
      showAlert('Rate computation worksheet saved.', 'Saved');
    } catch (e: any) {
      showAlert(e?.response?.data?.error || 'Failed to save worksheet', 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    if (!supplyId) return;
    setApplying(true);
    try {
      // Save first so apply uses latest figures
      await waterworksService.saveRateComputation(supplyId, buildPayload());
      const result = await waterworksService.applyRateComputation(supplyId, applyClass);
      setIsDefault(false);
      await loadWorksheet(supplyId);
      showAlert(
        result.message ||
          `Applied ${applyClass} schedule to ${selectedSupply?.supply_name || 'supply'} rates.`,
        'Rates Applied'
      );
    } catch (e: any) {
      showAlert(e?.response?.data?.error || 'Failed to apply rates', 'Error');
    } finally {
      setApplying(false);
    }
  };

  const openPrint = () => {
    if (!supplyId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    window.open(
      `/waterworks-rate-computation.html?supply_id=${encodeURIComponent(supplyId)}&token=${encodeURIComponent(token)}&_v=${Date.now()}`,
      '_blank'
    );
  };

  const c = computation;

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Rate Computation</h1>
            <p className="text-sm text-gray-600 mt-1">
              Full cost recovery worksheet — project demand and costs to derive the base rate and class schedules for a water supply.
            </p>
          </div>

          <div className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Water Supply *</label>
              <select
                value={supplyId}
                onChange={(e) => setSupplyId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">Select supply</option>
                {supplies.map((s) => (
                  <option key={s.supply_id} value={s.supply_id}>
                    {s.supply_name} ({s.supply_code})
                  </option>
                ))}
              </select>
            </div>
            {isDefault && supplyId && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Default template — save to create the worksheet for this supply.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!supplyId || saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Worksheet'}
              </button>
              <button
                type="button"
                onClick={openPrint}
                disabled={!supplyId}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                Print Report
              </button>
              <Link
                href="/admin/waterworks"
                className="px-4 py-2 text-sm text-blue-600 hover:underline self-center"
              >
                Back to Supplies
              </Link>
            </div>
          </div>

          {!supplyId ? (
            <div className="text-center py-16 text-gray-500 bg-white rounded-xl border">
              Select a water supply to begin.
            </div>
          ) : loading ? (
            <div className="text-center py-16 text-gray-500">Loading worksheet...</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-200">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                      tab === t.key
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'revenue' && (
                <section className="bg-white rounded-xl border p-5 space-y-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">1. REVENUES</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Full cost recovery uses projected volume from households. Income sources typically include membership fees, water bill payments, connection/reconnection fees, fines/penalties, donations, and grants.
                    </p>
                    <h3 className="font-medium text-gray-800 mt-4">1.1 Projected Water Volume Consumed</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <Field label="No. of Households" type="number" value={form.household_count}
                      onChange={(v) => setForm({ ...form, household_count: num(v) })} />
                    <Field label="Ave. Household Size" type="number" step="0.1" value={form.avg_household_size}
                      onChange={(v) => setForm({ ...form, avg_household_size: num(v, 5) })} />
                    <Field label="Liters / Person / Day" type="number" value={form.liters_per_person_day}
                      onChange={(v) => setForm({ ...form, liters_per_person_day: num(v, 60) })} />
                    <Field label="Days / Month" type="number" value={form.days_per_month}
                      onChange={(v) => setForm({ ...form, days_per_month: Math.max(1, num(v, 30)) })} />
                  </div>
                  {c?.demand && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                      <Stat label="Total Persons" value={c.demand.total_persons} />
                      <Stat label="Daily Liters" value={c.demand.projected_daily_liters.toLocaleString()} />
                      <Stat label="Monthly Liters" value={c.demand.projected_monthly_liters.toLocaleString()} />
                      <Stat label="Monthly m³" value={c.demand.projected_monthly_m3} highlight />
                    </div>
                  )}
                  <p className="text-xs text-gray-500">Computed figures update after you save. Save after editing to refresh results.</p>
                </section>
              )}

              {tab === 'expenses' && (
                <div className="space-y-4">
                <section className="bg-white rounded-xl border p-5 space-y-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">2. EXPENSES</h2>
                    <h3 className="font-medium text-gray-800 mt-1">2.1 Operating Cost:</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">Number of Staff =</span>
                      <span className="inline-flex min-w-[3rem] justify-center px-3 py-1 bg-gray-100 border border-gray-300 rounded font-semibold">
                        {staff.reduce((s, r) => s + num(r.headcount), 0)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: a–k operating expenses */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Monthly expense items</p>
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:underline"
                          onClick={() => setOpex([...opex, { category_name: '', amount_monthly: 0 }])}
                        >
                          + Add expense
                        </button>
                      </div>
                      <div className="space-y-2">
                        {opex.map((row, idx) => {
                          const letter = String.fromCharCode(97 + idx);
                          const isHon = String(row.category_name || '').trim().toLowerCase() === 'honorarium';
                          const staffDaily = staff.reduce((s, r) => s + num(r.headcount) * num(r.monthly_rate), 0);
                          const honorarium = Math.round(staffDaily * Math.max(1, form.days_per_month) * 100) / 100;
                          const displayAmount = isHon ? honorarium : num(row.amount_monthly);
                          return (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <span className="w-5 text-gray-500 font-medium">{letter}.</span>
                              <input
                                className="flex-1 border border-gray-300 rounded px-2 py-1.5 bg-gray-50 min-w-0"
                                value={row.category_name}
                                onChange={(e) => {
                                  const next = [...opex];
                                  next[idx] = { ...row, category_name: e.target.value };
                                  setOpex(next);
                                }}
                              />
                              <span className="text-gray-500 shrink-0">= PhP</span>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                disabled={isHon}
                                title={isHon ? `Auto: staff daily total × ${form.days_per_month} days` : undefined}
                                className={`w-28 border border-gray-300 rounded px-2 py-1.5 text-right ${isHon ? 'bg-gray-100 text-gray-700' : 'bg-gray-50'}`}
                                value={displayAmount}
                                onChange={(e) => {
                                  if (isHon) return;
                                  const next = [...opex];
                                  next[idx] = { ...row, amount_monthly: num(e.target.value) };
                                  setOpex(next);
                                }}
                              />
                              <span className="text-gray-500 shrink-0 w-14">/month</span>
                              <button
                                type="button"
                                className="text-red-500 px-1"
                                onClick={() => setOpex(opex.filter((_, i) => i !== idx))}
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold mt-3 pt-3 border-t border-gray-400">
                        <span className="w-5" />
                        <span className="flex-1">TOTAL</span>
                        <span className="text-gray-600 font-medium">= PhP</span>
                        <span className="inline-flex min-w-[7rem] justify-end px-2 py-1 border-2 border-gray-800 rounded bg-white tabular-nums">
                          {opex
                            .reduce((s, r) => {
                              const isHon = String(r.category_name || '').trim().toLowerCase() === 'honorarium';
                              if (isHon) {
                                const staffDaily = staff.reduce(
                                  (sum, row) => sum + num(row.headcount) * num(row.monthly_rate),
                                  0
                                );
                                return s + staffDaily * Math.max(1, form.days_per_month);
                              }
                              return s + num(r.amount_monthly);
                            }, 0)
                            .toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-gray-500 font-medium w-14">/month</span>
                        <span className="w-5" />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Honorarium is auto-calculated from Technical Staff (daily rate total × {form.days_per_month} days).
                      </p>
                    </div>

                    {/* Right: Technical Staff table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Technical Staff:</p>
                        <button
                          type="button"
                          className="text-sm text-blue-600 hover:underline"
                          onClick={() => setStaff([...staff, { role_name: '', headcount: 0, monthly_rate: 0 }])}
                        >
                          + Add role
                        </button>
                      </div>
                      <div className="overflow-x-auto border border-gray-300 rounded-lg">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-2 text-left border-b border-gray-300">Technical Staff</th>
                              <th className="px-2 py-2 text-center border-b border-gray-300 w-16">No.</th>
                              <th className="px-2 py-2 text-right border-b border-gray-300 w-24">Rate</th>
                              <th className="px-2 py-2 text-right border-b border-gray-300 w-24">Total</th>
                              <th className="w-8 border-b border-gray-300" />
                            </tr>
                          </thead>
                          <tbody>
                            {staff.map((row, idx) => (
                              <tr key={idx} className="border-b border-gray-200 last:border-0">
                                <td className="px-2 py-1">
                                  <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 bg-white"
                                    value={row.role_name}
                                    onChange={(e) => {
                                      const next = [...staff];
                                      next[idx] = { ...row, role_name: e.target.value };
                                      setStaff(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-center bg-gray-50"
                                    value={row.headcount}
                                    onChange={(e) => {
                                      const next = [...staff];
                                      next[idx] = { ...row, headcount: num(e.target.value) };
                                      setStaff(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1">
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-right bg-gray-50"
                                    value={row.monthly_rate}
                                    title="Daily rate (Rempark worksheet)"
                                    onChange={(e) => {
                                      const next = [...staff];
                                      next[idx] = { ...row, monthly_rate: num(e.target.value) };
                                      setStaff(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1 text-right tabular-nums text-gray-800">
                                  {formatPeso(num(row.headcount) * num(row.monthly_rate))}
                                </td>
                                <td className="px-1 text-center">
                                  <button
                                    type="button"
                                    className="text-red-500 text-xs"
                                    onClick={() => setStaff(staff.filter((_, i) => i !== idx))}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-100 font-semibold">
                              <td className="px-2 py-2">Total</td>
                              <td className="px-2 py-2 text-center">
                                {staff.reduce((s, r) => s + num(r.headcount), 0)}
                              </td>
                              <td className="px-2 py-2" />
                              <td className="px-2 py-2 text-right tabular-nums">
                                {formatPeso(staff.reduce((s, r) => s + num(r.headcount) * num(r.monthly_rate), 0))}
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Rate = daily rate. Row Total = No. × Rate. Honorarium = staff Total × {form.days_per_month}.
                      </p>
                    </div>
                  </div>
                </section>

                  <div className="bg-white rounded-xl border p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-900">2.2 Depreciation Cost:</h2>
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => setAssets([...assets, { component_name: '', cost: 0, service_life_years: 10, depreciable_percent: 100 }])}
                      >
                        + Add component
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th rowSpan={2} className="px-2 py-2 text-center border border-gray-300 w-10">#</th>
                            <th rowSpan={2} className="px-2 py-2 text-left border border-gray-300 min-w-[160px]">System Components</th>
                            <th rowSpan={2} className="px-2 py-2 text-center border border-gray-300 w-36">
                              Cost Mat&apos;s &amp; Labor<br />(PhP)
                            </th>
                            <th rowSpan={2} className="px-2 py-2 text-center border border-gray-300 w-24">
                              Service Life*<br />(yr)
                            </th>
                            <th rowSpan={2} className="px-2 py-2 text-center border border-gray-300 w-28">
                              % of Cost to<br />be depreciated
                            </th>
                            <th colSpan={2} className="px-2 py-2 text-center border border-gray-300">
                              Depreciation (PhP)
                            </th>
                            <th rowSpan={2} className="px-1 py-2 border border-gray-300 w-8" />
                          </tr>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1.5 text-center border border-gray-300 w-28">Yearly</th>
                            <th className="px-2 py-1.5 text-center border border-gray-300 w-28">Monthly</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assets.map((row, idx) => {
                            const yearly = num(row.cost) * (num(row.depreciable_percent) / 100) / Math.max(0.01, num(row.service_life_years, 1));
                            const monthly = yearly / 12;
                            const hasCost = num(row.cost) > 0;
                            return (
                              <tr key={idx} className="hover:bg-gray-50/60">
                                <td className="px-2 py-1 text-center border border-gray-200 text-gray-500">{idx + 1}</td>
                                <td className="px-2 py-1 border border-gray-200">
                                  <input
                                    className="w-full border border-gray-200 rounded px-2 py-1 bg-white"
                                    value={row.component_name}
                                    onChange={(e) => {
                                      const next = [...assets];
                                      next[idx] = { ...row, component_name: e.target.value };
                                      setAssets(next);
                                    }}
                                  />
                                </td>
                                <td className={`px-2 py-1 border border-gray-200 ${!hasCost ? 'bg-gray-100' : ''}`}>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className={`w-full border border-gray-200 rounded px-2 py-1 text-right ${!hasCost ? 'bg-gray-50' : 'bg-white'}`}
                                    value={row.cost}
                                    onChange={(e) => {
                                      const next = [...assets];
                                      next[idx] = { ...row, cost: num(e.target.value) };
                                      setAssets(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1 border border-gray-200">
                                  <input
                                    type="number"
                                    min={0.01}
                                    step="0.01"
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-right bg-white"
                                    value={row.service_life_years}
                                    onChange={(e) => {
                                      const next = [...assets];
                                      next[idx] = { ...row, service_life_years: num(e.target.value, 1) };
                                      setAssets(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1 border border-gray-200">
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step="0.01"
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-right bg-white"
                                    value={row.depreciable_percent}
                                    onChange={(e) => {
                                      const next = [...assets];
                                      next[idx] = { ...row, depreciable_percent: num(e.target.value) };
                                      setAssets(next);
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-1 border border-gray-200 text-right text-gray-800 tabular-nums">
                                  {hasCost ? formatPeso(yearly) : '—'}
                                </td>
                                <td className="px-2 py-1 border border-gray-200 text-right text-gray-800 tabular-nums">
                                  {hasCost ? formatPeso(monthly) : '—'}
                                </td>
                                <td className="px-1 py-1 border border-gray-200 text-center">
                                  <button
                                    type="button"
                                    className="text-red-500 text-xs px-1"
                                    title="Remove"
                                    onClick={() => setAssets(assets.filter((_, i) => i !== idx))}
                                  >
                                    ×
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-semibold">
                            <td className="px-2 py-2 border border-gray-300" colSpan={2}>
                              TOTAL
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-right tabular-nums">
                              {formatPeso(assets.reduce((s, r) => s + num(r.cost), 0))}
                            </td>
                            <td className="px-2 py-2 border border-gray-300" colSpan={2} />
                            <td className="px-2 py-2 border border-gray-300 text-right tabular-nums">
                              {formatPeso(
                                assets.reduce((s, r) => {
                                  const yearly = num(r.cost) * (num(r.depreciable_percent) / 100) / Math.max(0.01, num(r.service_life_years, 1));
                                  return s + yearly;
                                }, 0)
                              )}
                            </td>
                            <td className="px-2 py-2 border border-gray-300 text-right tabular-nums">
                              {formatPeso(
                                assets.reduce((s, r) => {
                                  const yearly = num(r.cost) * (num(r.depreciable_percent) / 100) / Math.max(0.01, num(r.service_life_years, 1));
                                  return s + yearly / 12;
                                }, 0)
                              )}
                            </td>
                            <td className="border border-gray-300" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">* Economic / Usable Life</p>
                  </div>

                  <div className="bg-white rounded-xl border p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h2 className="font-semibold text-gray-900 mb-2">2.3 Amortization</h2>
                      <p className="text-xs text-gray-500 mb-2">If grant-funded, leave at 0. If loan, enter monthly amortization.</p>
                      <Field label="Monthly Amortization (₱)" type="number" step="0.01" value={form.amortization_monthly}
                        onChange={(v) => setForm({ ...form, amortization_monthly: num(v) })} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 mb-2">2.4 Inflation</h2>
                      <Field label="Inflation Rate (% / month)" type="number" step="0.01" value={form.inflation_rate_percent}
                        onChange={(v) => setForm({ ...form, inflation_rate_percent: num(v) })} />
                      <p className="text-xs text-gray-500 mt-2">
                        Applied to (Operating + Depreciation). Save to refresh computed inflation cost.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border p-5">
                    <h2 className="font-semibold text-gray-900 mb-1">
                      OTHER POSSIBLE ITEMS TO BE INCLUDED UNDER ITEM EXPENSE:
                    </h2>
                    <p className="text-xs text-gray-500 mb-4">
                      Optional monthly amounts. Leave blank or 0 if not applicable. These add to total expenses and the base rate.
                    </p>
                    <div className="space-y-3 max-w-xl">
                      {[
                        { key: 'expense_benefits' as const, label: '2.5 Benefits' },
                        { key: 'expense_watershed_management' as const, label: '2.6 Watershed Management' },
                        { key: 'expense_climate_change' as const, label: '2.7 Climate Change' },
                        { key: 'expense_capability_building' as const, label: '2.8 Capability-Building' },
                      ].map((item) => (
                        <div key={item.key} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium text-gray-800 min-w-[11rem] sm:min-w-[14rem]">{item.label}</span>
                          <span className="text-gray-500">= PhP</span>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-36 border border-gray-300 rounded px-2 py-1.5 text-right bg-gray-50"
                            value={form[item.key]}
                            onChange={(e) => setForm({ ...form, [item.key]: num(e.target.value) })}
                          />
                          <span className="text-gray-500">/month</span>
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold pt-2 border-t border-gray-200">
                        <span className="min-w-[11rem] sm:min-w-[14rem]">Subtotal (2.5–2.8)</span>
                        <span className="text-gray-500 font-medium">= PhP</span>
                        <span className="inline-flex min-w-[9rem] justify-end px-2 py-1 border border-gray-300 rounded bg-white tabular-nums">
                          {(
                            num(form.expense_benefits) +
                            num(form.expense_watershed_management) +
                            num(form.expense_climate_change) +
                            num(form.expense_capability_building)
                          ).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-gray-500 font-medium">/month</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'rate' && (
                <section className="space-y-4">
                <div className="bg-white rounded-xl border p-5 space-y-4">
                  <h2 className="font-semibold text-gray-900">3. WATER RATE</h2>
                  <p className="text-xs text-gray-500">
                    Base rate = Total Expenses ÷ Projected Monthly Volume. Classification markups and increasing blocks follow Rempark schedule rules.
                  </p>
                  <h3 className="font-medium text-gray-800">Rate Policy & Classification Markups</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Field label="Minimum Volume (m³)" type="number" step="0.01" value={form.min_volume_m3}
                      onChange={(v) => setForm({ ...form, min_volume_m3: num(v, 3) })} />
                    <Field label="Excess Block Size (m³)" type="number" step="0.01" value={form.excess_block_size_m3}
                      onChange={(v) => setForm({ ...form, excess_block_size_m3: num(v, 5) })} />
                    <Field label="Escalation between blocks (%)" type="number" step="0.01" value={form.escalation_percent}
                      onChange={(v) => setForm({ ...form, escalation_percent: num(v, 10) })} />
                    <Field label="Tapstand markup (%)" type="number" step="0.01" value={form.markup_tapstand_percent}
                      onChange={(v) => setForm({ ...form, markup_tapstand_percent: num(v) })} />
                    <Field label="Residential markup (%)" type="number" step="0.01" value={form.markup_residential_percent}
                      onChange={(v) => setForm({ ...form, markup_residential_percent: num(v, 10) })} />
                    <Field label="Commercial / Industrial markup (%)" type="number" step="0.01" value={form.markup_commercial_percent}
                      onChange={(v) => setForm({ ...form, markup_commercial_percent: num(v, 20) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Source</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="e.g., Rempark full cost recovery worksheet"
                    />
                  </div>
                </div>

                {c && (
                  <>
                    <div className="bg-white rounded-xl border p-5">
                      <h3 className="font-semibold text-gray-900 mb-2">Base Rate</h3>
                      <p className="text-sm text-gray-700">
                        Water Rate = Total Expenses ({formatPeso(c.expenses.total)}) ÷ Projected Volume ({c.demand.projected_monthly_m3} m³)
                      </p>
                      <p className="text-xl font-bold text-blue-800 mt-2">
                        {formatPeso(c.base_rate)} / Cu. M.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm mt-4">
                        <Stat label="1.0 Cu. M." value={formatPeso(c.unit_conversions.per_cu_m)} />
                        <Stat label="1 Drum (200 L)" value={formatPeso(c.unit_conversions.per_drum_200l)} />
                        <Stat label="1 Container (20 L)" value={formatPeso(c.unit_conversions.per_container_20l)} />
                        <Stat label="1 Gallon (4 L)" value={formatPeso(c.unit_conversions.per_gallon_4l)} />
                        <Stat label="1 Liter" value={formatPeso(c.unit_conversions.per_liter)} />
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border p-5 overflow-x-auto">
                      <h3 className="font-semibold text-gray-900 mb-3">Water Rate Schedule</h3>
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Bracket</th>
                            <th className="px-3 py-2 text-right">Tapstand</th>
                            <th className="px-3 py-2 text-right">Residential</th>
                            <th className="px-3 py-2 text-right">Commercial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr className="bg-blue-50/50">
                            <td className="px-3 py-2">Basic rate (₱/m³)</td>
                            <td className="px-3 py-2 text-right">{formatPeso(c.classifications.tapstand.basic_rate)}</td>
                            <td className="px-3 py-2 text-right">{formatPeso(c.classifications.residential.basic_rate)}</td>
                            <td className="px-3 py-2 text-right">{formatPeso(c.classifications.commercial.basic_rate)}</td>
                          </tr>
                          <tr>
                            <td className="px-3 py-2">Minimum bill ({c.rate_policy.min_volume_m3} m³)</td>
                            <td className="px-3 py-2 text-right">{formatPeso(c.classifications.tapstand.minimum_bill)}</td>
                            <td className="px-3 py-2 text-right">{formatPeso(c.classifications.residential.minimum_bill)}</td>
                            <td className="px-3 py-2 text-right">{formatPeso(c.classifications.commercial.minimum_bill)}</td>
                          </tr>
                          {(c.classifications.residential.tiers.slice(1) as any[]).map((tier: any, i: number) => (
                            <tr key={i}>
                              <td className="px-3 py-2">{tier.label}</td>
                              <td className="px-3 py-2 text-right">{formatPeso(c.classifications.tapstand.tiers[i + 1]?.rate_per_m3)}</td>
                              <td className="px-3 py-2 text-right">{formatPeso(tier.rate_per_m3)}</td>
                              <td className="px-3 py-2 text-right">{formatPeso(c.classifications.commercial.tiers[i + 1]?.rate_per_m3)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                </section>
              )}

              {tab === 'results' && c && (
                <section className="space-y-4">
                  <div className="bg-white rounded-xl border p-5">
                    <h2 className="font-semibold text-gray-900 mb-3">Summary of Expenses</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                      <Stat label="Operating" value={formatPeso(c.expenses.operating_cost)} />
                      <Stat label="Depreciation" value={formatPeso(c.expenses.depreciation_cost)} />
                      <Stat label="Inflation" value={formatPeso(c.expenses.inflation_cost)} />
                      <Stat label="Amortization" value={formatPeso(c.expenses.amortization_cost)} />
                      <Stat label="Other (2.5–2.8)" value={formatPeso(c.expenses.other_total || 0)} />
                      <Stat label="Projected Volume" value={`${c.demand.projected_monthly_m3} m³`} />
                      <Stat label="Base Rate" value={`${formatPeso(c.base_rate)} / m³`} highlight />
                    </div>
                    <p className="text-lg font-bold mt-4 text-gray-900">
                      Total Expenses: {formatPeso(c.expenses.total)} / month
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h2 className="font-semibold text-gray-900 mb-2">Apply to Supply Rates</h2>
                    <p className="text-sm text-gray-600 mb-3">
                      Writes the selected classification schedule into this supply&apos;s progressive rate tiers (used for billing). Save is performed automatically first.
                    </p>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Classification to publish</label>
                        <select
                          value={applyClass}
                          onChange={(e) => setApplyClass(e.target.value as typeof applyClass)}
                          className="px-3 py-2 border rounded-lg text-sm bg-white"
                        >
                          <option value="residential">Residential (+{form.markup_residential_percent}%)</option>
                          <option value="tapstand">Tapstand / Communal (+{form.markup_tapstand_percent}%)</option>
                          <option value="commercial">Commercial / Industrial (+{form.markup_commercial_percent}%)</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleApply}
                        disabled={applying || !c.base_rate}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                      >
                        {applying ? 'Applying...' : 'Apply to Supply Rates'}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {tab !== 'results' && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save & Recalculate'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`font-semibold ${highlight ? 'text-blue-800' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
