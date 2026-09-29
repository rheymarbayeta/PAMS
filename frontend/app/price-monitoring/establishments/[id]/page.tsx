'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert, showConfirm } from '@/utils/modal';
import { formatCurrency, formatMarketType } from '@/features/price-monitoring/formatters';
import { TrendBadge, FormField, Modal, LoadingSpinner } from '@/features/price-monitoring/shared';

interface Market { market_id: string; market_name: string; barangay: string; address: string; market_type: string; is_active: boolean; created_at: string; dealer_operator?: string; contact_number?: string; supplier?: string; oil_company?: string; gps_lat?: string; gps_lng?: string; }
interface Inspection { inspection_id: string; inspection_date: string; time_in: string | null; time_out: string | null; special_assignment_no: string | null; inspected_by: string | null; remarks: string | null; created_by_name: string | null; }
interface Stats { total_records: number; commodities_monitored: number; pending_records: number | null; first_recorded: string | null; last_recorded: string | null; }
interface LatestPrice { commodity_id: string; commodity_name: string; unit: string; category_name: string; current_price: number; recorded_date: string; is_verified: boolean; prev_price: number | null; prev_date: string | null; min_price: number; max_price: number; }
interface MarketAlert { alert_id: string; alert_name: string; alert_type: string; threshold_value: number; is_active: boolean; last_triggered_at: string | null; commodity_name: string; unit: string; }
interface PriceRecord { record_id: string; commodity_id: string; price: number; recorded_date: string; notes: string; source: string; is_verified: boolean; commodity_name: string; unit: string; category_name: string; recorder_name: string; }

const MARKET_TYPES = ['public_market', 'supermarket', 'grocery', 'sari_sari', 'wet_market', 'other'];
const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

const formatDate = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('en-PH') : '—');

function alertLabel(a: MarketAlert) {
  if (a.alert_type === 'above') return `Above ${formatCurrency(a.threshold_value)}`;
  if (a.alert_type === 'below') return `Below ${formatCurrency(a.threshold_value)}`;
  return `Change ≥ ${Number(a.threshold_value).toFixed(1)}%`;
}

export default function EstablishmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['SuperAdmin', 'Admin']);
  const canInspect = hasRole(['SuperAdmin', 'Admin', 'Assessor']);

  const [market, setMarket] = useState<Market | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [latestPrices, setLatestPrices] = useState<LatestPrice[]>([]);
  const [alerts, setAlerts] = useState<MarketAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [filterCommodity, setFilterCommodity] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const [showEdit, setShowEdit] = useState(false);
  const emptyForm = { market_name: '', barangay: '', address: '', market_type: 'public_market', is_active: true, dealer_operator: '', contact_number: '', supplier: '', oil_company: '', gps_lat: '', gps_lng: '' };
  const [form, setForm] = useState(emptyForm);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [r, ins] = await Promise.all([
        api.get(`/api/price-monitoring/markets/${id}`),
        api.get(`/api/price-monitoring/markets/${id}/inspections`),
      ]);
      setMarket(r.data.market);
      setStats(r.data.stats);
      setLatestPrices(r.data.latest_prices);
      setAlerts(r.data.alerts);
      setInspections(ins.data);
    } catch (e: any) {
      if (e.response?.status === 404) setNotFound(true);
      else console.error(e);
    }
    setLoading(false);
  }, [id]);

  const loadRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const params = new URLSearchParams({ market_id: id, limit: '500' });
      if (filterCommodity) params.append('commodity_id', filterCommodity);
      if (filterFrom) params.append('date_from', filterFrom);
      if (filterTo) params.append('date_to', filterTo);
      const r = await api.get(`/api/price-monitoring/records?${params}`);
      setRecords(r.data);
    } catch (e) { console.error(e); }
    setRecordsLoading(false);
  }, [id, filterCommodity, filterFrom, filterTo]);

  useEffect(() => { loadDetail(); }, [loadDetail]);
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const openEdit = () => {
    if (!market) return;
    setForm({
      market_name: market.market_name, barangay: market.barangay || '', address: market.address || '',
      market_type: market.market_type, is_active: !!market.is_active,
      dealer_operator: market.dealer_operator || '', contact_number: market.contact_number || '',
      supplier: market.supplier || '', oil_company: market.oil_company || '',
      gps_lat: market.gps_lat || '', gps_lng: market.gps_lng || '',
    });
    setShowEdit(true);
  };

  const removeInspection = (inspectionId: string) => {
    showConfirm('Delete this inspection report?', 'Confirm Delete', async () => {
      try { await api.delete(`/api/price-monitoring/inspections/${inspectionId}`); loadDetail(); }
      catch (e: any) { showAlert(e.response?.data?.error || 'Failed to delete', 'Error'); }
    }, undefined, { isDangerous: true, okText: 'Delete' });
  };

  const submitEdit = async () => {
    if (!form.market_name) return showAlert('Establishment name is required.', 'Validation Error');
    try {
      await api.put(`/api/price-monitoring/markets/${id}`, form);
      setShowEdit(false);
      loadDetail();
    } catch (e: any) { showAlert(e.response?.data?.error || 'Failed to save', 'Error'); }
  };

  const verify = async (recordId: string) => {
    try {
      await api.put(`/api/price-monitoring/records/${recordId}/verify`);
      loadRecords();
      loadDetail();
    } catch (e) { console.error(e); }
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto space-y-6">
          <Link href="/price-monitoring?tab=markets" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Establishments
          </Link>

          {loading ? <LoadingSpinner /> : notFound || !market ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">Establishment not found.</div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-slate-800">{market.market_name}</h1>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${market.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {market.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">{formatMarketType(market.market_type)}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <div className="flex gap-2"><dt className="text-slate-400">Barangay:</dt><dd className="text-slate-700">{market.barangay || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="text-slate-400">Address:</dt><dd className="text-slate-700">{market.address || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="text-slate-400">Registered:</dt><dd className="text-slate-700">{formatDate(market.created_at)}</dd></div>
                    <div className="flex gap-2"><dt className="text-slate-400">Dealer/Operator:</dt><dd className="text-slate-700">{market.dealer_operator || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="text-slate-400">Contact:</dt><dd className="text-slate-700">{market.contact_number || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="text-slate-400">Oil Company:</dt><dd className="text-slate-700">{market.oil_company || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="text-slate-400">Supplier:</dt><dd className="text-slate-700">{market.supplier || '—'}</dd></div>
                    <div className="flex gap-2"><dt className="text-slate-400">GPS:</dt><dd className="text-slate-700">{market.gps_lat && market.gps_lng ? `${market.gps_lat}, ${market.gps_lng}` : '—'}</dd></div>
                  </dl>
                </div>
                <div className="flex gap-2 self-start">
                  {canInspect && (
                    <Link href={`/price-monitoring/establishments/${market.market_id}/inspection`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap">
                      New DOE Inspection Report
                    </Link>
                  )}
                  {isAdmin && (
                    <button onClick={openEdit} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Edit</button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Price Records', value: stats?.total_records ?? 0 },
                  { label: 'Commodities Monitored', value: stats?.commodities_monitored ?? 0 },
                  { label: 'Pending Verification', value: Number(stats?.pending_records ?? 0) },
                  { label: 'Last Recorded', value: formatDate(stats?.last_recorded) },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{s.label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Latest prices */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Current Prices</h2>
                  <p className="text-xs text-slate-400">Latest recorded price per commodity, compared with the previous recording</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Commodity', 'Current', 'Previous', 'Change', 'Low / High', 'As of'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {latestPrices.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No prices recorded for this establishment yet.</td></tr>
                      )}
                      {latestPrices.map(p => {
                        const cur = Number(p.current_price);
                        const prev = p.prev_price != null ? Number(p.prev_price) : null;
                        const pct = prev ? ((cur - prev) / prev) * 100 : 0;
                        return (
                          <tr key={p.commodity_id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{p.commodity_name}</p>
                              <p className="text-xs text-slate-400">{p.category_name} · per {p.unit}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(cur)}</td>
                            <td className="px-4 py-3 text-slate-500">{prev != null ? formatCurrency(prev) : '—'}</td>
                            <td className="px-4 py-3">
                              {prev != null ? (
                                <div className="flex items-center gap-2">
                                  <span className={cur > prev ? 'text-red-600' : cur < prev ? 'text-green-600' : 'text-slate-400'}>
                                    {cur - prev >= 0 ? '+' : '−'}{formatCurrency(Math.abs(cur - prev))}
                                  </span>
                                  <TrendBadge pct={pct} />
                                </div>
                              ) : <span className="text-slate-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatCurrency(p.min_price)} / {formatCurrency(p.max_price)}</td>
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(p.recorded_date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* DOE inspection reports */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">DOE Inspection Reports</h2>
                  <p className="text-xs text-slate-400">Inspection Report Form — Retailing of Liquid Fuels (LF) and LPG</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Date', 'Time In / Out', 'Special Assignment No.', 'Inspected By', 'Remarks', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspections.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No inspection reports yet.</td></tr>
                      )}
                      {inspections.map(i => (
                        <tr key={i.inspection_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDate(i.inspection_date)}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{[i.time_in, i.time_out].filter(Boolean).join(' – ') || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{i.special_assignment_no || '—'}</td>
                          <td className="px-4 py-3 text-slate-500">{i.inspected_by || i.created_by_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={i.remarks || ''}>{i.remarks || '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-3">
                              <Link href={`/price-monitoring/establishments/${id}/inspection?inspection_id=${i.inspection_id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Open / Print</Link>
                              {isAdmin && (
                                <button onClick={() => removeInspection(i.inspection_id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800">Price Alerts for this Establishment</h2>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {alerts.map(a => (
                      <li key={a.alert_id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{a.alert_name}</p>
                          <p className="text-xs text-slate-400">{a.commodity_name} · {alertLabel(a)}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">Last triggered: {formatDate(a.last_triggered_at)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* History */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-800">Price History</h2>
                    <p className="text-xs text-slate-400">{records.length} record(s)</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select value={filterCommodity} onChange={e => setFilterCommodity(e.target.value)} className={inputClass}>
                      <option value="">All Commodities</option>
                      {latestPrices.map(p => <option key={p.commodity_id} value={p.commodity_id}>{p.commodity_name}</option>)}
                    </select>
                    <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={inputClass} />
                    <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={inputClass} />
                  </div>
                </div>
                {recordsLoading ? <LoadingSpinner /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Date', 'Commodity', 'Price', 'Source', 'Recorded By', 'Notes', 'Status'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {records.length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No records match the filters.</td></tr>
                        )}
                        {records.map(r => (
                          <tr key={r.record_id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(r.recorded_date)}</td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">{r.commodity_name}</p>
                              <p className="text-xs text-slate-400">per {r.unit}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(r.price)}</td>
                            <td className="px-4 py-3 text-slate-500 capitalize">{r.source?.replace(/_/g, ' ')}</td>
                            <td className="px-4 py-3 text-slate-500">{r.recorder_name || '—'}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={r.notes || ''}>{r.notes || '—'}</td>
                            <td className="px-4 py-3">
                              {r.is_verified
                                ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Verified</span>
                                : isAdmin
                                  ? <button onClick={() => verify(r.record_id)} className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200">Pending · Verify</button>
                                  : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Pending</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {showEdit && (
          <Modal title="Edit Establishment" onClose={() => setShowEdit(false)}>
            <div className="space-y-4">
              <FormField label="Establishment Name *">
                <input value={form.market_name} onChange={e => setForm({ ...form, market_name: e.target.value })} className={inputClass} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Barangay">
                  <input value={form.barangay} onChange={e => setForm({ ...form, barangay: e.target.value })} className={inputClass} />
                </FormField>
                <FormField label="Establishment Type">
                  <select value={form.market_type} onChange={e => setForm({ ...form, market_type: e.target.value })} className={inputClass}>
                    {MARKET_TYPES.map(t => <option key={t} value={t}>{formatMarketType(t)}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Address">
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className={inputClass} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Dealer / Operator">
                  <input value={form.dealer_operator} onChange={e => setForm({ ...form, dealer_operator: e.target.value })} className={inputClass} />
                </FormField>
                <FormField label="Contact Number">
                  <input value={form.contact_number} onChange={e => setForm({ ...form, contact_number: e.target.value })} className={inputClass} />
                </FormField>
                <FormField label="Oil Company / Trademark">
                  <input value={form.oil_company} onChange={e => setForm({ ...form, oil_company: e.target.value })} className={inputClass} />
                </FormField>
                <FormField label="Supplier">
                  <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className={inputClass} />
                </FormField>
                <FormField label="GPS Latitude">
                  <input value={form.gps_lat} onChange={e => setForm({ ...form, gps_lat: e.target.value })} className={inputClass} />
                </FormField>
                <FormField label="GPS Longitude">
                  <input value={form.gps_lng} onChange={e => setForm({ ...form, gps_lng: e.target.value })} className={inputClass} />
                </FormField>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Active
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowEdit(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                <button onClick={submitEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
              </div>
            </div>
          </Modal>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
