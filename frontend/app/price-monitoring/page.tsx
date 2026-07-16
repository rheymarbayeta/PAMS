'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert, showConfirm } from '@/utils/modal';
import { formatCurrency, formatMarketType } from '@/features/price-monitoring/formatters';
import { TrendBadge, FormField, Modal, LoadingSpinner } from '@/features/price-monitoring/shared';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Category { category_id: string; category_name: string; description: string; commodity_count: number; }
interface Commodity { commodity_id: string; category_id: string; commodity_name: string; unit: string; description: string; is_active: boolean; category_name: string; latest_price?: number; latest_date?: string; }
interface Market { market_id: string; market_name: string; barangay: string; address: string; market_type: string; is_active: boolean; }
interface PriceRecord { record_id: string; commodity_id: string; market_id: string; price: number; recorded_date: string; notes: string; source: string; is_verified: boolean; commodity_name: string; unit: string; category_name: string; market_name: string; recorder_name: string; }
interface PriceAlert { alert_id: string; alert_name: string; commodity_id: string; market_id: string | null; alert_type: string; threshold_value: number; is_active: boolean; commodity_name: string; unit: string; market_name: string | null; trigger_count: number; last_triggered_at: string | null; }
interface OverviewData { stats: { total_records: number; total_commodities: number; total_markets: number; active_alerts: number; triggered_today: number; }; recent_records: any[]; price_changes: any[]; }
interface AnalysisData { commodity: Commodity; has_data: boolean; message?: string; period_days?: number; record_count?: number; statistics?: any; price_history?: any[]; forecast?: any[]; anomalies?: any[]; insights?: any[]; }

type Tab = 'overview' | 'commodities' | 'markets' | 'records' | 'alerts' | 'analysis';

const MARKET_TYPES = ['public_market', 'supermarket', 'grocery', 'sari_sari', 'wet_market', 'other'];
const SOURCE_TYPES = ['field_survey', 'market_report', 'official_bulletin', 'other'];
const ALERT_TYPES = [{ value: 'above', label: 'Price Above Threshold' }, { value: 'below', label: 'Price Below Threshold' }, { value: 'change_pct', label: '% Change Threshold' }];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function PriceMonitoringPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['SuperAdmin', 'Admin']);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showReportModal, setShowReportModal] = useState(false);

  const tabs: { key: Tab; label: string; icon: JSX.Element }[] = [
    { key: 'overview', label: 'Overview', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { key: 'records', label: 'Price Records', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
    { key: 'commodities', label: 'Commodities', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> },
    { key: 'markets', label: 'Establishments', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { key: 'alerts', label: 'Price Alerts', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
    { key: 'analysis', label: 'AI Analysis', icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6 max-w-screen-xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Price Monitoring</h1>
              <p className="text-slate-500 text-sm mt-1">Monitor commodity prices, detect trends, and receive AI-powered insights</p>
            </div>
            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 whitespace-nowrap shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Generate Report
            </button>
          </div>

          {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}

          {/* Tabs */}
          <div className="border-b border-slate-200 mb-6">
            <div className="flex gap-1 overflow-x-auto pb-px">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'records' && <RecordsTab isAdmin={isAdmin} />}
          {activeTab === 'commodities' && <CommoditiesTab isAdmin={isAdmin} />}
          {activeTab === 'markets' && <MarketsTab isAdmin={isAdmin} />}
          {activeTab === 'alerts' && <AlertsTab isAdmin={isAdmin} />}
          {activeTab === 'analysis' && <AnalysisTab />}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

// ─── REPORT MODAL ─────────────────────────────────────────────────────────────
function ReportModal({ onClose }: { onClose: () => void }) {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>([]);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/price-monitoring/commodities?active=true'),
      api.get('/api/price-monitoring/markets'),
    ]).then(([cc, mm]) => {
      setCommodities(cc.data);
      setMarkets(mm.data);
      setSelectedCommodities(cc.data.map((c: Commodity) => c.commodity_id));
      setSelectedMarkets(mm.data.map((m: Market) => m.market_id));
    }).finally(() => setLoading(false));
  }, []);

  const toggleAll = (ids: string[], selected: string[], setFn: (v: string[]) => void) =>
    setFn(selected.length === ids.length ? [] : ids);

  const generate = () => {
    if (!selectedCommodities.length) return showAlert('Select at least one commodity.', 'Validation');
    const token = localStorage.getItem('token') || '';
    const params = new URLSearchParams();
    params.set('commodities', selectedCommodities.join(','));
    if (selectedMarkets.length && selectedMarkets.length < markets.length)
      params.set('markets', selectedMarkets.join(','));
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo)   params.set('dateTo', dateTo);
    params.set('token', token);
    window.open(`/price-monitoring-report.html?${params.toString()}`, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h2 className="font-semibold text-slate-800 text-lg">Generate Price Monitoring Report</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {loading ? <LoadingSpinner /> : <>
            {/* Date Range */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>

            {/* Commodities */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">Commodities</label>
                <button onClick={() => toggleAll(commodities.map(c => c.commodity_id), selectedCommodities, setSelectedCommodities)}
                  className="text-xs text-indigo-600 hover:underline">
                  {selectedCommodities.length === commodities.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                {commodities.length === 0 && <p className="px-3 py-4 text-slate-400 text-sm text-center">No commodities found</p>}
                {commodities.map(c => (
                  <label key={c.commodity_id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedCommodities.includes(c.commodity_id)}
                      onChange={() => setSelectedCommodities(prev =>
                        prev.includes(c.commodity_id) ? prev.filter(id => id !== c.commodity_id) : [...prev, c.commodity_id]
                      )}
                      className="rounded border-slate-300 text-indigo-600" />
                    <span className="text-sm text-slate-700 flex-1">{c.commodity_name}</span>
                    <span className="text-xs text-slate-400">{c.unit} · {c.category_name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{selectedCommodities.length} of {commodities.length} selected</p>
            </div>

            {/* Establishments */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-slate-700">Establishments</label>
                <button onClick={() => toggleAll(markets.map(m => m.market_id), selectedMarkets, setSelectedMarkets)}
                  className="text-xs text-indigo-600 hover:underline">
                  {selectedMarkets.length === markets.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                {markets.length === 0 && <p className="px-3 py-4 text-slate-400 text-sm text-center">No establishments found</p>}
                {markets.map(m => (
                  <label key={m.market_id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={selectedMarkets.includes(m.market_id)}
                      onChange={() => setSelectedMarkets(prev =>
                        prev.includes(m.market_id) ? prev.filter(id => id !== m.market_id) : [...prev, m.market_id]
                      )}
                      className="rounded border-slate-300 text-indigo-600" />
                    <span className="text-sm text-slate-700 flex-1">{m.market_name}</span>
                    <span className="text-xs text-slate-400">{formatMarketType(m.market_type)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {selectedMarkets.length === markets.length ? 'All establishments' : `${selectedMarkets.length} of ${markets.length} selected`}
              </p>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 text-xs text-indigo-700">
              The report will open in a new tab as a printable document with AI-powered trend analysis, price statistics, establishment comparisons, anomaly detection, and 7-day forecasts for each selected commodity.
            </div>
          </>}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
          <button onClick={generate} disabled={loading || !selectedCommodities.length}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            Open Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COMMODITY PRICE CHART ────────────────────────────────────────────────────
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const CP = { x: 68, y: 14, w: 592, h: 214, vW: 700, vH: 276 };

function CommodityPriceChart() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [days, setDays] = useState(30);
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [tip, setTip] = useState<{ x: number; y: number; idx: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    api.get('/api/price-monitoring/commodities?active=true')
      .then(r => {
        const comms: Commodity[] = r.data;
        setCommodities(comms);
        setSelected(comms.slice(0, 4).map(c => c.commodity_id));
      }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selected.length) { setRecords([]); return; }
    setChartLoading(true);
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    api.get(`/api/price-monitoring/records?date_from=${dateFrom}&limit=1000`)
      .then(r => setRecords((r.data as PriceRecord[]).filter(rec => selected.includes(rec.commodity_id))))
      .catch(console.error)
      .finally(() => setChartLoading(false));
  }, [selected, days]);

  const allDates = Array.from(new Set(records.map(r => (r.recorded_date as string).split('T')[0]))).sort();

  const series = selected.map((cid, idx) => {
    const comm = commodities.find(c => c.commodity_id === cid);
    const byDate: Record<string, number[]> = {};
    records.filter(r => r.commodity_id === cid).forEach(r => {
      const d = (r.recorded_date as string).split('T')[0];
      (byDate[d] = byDate[d] || []).push(Number(r.price));
    });
    const points = allDates.map(d => ({
      date: d,
      price: byDate[d] ? byDate[d].reduce((a, b) => a + b, 0) / byDate[d].length : null,
    }));
    return { cid, name: comm?.commodity_name ?? '', unit: comm?.unit ?? '', color: CHART_COLORS[idx % CHART_COLORS.length], points };
  });

  const allPrices = records.map(r => Number(r.price)).filter(p => !isNaN(p));
  const rawMin = allPrices.length ? Math.min(...allPrices) : 0;
  const rawMax = allPrices.length ? Math.max(...allPrices) : 100;
  const pad = (rawMax - rawMin) * 0.12 || 10;
  const minY = Math.max(0, rawMin - pad);
  const maxY = rawMax + pad;
  const yRange = maxY - minY || 1;
  const xS = (i: number) => CP.x + (i / Math.max(allDates.length - 1, 1)) * CP.w;
  const yS = (p: number) => CP.y + CP.h - ((p - minY) / yRange) * CP.h;
  const yTicks = Array.from({ length: 5 }, (_, i) => minY + (yRange / 4) * i);
  const xStep = Math.max(1, Math.ceil(allDates.length / 7));
  const showDots = allDates.length <= 40;

  const toggle = (cid: string) =>
    setSelected(prev => prev.includes(cid) ? prev.filter(id => id !== cid) : prev.length < 8 ? [...prev, cid] : prev);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-semibold text-slate-800">Commodity Price Trends</h3>
          <span className="text-xs text-slate-400">daily avg · all establishments</span>
        </div>
        <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                days === d ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'
              }`}>{d}d</button>
          ))}
        </div>
      </div>

      {/* Commodity selector */}
      <div className="px-5 py-2.5 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-2 items-center min-h-[44px]">
        <span className="text-xs font-medium text-slate-400 shrink-0">Select:</span>
        {commodities.length === 0 && (
          <span className="text-xs text-slate-400">No commodities yet — add them in the Commodities tab.</span>
        )}
        {commodities.map((c) => {
          const on = selected.includes(c.commodity_id);
          const ci = selected.indexOf(c.commodity_id);
          const color = CHART_COLORS[ci % CHART_COLORS.length];
          return (
            <button key={c.commodity_id} onClick={() => toggle(c.commodity_id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                on ? 'border-transparent text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
              style={on ? { backgroundColor: color } : {}}>
              <span className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: on ? 'rgba(255,255,255,0.7)' : '#cbd5e1' }} />
              {c.commodity_name}
            </button>
          );
        })}
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} className="text-xs text-slate-400 hover:text-red-500 ml-auto">Clear all</button>
        )}
      </div>

      {/* Chart */}
      <div className="px-5 py-4">
        {chartLoading && (
          <div className="flex items-center justify-center h-52">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!chartLoading && !selected.length && (
          <div className="flex items-center justify-center h-52 text-slate-400 text-sm">Select at least one commodity above to view the chart.</div>
        )}
        {!chartLoading && !!selected.length && !allDates.length && (
          <div className="flex items-center justify-center h-52 text-slate-400 text-sm">No price records in the last {days} days for the selected commodities.</div>
        )}
        {!chartLoading && allDates.length > 0 && (
          <div className="relative" onMouseLeave={() => setTip(null)}>
            <svg ref={svgRef} viewBox={`0 0 ${CP.vW} ${CP.vH}`} width="100%" className="overflow-visible"
              onMouseMove={(e) => {
                if (!svgRef.current) return;
                const rect = svgRef.current.getBoundingClientRect();
                const svgX = ((e.clientX - rect.left) / rect.width) * CP.vW;
                const idx = Math.round(((svgX - CP.x) / CP.w) * (allDates.length - 1));
                setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, idx: Math.max(0, Math.min(allDates.length - 1, idx)) });
              }}>
              {/* Horizontal grid + Y labels */}
              {yTicks.map((tick, i) => (
                <g key={i}>
                  <line x1={CP.x} y1={yS(tick)} x2={CP.x + CP.w} y2={yS(tick)} stroke="#f1f5f9" strokeWidth="1" />
                  <text x={CP.x - 5} y={yS(tick) + 4} textAnchor="end" fill="#94a3b8" fontSize="9.5">
                    ₱{tick >= 1000 ? (tick / 1000).toFixed(1) + 'k' : tick.toFixed(0)}
                  </text>
                </g>
              ))}
              {/* Axes */}
              <line x1={CP.x} y1={CP.y} x2={CP.x} y2={CP.y + CP.h} stroke="#e2e8f0" strokeWidth="1" />
              <line x1={CP.x} y1={CP.y + CP.h} x2={CP.x + CP.w} y2={CP.y + CP.h} stroke="#e2e8f0" strokeWidth="1" />
              {/* X labels */}
              {allDates.map((d, i) => {
                if (i % xStep !== 0 && i !== allDates.length - 1) return null;
                return (
                  <text key={i} x={xS(i)} y={CP.y + CP.h + 15} textAnchor="middle" fill="#94a3b8" fontSize="9">
                    {new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </text>
                );
              })}
              {/* Lines per commodity */}
              {series.map((s) => {
                let seg = ''; const parts: string[] = [];
                s.points.forEach((p, i) => {
                  if (p.price === null) { if (seg) { parts.push(seg); seg = ''; } return; }
                  const x = xS(i), y = yS(p.price);
                  seg += seg ? ` L ${x} ${y}` : `M ${x} ${y}`;
                });
                if (seg) parts.push(seg);
                return (
                  <g key={s.cid}>
                    <path d={parts.join(' ')} fill="none" stroke={s.color} strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                    {showDots && s.points.map((p, i) =>
                      p.price !== null
                        ? <circle key={i} cx={xS(i)} cy={yS(p.price!)} r="3.5" fill={s.color} stroke="white" strokeWidth="1.5" />
                        : null
                    )}
                  </g>
                );
              })}
              {/* Hover guide */}
              {tip && (
                <line x1={xS(tip.idx)} y1={CP.y} x2={xS(tip.idx)} y2={CP.y + CP.h}
                  stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
              )}
            </svg>
            {/* Tooltip */}
            {tip && allDates[tip.idx] && (
              <div className="absolute bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2.5 pointer-events-none z-20 text-xs min-w-[160px]"
                style={{ left: tip.x + 14, top: Math.max(4, tip.y - 20), transform: tip.x > 550 ? 'translateX(-115%)' : 'none' }}>
                <p className="font-semibold text-slate-600 pb-1.5 mb-1.5 border-b border-slate-100">
                  {new Date(allDates[tip.idx] + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                {series.map(s => {
                  const pt = s.points[tip.idx];
                  return pt?.price != null ? (
                    <div key={s.cid} className="flex items-center gap-1.5 py-0.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-slate-600 truncate max-w-[90px]">{s.name}</span>
                      <span className="font-semibold text-slate-800 ml-auto pl-2">{formatCurrency(pt.price)}/{s.unit}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {!!selected.length && allDates.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-4">
          {series.map(s => (
            <div key={s.cid} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="inline-block w-6 h-0.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="font-medium">{s.name}</span>
              <span className="text-slate-400">({s.unit})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [globalSummary, setGlobalSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/price-monitoring/overview'),
      api.get('/api/price-monitoring/analysis/summary/global?days=30'),
    ]).then(([ov, gs]) => {
      setData(ov.data);
      setGlobalSummary(gs.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Records', value: stats?.total_records ?? 0, color: 'blue', icon: '📋' },
          { label: 'Commodities', value: stats?.total_commodities ?? 0, color: 'green', icon: '🛒' },
          { label: 'Establishments', value: stats?.total_markets ?? 0, color: 'purple', icon: '🏪' },
          { label: 'Active Alerts', value: stats?.active_alerts ?? 0, color: 'amber', icon: '🔔' },
          { label: 'Triggered Today', value: stats?.triggered_today ?? 0, color: 'red', icon: '⚠️' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Commodity Price Chart */}
      <CommodityPriceChart />

      {/* Top Risers & Fallers */}
      {globalSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-red-500 text-lg">📈</span>
              <h3 className="font-semibold text-slate-800">Top Price Increases (30 days)</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {globalSummary.top_risers?.length === 0 && (
                <p className="px-5 py-4 text-slate-400 text-sm">No data available</p>
              )}
              {globalSummary.top_risers?.map((r: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.commodity_name}</p>
                    <p className="text-xs text-slate-400">{r.category_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(r.latest_price)}/{r.unit}</p>
                    <TrendBadge pct={r.change_pct} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-green-500 text-lg">📉</span>
              <h3 className="font-semibold text-slate-800">Top Price Decreases (30 days)</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {globalSummary.top_fallers?.length === 0 && (
                <p className="px-5 py-4 text-slate-400 text-sm">No data available</p>
              )}
              {globalSummary.top_fallers?.map((r: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.commodity_name}</p>
                    <p className="text-xs text-slate-400">{r.category_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(r.latest_price)}/{r.unit}</p>
                    <TrendBadge pct={r.change_pct} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Records */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Recent Price Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Commodity', 'Category', 'Establishment', 'Price', 'Date', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recent_records ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">No records yet</td></tr>
              )}
              {(data?.recent_records ?? []).map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.commodity_name} <span className="text-slate-400 font-normal">/{r.unit}</span></td>
                  <td className="px-4 py-3 text-slate-500">{r.category_name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.market_name}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(r.price)}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(r.recorded_date).toLocaleDateString('en-PH')}</td>
                  <td className="px-4 py-3">
                    {r.is_verified
                      ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Verified</span>
                      : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Pending</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── RECORDS TAB ──────────────────────────────────────────────────────────────
function RecordsTab({ isAdmin }: { isAdmin: boolean }) {
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterCommodity, setFilterCommodity] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [form, setForm] = useState({ commodity_id: '', market_id: '', price: '', recorded_date: new Date().toISOString().split('T')[0], notes: '', source: 'field_survey' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCommodity) params.append('commodity_id', filterCommodity);
      if (filterMarket) params.append('market_id', filterMarket);
      if (filterFrom) params.append('date_from', filterFrom);
      if (filterTo) params.append('date_to', filterTo);
      const [rr, cc, mm] = await Promise.all([
        api.get(`/api/price-monitoring/records?${params}&limit=200`),
        api.get('/api/price-monitoring/commodities?active=true'),
        api.get('/api/price-monitoring/markets'),
      ]);
      setRecords(rr.data);
      setCommodities(cc.data);
      setMarkets(mm.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filterCommodity, filterMarket, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.commodity_id || !form.market_id || !form.price || !form.recorded_date)
      return showAlert('Please fill in all required fields.', 'Validation Error');
    try {
      await api.post('/api/price-monitoring/records', form);
      setShowModal(false);
      setForm({ commodity_id: '', market_id: '', price: '', recorded_date: new Date().toISOString().split('T')[0], notes: '', source: 'field_survey' });
      load();
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to save record', 'Error');
    }
  };

  const verify = async (id: string) => {
    try {
      await api.put(`/api/price-monitoring/records/${id}/verify`);
      load();
    } catch (e) { console.error(e); }
  };

  const remove = (id: string) => {
    showConfirm('Delete this price record?', 'Confirm Delete', async () => {
      try { await api.delete(`/api/price-monitoring/records/${id}`); load(); }
      catch (e) { console.error(e); }
    }, undefined, { isDangerous: true, okText: 'Delete' });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          <select value={filterCommodity} onChange={e => setFilterCommodity(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">All Commodities</option>
            {commodities.map(c => <option key={c.commodity_id} value={c.commodity_id}>{c.commodity_name}</option>)}
          </select>
          <select value={filterMarket} onChange={e => setFilterMarket(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
            <option value="">All Establishments</option>
            {markets.map(m => <option key={m.market_id} value={m.market_id}>{m.market_name}</option>)}
          </select>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} placeholder="From" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} placeholder="To" className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Record
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Commodity', 'Establishment', 'Price', 'Date', 'Source', 'Recorded By', 'Status', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No price records found. Add your first record above.</td></tr>
                )}
                {records.map(r => (
                  <tr key={r.record_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.commodity_name}</p>
                      <p className="text-xs text-slate-400">{r.category_name} · per {r.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.market_name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(r.price)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(r.recorded_date).toLocaleDateString('en-PH')}</td>
                    <td className="px-4 py-3 text-slate-500 capitalize">{r.source?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-slate-500">{r.recorder_name || '—'}</td>
                    <td className="px-4 py-3">
                      {r.is_verified
                        ? <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">Verified</span>
                        : <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Pending</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isAdmin && !r.is_verified && (
                          <button onClick={() => verify(r.record_id)} className="text-xs text-green-600 hover:text-green-800 font-medium">Verify</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => remove(r.record_id)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Record Modal */}
      {showModal && (
        <Modal title="Add Price Record" onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <FormField label="Commodity *">
              <select value={form.commodity_id} onChange={e => setForm({ ...form, commodity_id: e.target.value })} className={inputClass}>
                <option value="">Select commodity...</option>
                {commodities.map(c => <option key={c.commodity_id} value={c.commodity_id}>{c.commodity_name} ({c.unit}) — {c.category_name}</option>)}
              </select>
            </FormField>
            <FormField label="Establishment *">
              <select value={form.market_id} onChange={e => setForm({ ...form, market_id: e.target.value })} className={inputClass}>
                <option value="">Select establishment...</option>
                {markets.filter(m => m.is_active).map(m => <option key={m.market_id} value={m.market_id}>{m.market_name}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Price (₱) *">
                <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" className={inputClass} />
              </FormField>
              <FormField label="Date *">
                <input type="date" value={form.recorded_date} onChange={e => setForm({ ...form, recorded_date: e.target.value })} className={inputClass} />
              </FormField>
            </div>
            <FormField label="Source">
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className={inputClass}>
                {SOURCE_TYPES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </FormField>
            <FormField label="Notes">
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Optional notes..." className={inputClass} />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save Record</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── COMMODITIES TAB ──────────────────────────────────────────────────────────
function CommoditiesTab({ isAdmin }: { isAdmin: boolean }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'list' | 'categories'>('list');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editItem, setEditItem] = useState<Commodity | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ category_id: '', commodity_name: '', unit: '', description: '', is_active: true });
  const [catForm, setCatForm] = useState({ category_name: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cc, cats] = await Promise.all([
        api.get('/api/price-monitoring/commodities'),
        api.get('/api/price-monitoring/categories'),
      ]);
      setCommodities(cc.data);
      setCategories(cats.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (c: Commodity) => {
    setEditItem(c);
    setForm({ category_id: c.category_id, commodity_name: c.commodity_name, unit: c.unit, description: c.description || '', is_active: c.is_active });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ category_id: '', commodity_name: '', unit: '', description: '', is_active: true });
    setShowModal(true);
  };

  const submit = async () => {
    if (!form.category_id || !form.commodity_name || !form.unit)
      return showAlert('Category, name, and unit are required.', 'Validation Error');
    try {
      if (editItem) await api.put(`/api/price-monitoring/commodities/${editItem.commodity_id}`, form);
      else await api.post('/api/price-monitoring/commodities', form);
      setShowModal(false);
      load();
    } catch (e: any) { showAlert(e.response?.data?.error || 'Failed to save', 'Error'); }
  };

  const remove = (id: string, name: string) => {
    showConfirm(`Delete "${name}"?`, 'Confirm Delete', async () => {
      try { await api.delete(`/api/price-monitoring/commodities/${id}`); load(); }
      catch (e: any) { showAlert(e.response?.data?.error || 'Failed to delete', 'Error'); }
    }, undefined, { isDangerous: true, okText: 'Delete' });
  };

  const submitCat = async () => {
    if (!catForm.category_name) return showAlert('Category name is required.', 'Validation Error');
    try {
      if (editCat) await api.put(`/api/price-monitoring/categories/${editCat.category_id}`, catForm);
      else await api.post('/api/price-monitoring/categories', catForm);
      setShowCatModal(false);
      load();
    } catch (e: any) { showAlert(e.response?.data?.error || 'Failed to save', 'Error'); }
  };

  const removeCat = (id: string, name: string) => {
    showConfirm(`Delete category "${name}" and all its commodities?`, 'Confirm Delete', async () => {
      try { await api.delete(`/api/price-monitoring/categories/${id}`); load(); }
      catch (e: any) { showAlert(e.response?.data?.error || 'Failed to delete', 'Error'); }
    }, undefined, { isDangerous: true, okText: 'Delete' });
  };

  const filtered = commodities.filter(c =>
    (!filterCat || c.category_id === filterCat) &&
    c.commodity_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        {(['list', 'categories'] as const).map(s => (
          <button key={s} onClick={() => setSubTab(s)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === s ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {s === 'list' ? 'Commodity List' : 'Categories'}
          </button>
        ))}
      </div>

      {subTab === 'list' && (
        <>
          <div className="flex flex-wrap gap-3 items-center">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search commodities..." className={`${inputClass} w-56`} />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={`${inputClass} w-48`}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
            {isAdmin && (
              <button onClick={openAdd} className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Commodity
              </button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? <LoadingSpinner /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>{['Name', 'Category', 'Unit', 'Latest Price', 'Last Updated', 'Status', ...(isAdmin ? ['Actions'] : [])].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No commodities found.</td></tr>}
                    {filtered.map(c => (
                      <tr key={c.commodity_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-800">{c.commodity_name}</td>
                        <td className="px-4 py-3 text-slate-500">{c.category_name}</td>
                        <td className="px-4 py-3 text-slate-500">{c.unit}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{c.latest_price != null ? formatCurrency(c.latest_price) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3 text-slate-500">{c.latest_date ? new Date(c.latest_date).toLocaleDateString('en-PH') : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(c)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                              <button onClick={() => remove(c.commodity_id, c.commodity_name)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {subTab === 'categories' && (
        <>
          {isAdmin && (
            <div className="flex justify-end">
              <button onClick={() => { setEditCat(null); setCatForm({ category_name: '', description: '' }); setShowCatModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add Category
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? <LoadingSpinner /> : categories.map(c => (
              <div key={c.category_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800">{c.category_name}</h3>
                    <p className="text-sm text-slate-400 mt-0.5">{c.description || 'No description'}</p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{c.commodity_count} items</span>
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                    <button onClick={() => { setEditCat(c); setCatForm({ category_name: c.category_name, description: c.description || '' }); setShowCatModal(true); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button onClick={() => removeCat(c.category_id, c.category_name)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Commodity Modal */}
      {showModal && (
        <Modal title={editItem ? 'Edit Commodity' : 'Add Commodity'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <FormField label="Category *">
              <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={inputClass}>
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>
            </FormField>
            <FormField label="Commodity Name *">
              <input value={form.commodity_name} onChange={e => setForm({ ...form, commodity_name: e.target.value })} className={inputClass} placeholder="e.g., Rice - Well Milled" />
            </FormField>
            <FormField label="Unit of Measure *">
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inputClass} placeholder="e.g., kg, liter, piece, dozen" />
            </FormField>
            <FormField label="Description">
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputClass} placeholder="Optional description..." />
            </FormField>
            <FormField label="Status">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <Modal title={editCat ? 'Edit Category' : 'Add Category'} onClose={() => setShowCatModal(false)}>
          <div className="space-y-4">
            <FormField label="Category Name *">
              <input value={catForm.category_name} onChange={e => setCatForm({ ...catForm, category_name: e.target.value })} className={inputClass} placeholder="e.g., Vegetables" />
            </FormField>
            <FormField label="Description">
              <textarea value={catForm.description} onChange={e => setCatForm({ ...catForm, description: e.target.value })} rows={2} className={inputClass} placeholder="Optional description..." />
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCatModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={submitCat} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ESTABLISHMENTS TAB ─────────────────────────────────────────────────────
function MarketsTab({ isAdmin }: { isAdmin: boolean }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Market | null>(null);
  const [form, setForm] = useState({ market_name: '', barangay: '', address: '', market_type: 'public_market', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/api/price-monitoring/markets');
      setMarkets(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (m: Market) => {
    setEditItem(m);
    setForm({ market_name: m.market_name, barangay: m.barangay || '', address: m.address || '', market_type: m.market_type, is_active: m.is_active });
    setShowModal(true);
  };

  const submit = async () => {
    if (!form.market_name) return showAlert('Establishment name is required.', 'Validation Error');
    try {
      if (editItem) await api.put(`/api/price-monitoring/markets/${editItem.market_id}`, form);
      else await api.post('/api/price-monitoring/markets', form);
      setShowModal(false);
      load();
    } catch (e: any) { showAlert(e.response?.data?.error || 'Failed to save', 'Error'); }
  };

  const remove = (id: string, name: string) => {
    showConfirm(`Delete establishment "${name}"?`, 'Confirm Delete', async () => {
      try { await api.delete(`/api/price-monitoring/markets/${id}`); load(); }
      catch (e: any) { showAlert(e.response?.data?.error || 'Failed to delete', 'Error'); }
    }, undefined, { isDangerous: true, okText: 'Delete' });
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button onClick={() => { setEditItem(null); setForm({ market_name: '', barangay: '', address: '', market_type: 'public_market', is_active: true }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Establishment
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <LoadingSpinner /> : markets.map(m => (
          <div key={m.market_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-slate-800">{m.market_name}</h3>
                {m.barangay && <p className="text-sm text-slate-400 mt-0.5">{m.barangay}</p>}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {m.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <span className="inline-block text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium mb-2">
              {formatMarketType(m.market_type)}
            </span>
            {m.address && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{m.address}</p>}
            {isAdmin && (
              <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(m)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                <button onClick={() => remove(m.market_id, m.market_name)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editItem ? 'Edit Establishment' : 'Add Establishment'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <FormField label="Establishment Name *">
              <input value={form.market_name} onChange={e => setForm({ ...form, market_name: e.target.value })} className={inputClass} placeholder="e.g., Dalaguete Public Market" />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Barangay">
                <input value={form.barangay} onChange={e => setForm({ ...form, barangay: e.target.value })} className={inputClass} placeholder="e.g., Poblacion" />
              </FormField>
              <FormField label="Establishment Type">
                <select value={form.market_type} onChange={e => setForm({ ...form, market_type: e.target.value })} className={inputClass}>
                  {MARKET_TYPES.map(t => <option key={t} value={t}>{formatMarketType(t)}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Address">
              <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className={inputClass} placeholder="Full address..." />
            </FormField>
            <FormField label="Status">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ALERTS TAB ───────────────────────────────────────────────────────────────
function AlertsTab({ isAdmin }: { isAdmin: boolean }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PriceAlert | null>(null);
  const [form, setForm] = useState({ alert_name: '', commodity_id: '', market_id: '', alert_type: 'above', threshold_value: '', is_active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [al, cc, mm] = await Promise.all([
        api.get('/api/price-monitoring/alerts'),
        api.get('/api/price-monitoring/commodities?active=true'),
        api.get('/api/price-monitoring/markets'),
      ]);
      setAlerts(al.data);
      setCommodities(cc.data);
      setMarkets(mm.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (a: PriceAlert) => {
    setEditItem(a);
    setForm({ alert_name: a.alert_name, commodity_id: a.commodity_id, market_id: a.market_id || '', alert_type: a.alert_type, threshold_value: String(a.threshold_value), is_active: a.is_active });
    setShowModal(true);
  };

  const submit = async () => {
    if (!form.alert_name || !form.commodity_id || !form.threshold_value)
      return showAlert('Alert name, commodity, and threshold are required.', 'Validation Error');
    try {
      if (editItem) await api.put(`/api/price-monitoring/alerts/${editItem.alert_id}`, { ...form, market_id: form.market_id || null });
      else await api.post('/api/price-monitoring/alerts', { ...form, market_id: form.market_id || null });
      setShowModal(false);
      load();
    } catch (e: any) { showAlert(e.response?.data?.error || 'Failed to save', 'Error'); }
  };

  const remove = (id: string, name: string) => {
    showConfirm(`Delete alert "${name}"?`, 'Confirm Delete', async () => {
      try { await api.delete(`/api/price-monitoring/alerts/${id}`); load(); }
      catch (e) { console.error(e); }
    }, undefined, { isDangerous: true, okText: 'Delete' });
  };

  const toggle = async (a: PriceAlert) => {
    try {
      await api.put(`/api/price-monitoring/alerts/${a.alert_id}`, { ...a, market_id: a.market_id || null, is_active: !a.is_active });
      load();
    } catch (e) { console.error(e); }
  };

  const alertTypeLabel = (t: string, v: number, unit: string) => {
    if (t === 'above') return `Price > ${formatCurrency(v)}/${unit}`;
    if (t === 'below') return `Price < ${formatCurrency(v)}/${unit}`;
    return `Change ≥ ${v}%`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Automatically flag price records that exceed configured thresholds.</p>
        {isAdmin && (
          <button onClick={() => { setEditItem(null); setForm({ alert_name: '', commodity_id: '', market_id: '', alert_type: 'above', threshold_value: '', is_active: true }); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            New Alert
          </button>
        )}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {alerts.length === 0 && (
            <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
              No alerts configured. {isAdmin ? 'Create one above.' : ''}
            </div>
          )}
          {alerts.map(a => (
            <div key={a.alert_id} className={`bg-white rounded-xl border shadow-sm p-5 transition-opacity ${a.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`h-2 w-2 rounded-full flex-shrink-0 ${a.is_active ? 'bg-green-400' : 'bg-slate-300'}`} />
                    <h3 className="font-semibold text-slate-800 truncate">{a.alert_name}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{a.commodity_name} / {a.unit}</p>
                  {a.market_name && <p className="text-xs text-slate-400">Establishment: {a.market_name}</p>}
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  a.alert_type === 'above' ? 'bg-red-100 text-red-700' :
                  a.alert_type === 'below' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {alertTypeLabel(a.alert_type, a.threshold_value, a.unit)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>🔔 Triggered {a.trigger_count} time{a.trigger_count !== 1 ? 's' : ''}</span>
                  {a.last_triggered_at && <span>Last: {new Date(a.last_triggered_at).toLocaleDateString('en-PH')}</span>}
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => toggle(a)} className={`text-xs font-medium ${a.is_active ? 'text-slate-500 hover:text-slate-700' : 'text-green-600 hover:text-green-800'}`}>
                      {a.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => openEdit(a)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    <button onClick={() => remove(a.alert_id, a.alert_name)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editItem ? 'Edit Alert' : 'Create Price Alert'} onClose={() => setShowModal(false)}>
          <div className="space-y-4">
            <FormField label="Alert Name *">
              <input value={form.alert_name} onChange={e => setForm({ ...form, alert_name: e.target.value })} className={inputClass} placeholder="e.g., Rice price spike alert" />
            </FormField>
            <FormField label="Commodity *">
              <select value={form.commodity_id} onChange={e => setForm({ ...form, commodity_id: e.target.value })} className={inputClass}>
                <option value="">Select commodity...</option>
                {commodities.map(c => <option key={c.commodity_id} value={c.commodity_id}>{c.commodity_name} ({c.unit}) — {c.category_name}</option>)}
              </select>
            </FormField>
            <FormField label="Establishment (optional — leave blank for all establishments)">
              <select value={form.market_id} onChange={e => setForm({ ...form, market_id: e.target.value })} className={inputClass}>
                <option value="">All Establishments</option>
                {markets.map(m => <option key={m.market_id} value={m.market_id}>{m.market_name}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Alert Type *">
                <select value={form.alert_type} onChange={e => setForm({ ...form, alert_type: e.target.value })} className={inputClass}>
                  {ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </FormField>
              <FormField label={`Threshold ${form.alert_type === 'change_pct' ? '(%)' : '(₱)'} *`}>
                <input type="number" step="0.01" min="0" value={form.threshold_value} onChange={e => setForm({ ...form, threshold_value: e.target.value })} className={inputClass} placeholder="0.00" />
              </FormField>
            </div>
            <FormField label="Status">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">Active</span>
              </label>
            </FormField>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button onClick={submit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save Alert</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── AI ANALYSIS TAB ──────────────────────────────────────────────────────────
function AnalysisTab() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [days, setDays] = useState('90');
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [subTab, setSubTab] = useState<'trend' | 'compare'>('trend');

  useEffect(() => {
    Promise.all([
      api.get('/api/price-monitoring/commodities?active=true'),
      api.get('/api/price-monitoring/markets'),
    ]).then(([c, m]) => { setCommodities(c.data); setMarkets(m.data); }).catch(console.error);
  }, []);

  const runAnalysis = async () => {
    if (!selectedCommodity) return showAlert('Please select a commodity.', 'Required');
    setLoading(true);
    setAnalysis(null);
    setComparison(null);
    try {
      const params = new URLSearchParams({ days });
      if (selectedMarket) params.append('market_id', selectedMarket);
      const r = await api.get(`/api/price-monitoring/analysis/${selectedCommodity}?${params}`);
      setAnalysis(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const runComparison = async () => {
    if (!selectedCommodity) return showAlert('Please select a commodity.', 'Required');
    setLoading(true);
    setComparison(null);
    try {
      const r = await api.get(`/api/price-monitoring/analysis/compare/markets?commodity_id=${selectedCommodity}&days=${days}`);
      setComparison(r.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const insightColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'positive': return 'bg-green-50 border-green-200 text-green-800';
      case 'alert': return 'bg-red-50 border-red-200 text-red-800';
      case 'forecast': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const insightIcon = (type: string) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'positive': return '✅';
      case 'alert': return '🚨';
      case 'forecast': return '🔮';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🤖</span>
          <h2 className="font-semibold text-slate-800">AI Price Analysis Engine</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Select a commodity to run AI-powered trend analysis, anomaly detection, and price forecasting.</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-slate-600 mb-1">Commodity *</label>
            <select value={selectedCommodity} onChange={e => setSelectedCommodity(e.target.value)} className={inputClass}>
              <option value="">Select commodity...</option>
              {commodities.map(c => <option key={c.commodity_id} value={c.commodity_id}>{c.commodity_name} ({c.unit}) — {c.category_name}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-slate-600 mb-1">Establishment (optional)</label>
            <select value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)} className={inputClass}>
              <option value="">All Establishments</option>
              {markets.map(m => <option key={m.market_id} value={m.market_id}>{m.market_name}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label className="block text-xs font-medium text-slate-600 mb-1">Period</label>
            <select value={days} onChange={e => setDays(e.target.value)} className={inputClass}>
              <option value="30">Last 30 days</option>
              <option value="60">Last 60 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last 1 year</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSubTab('trend'); runAnalysis(); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Analyze Trend
            </button>
            <button onClick={() => { setSubTab('compare'); runComparison(); }} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              Compare Establishments
            </button>
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner label="Running AI analysis..." />}

      {/* Trend Analysis Results */}
      {!loading && analysis && subTab === 'trend' && (
        <div className="space-y-5">
          {!analysis.has_data ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
              <p className="text-slate-400 text-lg">📭</p>
              <p className="text-slate-500 mt-2">{analysis.message}</p>
            </div>
          ) : (
            <>
              {/* AI Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysis.insights?.map((ins: any, i: number) => (
                  <div key={i} className={`rounded-xl border p-4 ${insightColor(ins.type)}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-xl flex-shrink-0">{insightIcon(ins.type)}</span>
                      <div>
                        <p className="font-semibold text-sm">{ins.title}</p>
                        <p className="text-sm mt-0.5 opacity-90">{ins.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Statistics */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-semibold text-slate-800 mb-4">Statistical Summary — {analysis.commodity?.commodity_name} ({analysis.period_days} days)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Average Price', value: formatCurrency(analysis.statistics?.mean) },
                    { label: 'Minimum', value: formatCurrency(analysis.statistics?.min) },
                    { label: 'Maximum', value: formatCurrency(analysis.statistics?.max) },
                    { label: 'Std Deviation', value: formatCurrency(analysis.statistics?.std) },
                    { label: 'Volatility', value: `${analysis.statistics?.volatility}%` },
                    { label: 'Trend Direction', value: analysis.statistics?.trend_direction?.toUpperCase() ?? '—' },
                    { label: 'Price Change', value: `${analysis.statistics?.trend_pct > 0 ? '+' : ''}${analysis.statistics?.trend_pct}%` },
                    { label: 'Data Points', value: analysis.record_count },
                  ].map(s => (
                    <div key={s.label} className="text-center p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className="font-bold text-slate-800">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price History Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Price History</h3>
                  <span className="text-xs text-slate-400">{analysis.record_count} records</span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>{['Date', 'Establishment', 'Price', 'MA(7)', 'MA(14)', 'Anomaly'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.price_history?.slice().reverse().map((r: any, i: number) => (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${r.is_anomaly ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{new Date(r.date).toLocaleDateString('en-PH')}</td>
                          <td className="px-4 py-2.5 text-slate-500">{r.market}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{formatCurrency(r.price)}</td>
                          <td className="px-4 py-2.5 text-slate-500">{formatCurrency(r.ma7)}</td>
                          <td className="px-4 py-2.5 text-slate-500">{formatCurrency(r.ma14)}</td>
                          <td className="px-4 py-2.5">
                            {r.is_anomaly && <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Anomaly</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Forecast */}
              {(analysis.forecast?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <h3 className="font-semibold text-slate-800 mb-4">🔮 7-Day Price Forecast</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {analysis.forecast?.map((f: any) => (
                      <div key={f.day} className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-500 mb-1">Day {f.day}</p>
                        <p className="font-bold text-blue-800 text-sm">{formatCurrency(f.forecasted_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Establishment Comparison Results */}
      {!loading && comparison && subTab === 'compare' && (
        <div className="space-y-5">
          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comparison.insights?.map((ins: any, i: number) => (
              <div key={i} className={`rounded-xl border p-4 ${insightColor(ins.type)}`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{insightIcon(ins.type)}</span>
                  <div>
                    <p className="font-semibold text-sm">{ins.title}</p>
                    <p className="text-sm mt-0.5 opacity-90">{ins.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Establishment Price Comparison — {comparison.commodity?.commodity_name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last {comparison.period_days} days · Sorted by average price</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>{['Establishment', 'Type', 'Avg Price', 'Min Price', 'Max Price', 'Records', 'Last Updated'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(comparison.market_comparison ?? []).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No establishment data for this period.</td></tr>
                  )}
                  {(comparison.market_comparison ?? []).map((m: any, i: number) => (
                    <tr key={m.market_id} className={`hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-green-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {i === 0 && <span className="text-xs font-medium text-green-700 bg-green-100 px-1.5 py-0.5 rounded">Best</span>}
                          <span className="font-medium text-slate-800">{m.market_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{formatMarketType(m.market_type)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{formatCurrency(m.avg_price)}</td>
                      <td className="px-4 py-3 text-green-700">{formatCurrency(m.min_price)}</td>
                      <td className="px-4 py-3 text-red-600">{formatCurrency(m.max_price)}</td>
                      <td className="px-4 py-3 text-slate-500">{m.record_count}</td>
                      <td className="px-4 py-3 text-slate-500">{m.last_recorded ? new Date(m.last_recorded).toLocaleDateString('en-PH') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const inputClass = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none';
