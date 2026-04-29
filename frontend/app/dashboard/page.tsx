'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface MonthlyTrend {
  month: string;
  month_label: string;
  count: number;
}

interface CategoryCount {
  category: string;
  count: number;
}

interface RecentApplication {
  application_id: number;
  application_number: string;
  status: string;
  created_at: string;
  entity_name: string;
  permit_type_name: string;
}

interface RecentCitation {
  citation_id: number;
  ticket_number: string;
  driver_name: string;
  plate_number: string;
  fine_amount: number;
  payment_status: string;
  violation_date: string;
}

interface ExpiringPermit {
  application_id: number;
  application_number: string;
  validity_date: string;
  entity_name: string;
  permit_type_name: string;
}

interface FullStats {
  permits: {
    pending: number;
    pendingApproval: number;
    approved: number;
    issued: number;
    released: number;
    total: number;
    byCategory: CategoryCount[];
    monthlyTrend: MonthlyTrend[];
  };
  citations: {
    total: number;
    paid: number;
    pending: number;
    totalFines: number;
    collectedFines: number;
  };
  entities: number;
  recentApplications: RecentApplication[];
  recentCitations: RecentCitation[];
  expiringPermits: ExpiringPermit[];
}

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700',
  'Pending Approval': 'bg-orange-100 text-orange-700',
  Approved: 'bg-teal-100 text-teal-700',
  Paid: 'bg-emerald-100 text-emerald-700',
  Issued: 'bg-sky-100 text-sky-700',
  Released: 'bg-emerald-100 text-emerald-700',
  Denied: 'bg-red-100 text-red-700',
};

const donutColors = ['#0d9488', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<FullStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [permitCategories, setPermitCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [cockfightPermittedDates, setCockfightPermittedDates] = useState<Map<string, any[]>>(new Map());
  const [dayApplications, setDayApplications] = useState<any[]>([]);

  // Synchronously redirect Rights and Rentals Manager before component renders
  useLayoutEffect(() => {
    if (!authLoading && user?.roles?.includes('Rights and Rentals Manager')) {
      router.replace('/admin/rights-and-rentals');
    }
  }, [authLoading, user?.roles, router]);

  useEffect(() => {
    fetchPermitCategories();
  }, []);

  useEffect(() => {
    fetchFullStats();
  }, [selectedCategory]);

  useEffect(() => {
    fetchCockfightPermittedDates();
  }, []);

  const fetchPermitCategories = async () => {
    try {
      const response = await api.get('/api/dashboard/permit-categories');
      setPermitCategories(response.data);
    } catch (error) {
      console.error('Error fetching permit categories:', error);
    }
  };

  const fetchFullStats = async () => {
    try {
      setLoading(true);
      const params = selectedCategory ? `?permitCategory=${encodeURIComponent(selectedCategory)}` : '';
      const response = await api.get(`/api/dashboard/full-stats${params}`);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCockfightPermittedDates = async () => {
    try {
      // First, fetch all applications
      const response = await api.get('/api/applications?limit=1000');
      console.log('All applications response:', response.data);
      
      const dateMap = new Map<string, any[]>();
      
      // Filter for Special Cockfight applications
      const cockfightApps = response.data.filter((app: any) => {
        const isCockfight = app.attribute_name?.trim().toUpperCase() === 'SPECIAL COCKFIGHT' ||
                           app.permit_type?.includes('Special Cockfight');
        console.log('Checking app:', app.application_id, 'attribute:', app.attribute_name, 'permit_type:', app.permit_type, 'is cockfight:', isCockfight);
        return isCockfight;
      });
      
      console.log('Found cockfight applications:', cockfightApps.length, cockfightApps);
      
      // For each cockfight app, fetch detailed data including parameters
      for (const app of cockfightApps) {
        try {
          const detailResponse = await api.get(`/api/applications/${app.application_id}`);
          console.log('Detail response for app', app.application_id, ':', detailResponse.data);
          
          const permittedDatesParam = detailResponse.data.parameters?.find((p: any) => p.param_name === 'permitted_dates');
          console.log('Permitted dates param for app', app.application_id, ':', permittedDatesParam);
          
          if (permittedDatesParam && permittedDatesParam.param_value) {
            try {
              const dates = JSON.parse(permittedDatesParam.param_value);
              console.log('Parsed dates:', dates);
              
              dates.forEach((dateStr: string) => {
                if (!dateMap.has(dateStr)) {
                  dateMap.set(dateStr, []);
                }
                dateMap.get(dateStr)!.push(detailResponse.data);
              });
            } catch (e) {
              console.error('Error parsing permitted_dates:', e);
            }
          }
        } catch (detailError) {
          console.error('Error fetching detail for app', app.application_id, ':', detailError);
        }
      }
      
      console.log('Final dateMap:', Array.from(dateMap.entries()));
      setCockfightPermittedDates(dateMap);
    } catch (error) {
      console.error('Error fetching cockflight dates:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (day: number, month: number, year: number) => {
    return `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
    setDayApplications([]);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
    setDayApplications([]);
  };

  const handleDayClick = (day: number) => {
    const dateKey = formatDateKey(day, currentMonth.getMonth(), currentMonth.getFullYear());
    setSelectedDate(dateKey);
    setDayApplications(cockfightPermittedDates.get(dateKey) || []);
  };

  if (loading || !data) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-slate-100"></div>
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-teal-600 border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-4 text-slate-600 font-medium">Loading dashboard...</p>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const totalByCategory = data.permits.byCategory.reduce((s, c) => s + c.count, 0) || 1;

  // Build conic gradient for donut chart
  let conicStops = '';
  let cumulative = 0;
  data.permits.byCategory.forEach((cat, i) => {
    const pct = (cat.count / totalByCategory) * 100;
    const color = donutColors[i % donutColors.length];
    conicStops += `${color} ${cumulative}% ${cumulative + pct}%,`;
    cumulative += pct;
  });
  conicStops = conicStops.slice(0, -1) || '#e2e8f0 0% 100%';

  const permitCards = [
    { label: 'Pending', value: data.permits.pending, filter: 'Pending', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', hoverBorder: 'hover:border-amber-300', arrowColor: 'text-amber-400', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'For Approval', value: data.permits.pendingApproval, filter: 'Pending Approval', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', hoverBorder: 'hover:border-orange-300', arrowColor: 'text-orange-400', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { label: 'Approved', value: data.permits.approved, filter: 'Approved', iconBg: 'bg-teal-50', iconColor: 'text-teal-600', hoverBorder: 'hover:border-teal-300', arrowColor: 'text-teal-400', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { label: 'Issued', value: data.permits.issued, filter: 'Issued', iconBg: 'bg-sky-50', iconColor: 'text-sky-600', hoverBorder: 'hover:border-sky-300', arrowColor: 'text-sky-400', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { label: 'Released', value: data.permits.released, filter: 'Released', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', hoverBorder: 'hover:border-emerald-300', arrowColor: 'text-emerald-400', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> },
    { label: 'Total', value: data.permits.total, filter: '', iconBg: 'bg-slate-100', iconColor: 'text-slate-600', hoverBorder: 'hover:border-slate-400', arrowColor: 'text-slate-400', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
  ];

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-sm text-slate-500">Overview of permits, citations, and activity</p>
            </div>
            {/* Permit Category Filter */}
            {permitCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedCategory === '' ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >All Permits</button>
                {permitCategories.map((cat) => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === cat ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >{cat}</button>
                ))}
              </div>
            )}
          </div>

          {/* Permit Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            {permitCards.map((card) => (
              <div
                key={card.label}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (card.filter) params.set('filter', card.filter);
                  if (selectedCategory) params.set('permitCategory', selectedCategory);
                  router.push(`/applications${params.toString() ? '?' + params.toString() : ''}`);
                }}
                className={`group bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md ${card.hoverBorder} transition-all active:scale-[0.98]`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>
                    {card.icon}
                  </div>
                  <svg className={`h-4 w-4 ${card.arrowColor} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Interactive Calendar - Special Cockfight Permitted Dates */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">Special Cockfight Permitted Dates</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
                    {currentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="mb-4">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: getDaysInMonth(currentMonth) + getFirstDayOfMonth(currentMonth) }).map(
                    (_, index) => {
                      const day = index - getFirstDayOfMonth(currentMonth) + 1;
                      if (day < 1 || day > getDaysInMonth(currentMonth)) {
                        return (
                          <div key={`empty-${index}`} className="bg-slate-50 border border-slate-100 h-16 rounded-lg" />
                        );
                      }

                      const dateKey = formatDateKey(day, currentMonth.getMonth(), currentMonth.getFullYear());
                      const hasApplications = cockfightPermittedDates.has(dateKey);
                      const count = cockfightPermittedDates.get(dateKey)?.length || 0;
                      const isSelected = selectedDate === dateKey;

                      return (
                        <div
                          key={day}
                          onClick={() => handleDayClick(day)}
                          className={`border rounded-lg p-2 h-16 cursor-pointer transition-all flex flex-col justify-between ${
                            hasApplications
                              ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          } ${isSelected ? 'ring-2 ring-teal-500 ring-inset' : ''}`}
                        >
                          <div className="text-sm font-semibold text-slate-700">{day}</div>
                          {hasApplications && (
                            <div className="text-xs font-medium text-emerald-600">{count} permitted</div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Selected day applications */}
              {selectedDate && (
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-semibold text-slate-700 mb-3">
                    Applications for {new Date(selectedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </h4>
                  {dayApplications.length > 0 ? (
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {dayApplications.map((app) => {
                        const sbResolution = app.parameters?.find((p: any) => p.param_name === 'SB Resolution No.')?.param_value || 'N/A';
                        
                        // Construct address from parameters
                        const sitio = app.parameters?.find((p: any) => p.param_name === 'Sitio')?.param_value || '';
                        const barangay = app.parameters?.find((p: any) => p.param_name === 'Barangay')?.param_value || '';
                        const municipality = app.parameters?.find((p: any) => p.param_name === 'Municipality')?.param_value || '';
                        const province = app.parameters?.find((p: any) => p.param_name === 'Province')?.param_value || '';
                        
                        const addressParts = [sitio, barangay, municipality, province].filter(part => part);
                        const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
                        
                        return (
                          <div
                            key={app.application_id}
                            onClick={() => router.push(`/applications/${app.application_id}`)}
                            className="p-2.5 bg-slate-50 rounded border border-slate-200 hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-all text-xs space-y-1"
                          >
                            <p className="text-slate-700">
                              <span className="font-medium">Permit No.:</span><span className="font-semibold">{app.permit_number || 'Pending'}</span>
                              <span className="ml-4 font-medium">SB Resolution No.:</span><span className="font-semibold">{sbResolution}</span>
                            </p>
                            <p className="text-slate-700">
                              <span className="font-medium">Permitee:</span><span className="font-semibold">{app.entity_name}</span>
                              <span className="ml-4 font-medium">Address:</span><span className="font-semibold">{fullAddress}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No applications for this date</p>
                  )}
                </div>
              )}
            </div>

            {/* Donut Chart - Permit by Category */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Permits by Type</h3>
              {data.permits.byCategory.length > 0 ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-36 w-36">
                    <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${conicStops})` }}></div>
                    <div className="absolute inset-[25%] rounded-full bg-white flex items-center justify-center">
                      <span className="text-lg font-bold text-slate-700">{totalByCategory}</span>
                    </div>
                  </div>
                  <div className="w-full space-y-1.5">
                    {data.permits.byCategory.slice(0, 5).map((cat, i) => (
                      <div key={cat.category} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: donutColors[i % donutColors.length] }}></div>
                          <span className="text-slate-600 truncate max-w-[120px]">{cat.category}</span>
                        </div>
                        <span className="font-medium text-slate-700">{cat.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">No permit data</div>
              )}
            </div>
          </div>

          {/* Citations + Entities Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{data.citations.total}</p>
                  <p className="text-xs text-slate-500">Total Citations</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{data.citations.paid}</p>
                  <p className="text-xs text-slate-500">Citations Paid</p>
                </div>
              </div>
              <div className="mt-1">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.citations.total > 0 ? (data.citations.paid / data.citations.total) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{formatCurrency(data.citations.collectedFines)}</p>
                  <p className="text-xs text-slate-500">Fines Collected</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">of {formatCurrency(data.citations.totalFines)} total</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-800">{data.entities}</p>
                  <p className="text-xs text-slate-500">Registered Entities</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Recent Applications */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Recent Applications</h3>
                <Link href="/applications" className="text-xs font-medium text-teal-600 hover:text-teal-700">View all</Link>
              </div>
              {data.recentApplications.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.recentApplications.map((app) => (
                    <div key={app.application_id} className="px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push(`/applications/${app.application_id}`)}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{app.application_number || `#${app.application_id}`}</p>
                          <p className="text-xs text-slate-500 truncate">{app.entity_name} &middot; {app.permit_type_name}</p>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0 ml-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[app.status] || 'bg-slate-100 text-slate-600'}`}>{app.status}</span>
                          <span className="text-xs text-slate-400 mt-1">{formatDate(app.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No recent applications</div>
              )}
            </div>

            {/* Expiring Permits */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Expiring Permits (30 days)</h3>
                <span className="text-xs font-medium text-amber-600">{data.expiringPermits.length} upcoming</span>
              </div>
              {data.expiringPermits.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {data.expiringPermits.map((p) => {
                    const days = daysUntil(p.validity_date);
                    return (
                      <div key={p.application_id} className="px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => router.push(`/applications/${p.application_id}`)}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{p.application_number || `#${p.application_id}`}</p>
                            <p className="text-xs text-slate-500 truncate">{p.entity_name} &middot; {p.permit_type_name}</p>
                          </div>
                          <div className="flex-shrink-0 ml-3 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                              {days <= 0 ? 'Expired' : `${days}d left`}
                            </span>
                            <p className="text-xs text-slate-400 mt-1">{formatDate(p.validity_date)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-5 py-8 text-center text-sm text-slate-400">No expiring permits</div>
              )}
            </div>
          </div>

          {/* Recent Citations */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Recent Citations</h3>
              <Link href="/citations" className="text-xs font-medium text-teal-600 hover:text-teal-700">View all</Link>
            </div>
            {data.recentCitations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 border-b border-slate-100">
                      <th className="text-left px-5 py-2.5 font-medium">Ticket #</th>
                      <th className="text-left px-5 py-2.5 font-medium">Driver</th>
                      <th className="text-left px-5 py-2.5 font-medium hidden sm:table-cell">Plate</th>
                      <th className="text-right px-5 py-2.5 font-medium">Fine</th>
                      <th className="text-center px-5 py-2.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.recentCitations.map((c) => (
                      <tr key={c.citation_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-2.5 font-medium text-slate-800">{c.ticket_number}</td>
                        <td className="px-5 py-2.5 text-slate-600 truncate max-w-[150px]">{c.driver_name}</td>
                        <td className="px-5 py-2.5 text-slate-600 hidden sm:table-cell">{c.plate_number}</td>
                        <td className="px-5 py-2.5 text-right text-slate-700">{formatCurrency(c.fine_amount)}</td>
                        <td className="px-5 py-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.payment_status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-sm text-slate-400">No recent citations</div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

