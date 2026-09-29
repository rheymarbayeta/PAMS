'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/utils/modal';
import { LoadingSpinner } from '@/features/price-monitoring/shared';

interface Commodity { commodity_id: string; commodity_name: string; unit: string; }
interface PriceRecord { commodity_id: string; price: number; recorded_date: string; }

interface ProductRow {
  key: string;
  label: string;
  commodity_id: string | null;
  prev_price: string;
  curr_price: string;
  available_volume: string;
  daily_sales: string;
}

interface Header {
  business_name: string;
  dealer_operator: string;
  business_address: string;
  contact_number: string;
  supplier: string;
  oil_company: string;
  gps_lat: string;
  gps_lng: string;
  inspection_date: string;
  time_in: string;
  time_out: string;
  special_assignment_no: string;
  remarks: string;
  inspected_by: string;
  outlet_official: string;
}

// `match` is compared against normalized commodity names (see normalizeName)
const DOE_PRODUCTS = [
  { key: 'premium_plus_e0', label: 'Premium+ E0', match: 'premium+e0' },
  { key: 'premium_e20', label: 'Premium E20', match: 'premiume20' },
  { key: 'premium_plus_e10', label: 'Premium+ E10', match: 'premium+e10' },
  { key: 'premium_e10', label: 'Premium E10', match: 'premiume10' },
  { key: 'regular_e10', label: 'Regular E10', match: 'regulare10' },
  { key: 'diesel', label: 'Diesel', match: 'diesel' },
  { key: 'diesel_plus', label: 'Diesel+', match: 'diesel+' },
  { key: 'kerosene', label: 'Kerosene', match: 'kerosene' },
  { key: 'lpg', label: 'LPG', match: 'lpg' },
];

const REGION = 'Region VII (Central Visayas)';

function normalizeName(name: string) {
  return name.toLowerCase().replace(/plus/g, '+').replace(/gasoline|unleaded/g, '').replace(/[^a-z0-9+]/g, '');
}

function findCommodity(commodities: Commodity[], match: string) {
  return commodities.find(c => {
    const n = normalizeName(c.commodity_name);
    return n.startsWith(match) && n[match.length] !== '+';
  }) || null;
}

function isoDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function shiftDate(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function num(v: string) {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function adjustment(p: ProductRow) {
  const cur = num(p.curr_price), prev = num(p.prev_price);
  return cur != null && prev != null ? cur - prev : null;
}

function remainingDays(p: ProductRow) {
  const avail = num(p.available_volume), daily = num(p.daily_sales);
  return avail != null && daily != null && daily > 0 ? avail / daily : null;
}

function fmt(n: number | null, digits = 2) {
  return n == null ? '' : n.toLocaleString('en-PH', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtAdj(n: number | null) {
  if (n == null) return '';
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n))}`;
}

/** Monday of the calendar week containing `date` (weeks run Monday–Sunday). */
function weekStartOf(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return shiftDate(date, -((day + 6) % 7));
}

/** Current week = latest record from Monday of this week up to the inspection date;
 *  previous week = latest record from last week's Monday–Sunday. */
function pricesForDate(records: PriceRecord[], commodityId: string, date: string) {
  const thisWeekStart = weekStartOf(date);
  const lastWeekStart = shiftDate(thisWeekStart, -7);
  const lastWeekEnd = shiftDate(thisWeekStart, -1);
  const rows = records
    .filter(r => r.commodity_id === commodityId)
    .map(r => ({ date: String(r.recorded_date).split('T')[0], price: Number(r.price) }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const current = rows.find(r => r.date >= thisWeekStart && r.date <= date);
  const previous = rows.find(r => r.date >= lastWeekStart && r.date <= lastWeekEnd);
  return {
    curr_price: current ? current.price.toFixed(2) : '',
    prev_price: previous ? previous.price.toFixed(2) : '',
  };
}

function formatWeekRange(from: string, to: string) {
  const f = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return from === to ? `on ${f(from)}` : `${f(from)} – ${f(to)}`;
}

function escapeHtml(v: string) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTime12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h)) return t;
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function buildPrintHtml(h: Header, products: ProductRow[]) {
  const e = (v: string) => escapeHtml(v || '');
  const dateText = h.inspection_date
    ? new Date(`${h.inspection_date}T00:00:00`).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const timeText = [formatTime12(h.time_in), formatTime12(h.time_out)].filter(Boolean).join(' – ');
  const headCells = products.map(p => `<th>${e(p.label)}</th>`).join('');
  const row = (label: string, cell: (p: ProductRow) => string) =>
    `<tr><td class="lbl">${label}</td>${products.map(p => `<td class="val">${cell(p)}</td>`).join('')}</tr>`;
  const remarkLines = (h.remarks || '').split('\n');
  while (remarkLines.length < 3) remarkLines.push('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DOE Inspection Report - ${e(h.business_name)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Calibri, Arial, sans-serif; font-size: 10.5px; color: #000; margin: 0; }
  .hdr { display: flex; gap: 10px; align-items: center; }
  .logo { width: 67px; height: 59px; background: url('/images/doe-form-source.jpg') -52px -4px no-repeat; flex-shrink: 0; }
  .hdr .rp { font-family: 'Old English Text MT', 'UnifrakturMaguntia', serif; font-size: 11px; }
  .hdr .doe { font-weight: bold; font-size: 12px; }
  .monitored { font-style: italic; font-weight: bold; margin: 14px 0 20px; }
  h1 { text-align: center; font-size: 11.5px; margin: 0 0 20px; }
  .info { display: grid; grid-template-columns: 1.35fr 1fr; column-gap: 50px; row-gap: 11px; margin-bottom: 20px; }
  .f { display: flex; align-items: flex-end; gap: 6px; }
  .f .k { white-space: nowrap; }
  .f .v { flex: 1; border-bottom: 1px solid #000; min-height: 14px; padding: 0 4px; font-weight: 600; }
  .gps { display: flex; gap: 10px; align-items: flex-end; }
  .gps .f { flex: 1; }
  h2 { font-size: 11px; margin: 16px 0 6px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #000; padding: 4px 3px; }
  th { font-size: 9.5px; font-weight: bold; }
  th.first, td.lbl { width: 13%; text-align: left; font-size: 9.5px; }
  td.val { text-align: center; font-weight: 600; height: 30px; }
  .remarks { border-left: 1px solid #000; border-right: 1px solid #000; padding: 0 18px 14px; margin-top: 18px; }
  .remarks h2 { margin: 0; padding-top: 4px; }
  .line { border-bottom: 1px solid #000; min-height: 22px; padding: 6px 2px 2px; font-weight: 600; }
  .sig { display: flex; justify-content: space-between; margin-top: 34px; align-items: flex-end; }
  .sig .blk { width: 45%; }
  .sig .name { border-bottom: 1px solid #000; min-height: 18px; text-align: center; font-weight: 600; }
  .sig .cap { text-align: center; font-weight: bold; margin-top: 4px; font-size: 9.5px; }
</style></head><body>
<div class="hdr">
  <div class="logo"></div>
  <div>
    <div class="rp">Republic of the Philippines</div>
    <div class="doe">DEPARTMENT OF ENERGY</div>
    <div>Energy Center, Rizal Drive, Bonifacio Global City, Taguig City</div>
    <div>(02) 8840-2184 / 8479-2900 Local 376; rmmscd@doe.gov.ph</div>
  </div>
</div>
<div class="monitored">As monitored by Visayas Field Office-Oil Industry Management Division</div>
<h1>INSPECTION REPORT FORM - RETAILING OF LIQUID FUELS (LF) and LPG</h1>
<div class="info">
  <div class="f"><span class="k">Business Name:</span><span class="v">${e(h.business_name)}</span></div>
  <div class="f"><span class="k">Date of Inspection :</span><span class="v">${e(dateText)}</span></div>
  <div class="f"><span class="k">Dealer/Operator:</span><span class="v">${e(h.dealer_operator)}</span></div>
  <div class="f"><span class="k">Time in &amp; Time out:</span><span class="v">${e(timeText)}</span></div>
  <div class="f"><span class="k">Business Address:<br><small>(St, Brgy., City/Mun, Province, Region)</small></span><span class="v">${e(h.business_address)}</span></div>
  <div class="f"><span class="k">Special Assignment No.:</span><span class="v">${e(h.special_assignment_no)}</span></div>
  <div class="gps"><span>GPS:</span>
    <div class="f"><span class="k">Lat:</span><span class="v">${e(h.gps_lat)}</span></div>
    <div class="f"><span class="k">Long:</span><span class="v">${e(h.gps_lng)}</span></div>
  </div>
  <div class="f"><span class="k">Contact Number:</span><span class="v">${e(h.contact_number)}</span></div>
  <div class="f"><span class="k">Oil Company/Trademark:</span><span class="v">${e(h.oil_company)}</span></div>
  <div class="f"><span class="k">Supplier:</span><span class="v">${e(h.supplier)}</span></div>
</div>

<h2>I.&nbsp;&nbsp;PRICE MONITORING</h2>
<table>
  <tr><th class="first">FUEL / PRODUCT</th>${headCells}</tr>
  ${row('Previous Week Price (₱/Li)', p => e(fmt(num(p.prev_price))))}
  ${row('Current Week Price (₱/Li)', p => e(fmt(num(p.curr_price))))}
  ${row('Price Adjustment (₱/Li)', p => e(fmtAdj(adjustment(p))))}
</table>

<h2>II. INVENTORY MONITORING</h2>
<table>
  <tr><th class="first">FUEL / PRODUCT</th>${headCells}</tr>
  ${row('Available Volume', p => e(fmt(num(p.available_volume), 0)))}
  ${row('Estimated Daily Sales Volume', p => e(fmt(num(p.daily_sales), 0)))}
  ${row('Remaining Days Supply', p => e(fmt(remainingDays(p), 1)))}
</table>

<div class="remarks">
  <h2>III. REMARKS/OBSERVATION ON INCIDENT OF HOARDING:</h2>
  ${remarkLines.map(l => `<div class="line">${e(l)}</div>`).join('')}
  <div class="sig">
    <div class="blk"><div style="font-weight:bold;margin-bottom:18px">Inspected by:</div><div class="name">${e(h.inspected_by)}</div></div>
    <div class="blk"><div class="name">${e(h.outlet_official)}</div><div class="cap">Signature over Printed Name of the Retail Outlet Official</div></div>
  </div>
</div>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`;
}

const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500';
const cellInput = 'w-full border border-slate-200 rounded px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function FuelInspectionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [marketName, setMarketName] = useState('');
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [header, setHeader] = useState<Header>({
    business_name: '', dealer_operator: '', business_address: '', contact_number: '', supplier: '',
    oil_company: '', gps_lat: '', gps_lng: '', inspection_date: isoDate(new Date()), time_in: nowTime(),
    time_out: '', special_assignment_no: '', remarks: '', inspected_by: '', outlet_official: '',
  });
  const [products, setProducts] = useState<ProductRow[]>([]);

  const fillPrices = useCallback((rows: ProductRow[], recs: PriceRecord[], date: string) =>
    rows.map(p => (p.commodity_id ? { ...p, ...pricesForDate(recs, p.commodity_id, date) } : p)), []);

  useEffect(() => {
    const existingId = new URLSearchParams(window.location.search).get('inspection_id');
    (async () => {
      setLoading(true);
      try {
        const [mRes, cRes, rRes, iRes] = await Promise.all([
          api.get(`/api/price-monitoring/markets/${id}`),
          api.get('/api/price-monitoring/commodities'),
          api.get(`/api/price-monitoring/records?market_id=${id}&limit=500`),
          existingId ? api.get(`/api/price-monitoring/inspections/${existingId}`) : Promise.resolve(null),
        ]);
        const market = mRes.data.market;
        const coms: Commodity[] = cRes.data;
        const recs: PriceRecord[] = rRes.data;
        setMarketName(market.market_name);
        setCommodities(coms);
        setRecords(recs);

        const baseRows: ProductRow[] = DOE_PRODUCTS.map(d => ({
          key: d.key, label: d.label, commodity_id: findCommodity(coms, d.match)?.commodity_id || null,
          prev_price: '', curr_price: '', available_volume: '', daily_sales: '',
        }));

        if (iRes) {
          const insp = iRes.data;
          setInspectionId(insp.inspection_id);
          setHeader({
            business_name: insp.business_name || '', dealer_operator: insp.dealer_operator || '',
            business_address: insp.business_address || '', contact_number: insp.contact_number || '',
            supplier: insp.supplier || '', oil_company: insp.oil_company || '',
            gps_lat: insp.gps_lat || '', gps_lng: insp.gps_lng || '',
            inspection_date: String(insp.inspection_date).split('T')[0], time_in: insp.time_in || '',
            time_out: insp.time_out || '', special_assignment_no: insp.special_assignment_no || '',
            remarks: insp.remarks || '', inspected_by: insp.inspected_by || '', outlet_official: insp.outlet_official || '',
          });
          const saved: Partial<ProductRow>[] = insp.products || [];
          setProducts(baseRows.map(r => ({ ...r, ...(saved.find(s => s.key === r.key) || {}) })));
        } else {
          const address = market.address
            || [market.barangay, 'Dalaguete', 'Cebu'].filter(Boolean).join(', ');
          const date = isoDate(new Date());
          setHeader(h => ({
            ...h,
            business_name: market.market_name || '',
            dealer_operator: market.dealer_operator || '',
            business_address: address && !address.includes('Region') ? `${address}, ${REGION}` : address,
            contact_number: market.contact_number || '',
            supplier: market.supplier || '',
            oil_company: market.oil_company || '',
            gps_lat: market.gps_lat || '',
            gps_lng: market.gps_lng || '',
            inspection_date: date,
          }));
          setProducts(fillPrices(baseRows, recs, date));
        }
      } catch (e: any) {
        showAlert(e.response?.data?.error || 'Failed to load establishment', 'Error');
      }
      setLoading(false);
    })();
  }, [id, fillPrices]);

  useEffect(() => {
    if (!loading && !inspectionId && user?.full_name)
      setHeader(h => (h.inspected_by ? h : { ...h, inspected_by: user.full_name }));
  }, [loading, inspectionId, user?.full_name]);

  const setField = (k: keyof Header, v: string) => setHeader(h => ({ ...h, [k]: v }));

  const setProduct = (key: string, k: keyof ProductRow, v: string) =>
    setProducts(ps => ps.map(p => (p.key === key ? { ...p, [k]: v } : p)));

  const changeDate = (date: string) => {
    setField('inspection_date', date);
    if (!inspectionId && date) setProducts(ps => fillPrices(ps, records, date));
  };

  const refreshPrices = () => {
    if (header.inspection_date) setProducts(ps => fillPrices(ps, records, header.inspection_date));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return showAlert('Location is not available in this browser.', 'GPS');
    navigator.geolocation.getCurrentPosition(
      pos => setHeader(h => ({ ...h, gps_lat: pos.coords.latitude.toFixed(6), gps_lng: pos.coords.longitude.toFixed(6) })),
      () => showAlert('Could not get your location. Allow location access or enter coordinates manually.', 'GPS'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const save = async () => {
    if (!header.business_name || !header.inspection_date)
      return showAlert('Business name and date of inspection are required.', 'Validation Error');
    setSaving(true);
    try {
      const payload = { ...header, products };
      if (inspectionId) {
        await api.put(`/api/price-monitoring/inspections/${inspectionId}`, payload);
      } else {
        const r = await api.post(`/api/price-monitoring/markets/${id}/inspections`, payload);
        setInspectionId(r.data.inspection_id);
        window.history.replaceState(null, '', `?inspection_id=${r.data.inspection_id}`);
      }
      showAlert('Inspection report saved.', 'Saved');
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to save inspection', 'Error');
    }
    setSaving(false);
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) return showAlert('Allow pop-ups to print the report.', 'Print');
    w.document.write(buildPrintHtml(header, products));
    w.document.close();
  };

  const commodityName = (cid: string | null) => commodities.find(c => c.commodity_id === cid)?.commodity_name;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <Link href={`/price-monitoring/establishments/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to {marketName || 'Establishment'}
              </Link>
              <h1 className="text-xl font-bold text-slate-800 mt-1">DOE Inspection Report — Retailing of Liquid Fuels (LF) and LPG</h1>
              <p className="text-xs text-slate-500">
                {inspectionId ? 'Editing a saved inspection report.' : 'Fields are pre-filled from the establishment profile, price records and your account. Review and complete before saving.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={print} disabled={loading} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Print</button>
              <button onClick={save} disabled={loading || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : inspectionId ? 'Save Changes' : 'Save Report'}
              </button>
            </div>
          </div>

          {loading ? <LoadingSpinner /> : (
            <>
              {/* Business information */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-semibold text-slate-800 mb-4">Business Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Business Name *"><input value={header.business_name} onChange={e => setField('business_name', e.target.value)} className={inputClass} /></Field>
                  <Field label="Date of Inspection *"><input type="date" value={header.inspection_date} onChange={e => changeDate(e.target.value)} className={inputClass} /></Field>
                  <Field label="Dealer / Operator"><input value={header.dealer_operator} onChange={e => setField('dealer_operator', e.target.value)} className={inputClass} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Time In"><input type="time" value={header.time_in} onChange={e => setField('time_in', e.target.value)} className={inputClass} /></Field>
                    <Field label="Time Out">
                      <div className="flex gap-1">
                        <input type="time" value={header.time_out} onChange={e => setField('time_out', e.target.value)} className={inputClass} />
                        <button type="button" onClick={() => setField('time_out', nowTime())} className="px-2 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Now</button>
                      </div>
                    </Field>
                  </div>
                  <Field label="Business Address (St, Brgy., City/Mun, Province, Region)"><input value={header.business_address} onChange={e => setField('business_address', e.target.value)} className={inputClass} /></Field>
                  <Field label="Special Assignment No."><input value={header.special_assignment_no} onChange={e => setField('special_assignment_no', e.target.value)} className={inputClass} /></Field>
                  <Field label="GPS">
                    <div className="flex gap-2">
                      <input value={header.gps_lat} onChange={e => setField('gps_lat', e.target.value)} placeholder="Lat" className={inputClass} />
                      <input value={header.gps_lng} onChange={e => setField('gps_lng', e.target.value)} placeholder="Long" className={inputClass} />
                      <button type="button" onClick={useCurrentLocation} title="Use my current location" className="px-3 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 whitespace-nowrap">📍 Locate</button>
                    </div>
                  </Field>
                  <Field label="Contact Number"><input value={header.contact_number} onChange={e => setField('contact_number', e.target.value)} className={inputClass} /></Field>
                  <Field label="Oil Company / Trademark"><input value={header.oil_company} onChange={e => setField('oil_company', e.target.value)} className={inputClass} /></Field>
                  <Field label="Supplier"><input value={header.supplier} onChange={e => setField('supplier', e.target.value)} className={inputClass} /></Field>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">Dealer, contact number, supplier, oil company and GPS are saved to the establishment and pre-filled on the next inspection.</p>
              </div>

              {/* Price monitoring */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-slate-800">I. Price Monitoring</h2>
                    {header.inspection_date && (
                      <p className="text-xs text-slate-400">
                        Previous week = latest price recorded {formatWeekRange(shiftDate(weekStartOf(header.inspection_date), -7), shiftDate(weekStartOf(header.inspection_date), -1))};
                        current week = latest price from {formatWeekRange(weekStartOf(header.inspection_date), header.inspection_date)}. Blank if nothing was recorded that week.
                      </p>
                    )}
                  </div>
                  <button onClick={refreshPrices} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 whitespace-nowrap">↻ Refill from records</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-44">Fuel / Product</th>
                        {products.map(p => (
                          <th key={p.key} className="px-2 py-2 text-center text-xs font-semibold text-slate-600">
                            {p.label}
                            <div className={`text-[10px] font-normal ${p.commodity_id ? 'text-green-600' : 'text-slate-400'}`} title={commodityName(p.commodity_id) || 'No matching commodity'}>
                              {p.commodity_id ? 'linked' : 'manual'}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-3 py-2 text-xs text-slate-600">Previous Week Price (₱/Li)</td>
                        {products.map(p => <td key={p.key} className="px-1 py-1.5"><input type="number" step="0.01" value={p.prev_price} onChange={e => setProduct(p.key, 'prev_price', e.target.value)} className={cellInput} /></td>)}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-xs text-slate-600">Current Week Price (₱/Li)</td>
                        {products.map(p => <td key={p.key} className="px-1 py-1.5"><input type="number" step="0.01" value={p.curr_price} onChange={e => setProduct(p.key, 'curr_price', e.target.value)} className={cellInput} /></td>)}
                      </tr>
                      <tr className="bg-slate-50/60">
                        <td className="px-3 py-2 text-xs text-slate-600">Price Adjustment (₱/Li)</td>
                        {products.map(p => {
                          const adj = adjustment(p);
                          return (
                            <td key={p.key} className={`px-1 py-2 text-center font-semibold ${adj == null ? 'text-slate-300' : adj > 0 ? 'text-red-600' : adj < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                              {adj == null ? '—' : fmtAdj(adj)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inventory monitoring */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">II. Inventory Monitoring</h2>
                  <p className="text-xs text-slate-400">Remaining days supply = available volume ÷ estimated daily sales. Under 3 days is highlighted.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-44">Fuel / Product</th>
                        {products.map(p => <th key={p.key} className="px-2 py-2 text-center text-xs font-semibold text-slate-600">{p.label}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-3 py-2 text-xs text-slate-600">Available Volume</td>
                        {products.map(p => <td key={p.key} className="px-1 py-1.5"><input type="number" step="1" min="0" value={p.available_volume} onChange={e => setProduct(p.key, 'available_volume', e.target.value)} className={cellInput} /></td>)}
                      </tr>
                      <tr>
                        <td className="px-3 py-2 text-xs text-slate-600">Estimated Daily Sales Volume</td>
                        {products.map(p => <td key={p.key} className="px-1 py-1.5"><input type="number" step="1" min="0" value={p.daily_sales} onChange={e => setProduct(p.key, 'daily_sales', e.target.value)} className={cellInput} /></td>)}
                      </tr>
                      <tr className="bg-slate-50/60">
                        <td className="px-3 py-2 text-xs text-slate-600">Remaining Days Supply</td>
                        {products.map(p => {
                          const days = remainingDays(p);
                          return (
                            <td key={p.key} className={`px-1 py-2 text-center font-semibold ${days == null ? 'text-slate-300' : days < 3 ? 'text-red-600 bg-red-50' : 'text-slate-700'}`}>
                              {days == null ? '—' : fmt(days, 1)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks & signatures */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <Field label="III. Remarks / Observation on Incident of Hoarding">
                  <textarea value={header.remarks} onChange={e => setField('remarks', e.target.value)} rows={3} className={inputClass} placeholder="Leave blank if no incident was observed" />
                </Field>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Inspected by"><input value={header.inspected_by} onChange={e => setField('inspected_by', e.target.value)} className={inputClass} /></Field>
                  <Field label="Retail Outlet Official (printed name)"><input value={header.outlet_official} onChange={e => setField('outlet_official', e.target.value)} className={inputClass} /></Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 pb-6">
                <button onClick={() => router.push(`/price-monitoring/establishments/${id}`)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Close</button>
                <button onClick={print} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Print</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving...' : inspectionId ? 'Save Changes' : 'Save Report'}
                </button>
              </div>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
