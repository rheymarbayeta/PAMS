'use client';

import { useState, useEffect } from 'react';
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

interface RRPayment {
  id: number;
  payment_type: 'rights' | 'rental';
  amount_paid: number;
  payment_date: string;
  or_number: string | null;
  lessee_name: string;
  property_name: string;
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
  rightsAndRentals: {
    totalContracts: number;
    activeContracts: number;
    expiredContracts: number;
    totalLessees: number;
    totalProperties: number;
    rightsCollected: number;
    rentalCollected: number;
    recentPayments: RRPayment[];
  };
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
  const [discoCurrentMonth, setDiscoCurrentMonth] = useState(new Date());
  const [discoSelectedDate, setDiscoSelectedDate] = useState<string | null>(null);
  const [discoPermittedDates, setDiscoPermittedDates] = useState<Map<string, any[]>>(new Map());
  const [discoDayApplications, setDiscoDayApplications] = useState<any[]>([]);

  const userRoles: string[] = user?.roles || (user?.role_name ? [user.role_name] : []);
  const isRRManager = userRoles.includes('Rights and Rentals Manager');
  const isTrafficOfficer = userRoles.includes('Traffic Officer');
  const isAssessor = userRoles.includes('Assessor');
  const isApprover = userRoles.includes('Approver');
  const isAppCreator = userRoles.includes('Application Creator');
  const isAdmin = userRoles.some(r => r === 'SuperAdmin' || r === 'Admin');

  // Show permit sections for admin-like roles and permit-related roles
  const showPermits = isAdmin || isAssessor || isApprover || isAppCreator;
  // Show citations for admin and traffic officer
  const showCitations = isAdmin || isTrafficOfficer;
  // Show R&R for admin and R&R manager
  const showRR = isAdmin || isRRManager;
  // Show cockfight calendar for admin and permit-related roles
  const showCockfightCalendar = isAdmin || isAssessor || isApprover || isAppCreator;

  useEffect(() => {
    if (showPermits) fetchPermitCategories();
  }, [showPermits]);

  useEffect(() => {
    fetchFullStats();
  }, [selectedCategory]);

  useEffect(() => {
    if (showCockfightCalendar) fetchCockfightPermittedDates();
  }, [showCockfightCalendar]);

  useEffect(() => {
    if (showCockfightCalendar) fetchDiscoPermittedDates();
  }, [showCockfightCalendar]);

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

  // Parses Disco "Date" param values into MM-DD-YYYY keys.
  // Handles: "May 2, 2026" / "April 30, 2026" and "4, 9, 13 May 2026" / "15, 16 May 2026"
  const parseDiscoDateParam = (dateStr: string): string[] => {
    const results: string[] = [];
    const str = dateStr.trim();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const startsWithMonth = monthNames.some(m => str.startsWith(m));
    if (startsWithMonth) {
      // Single date like "May 2, 2026"
      const d = new Date(str);
      if (!isNaN(d.getTime())) results.push(formatDateKey(d.getDate(), d.getMonth(), d.getFullYear()));
    } else {
      // Multiple days at start: "4, 9, 13 May 2026"
      const multiMatch = str.match(/^([\d,\s]+)\s+([A-Za-z]+)\s+(\d{4})$/);
      if (multiMatch) {
        const days = multiMatch[1].split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
        const month = monthNames.findIndex(m => m === multiMatch[2]);
        const year = parseInt(multiMatch[3]);
        if (month >= 0 && year) days.forEach(day => results.push(formatDateKey(day, month, year)));
      }
    }
    return results;
  };

  const fetchDiscoPermittedDates = async () => {
    try {
      const response = await api.get('/api/applications?limit=1000');
      const dateMap = new Map<string, any[]>();
      const discoApps = response.data.filter((app: any) =>
        app.attribute_name?.trim().toUpperCase() === 'DISCO' ||
        app.permit_type?.toLowerCase().includes('- disco')
      );
      for (const app of discoApps) {
        try {
          const detailResponse = await api.get(`/api/applications/${app.application_id}`);
          const dateParam = detailResponse.data.parameters?.find((p: any) => p.param_name === 'Date');
          if (dateParam?.param_value) {
            const keys = parseDiscoDateParam(dateParam.param_value);
            keys.forEach((key: string) => {
              if (!dateMap.has(key)) dateMap.set(key, []);
              dateMap.get(key)!.push(detailResponse.data);
            });
          }
        } catch { /* ignore detail errors */ }
      }
      setDiscoPermittedDates(dateMap);
    } catch (error) {
      console.error('Error fetching disco dates:', error);
    }
  };

  const fetchCockfightPermittedDates = async () => {
    try {
      const response = await api.get('/api/applications?limit=1000');
      const dateMap = new Map<string, any[]>();
      const cockfightApps = response.data.filter((app: any) =>
        app.attribute_name?.trim().toUpperCase() === 'SPECIAL COCKFIGHT' ||
        app.permit_type?.includes('Special Cockfight')
      );
      for (const app of cockfightApps) {
        try {
          const detailResponse = await api.get(`/api/applications/${app.application_id}`);
          const permittedDatesParam = detailResponse.data.parameters?.find((p: any) => p.param_name === 'permitted_dates');
          if (permittedDatesParam?.param_value) {
            try {
              const dates = JSON.parse(permittedDatesParam.param_value);
              dates.forEach((dateStr: string) => {
                if (!dateMap.has(dateStr)) dateMap.set(dateStr, []);
                dateMap.get(dateStr)!.push(detailResponse.data);
              });
            } catch (e) { /* ignore parse errors */ }
          }
        } catch { /* ignore detail errors */ }
      }
      setCockfightPermittedDates(dateMap);
    } catch (error) {
      console.error('Error fetching cockfight dates:', error);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

  const daysUntil = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const formatDateKey = (day: number, month: number, year: number) =>
    `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;

  const handlePrevMonth = () => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)); setSelectedDate(null); setDayApplications([]); };
  const handleNextMonth = () => { setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)); setSelectedDate(null); setDayApplications([]); };
  const handleDayClick = (day: number) => {
    const dateKey = formatDateKey(day, currentMonth.getMonth(), currentMonth.getFullYear());
    setSelectedDate(dateKey);
    setDayApplications(cockfightPermittedDates.get(dateKey) || []);
  };

  const handleDiscoPrevMonth = () => { setDiscoCurrentMonth(new Date(discoCurrentMonth.getFullYear(), discoCurrentMonth.getMonth() - 1)); setDiscoSelectedDate(null); setDiscoDayApplications([]); };
  const handleDiscoNextMonth = () => { setDiscoCurrentMonth(new Date(discoCurrentMonth.getFullYear(), discoCurrentMonth.getMonth() + 1)); setDiscoSelectedDate(null); setDiscoDayApplications([]); };
  const handleDiscoDayClick = (day: number) => {
    const dateKey = formatDateKey(day, discoCurrentMonth.getMonth(), discoCurrentMonth.getFullYear());
    setDiscoSelectedDate(dateKey);
    setDiscoDayApplications(discoPermittedDates.get(dateKey) || []);
  };

  if (loading || !data || authLoading) {
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
  let conicStops = '';
  let cumulative = 0;
  data.permits.byCategory.forEach((cat, i) => {
    const pct = (cat.count / totalByCategory) * 100;
    conicStops += `${donutColors[i % donutColors.length]} ${cumulative}% ${cumulative + pct}%,`;
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

  // Role label for header subtitle
  const roleLabel = isRRManager ? 'Rights & Rentals' : isTrafficOfficer ? 'Traffic Enforcement' : isAssessor ? 'Assessment' : isApprover ? 'Permit Approval' : isAppCreator ? 'Application Management' : 'System Overview';

  // ── Reusable section components ──

  const PermitApplicationsSection = ({ showCalendar = true }: { showCalendar?: boolean }) => (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Permit Applications</h2>
          <p className="text-xs text-slate-400">Permit status overview and recent activity</p>
        </div>
        {permitCategories.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => setSelectedCategory('')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === '' ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>All</button>
            {permitCategories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedCategory === cat ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{cat}</button>
            ))}
          </div>
        )}
      </div>

      {/* Permit Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {permitCards.map((card) => (
          <div key={card.label} onClick={() => { const p = new URLSearchParams(); if (card.filter) p.set('filter', card.filter); if (selectedCategory) p.set('permitCategory', selectedCategory); router.push(`/applications${p.toString() ? '?' + p.toString() : ''}`); }} className={`group bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md ${card.hoverBorder} transition-all active:scale-[0.98]`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg ${card.iconBg} flex items-center justify-center ${card.iconColor}`}>{card.icon}</div>
              <svg className={`h-4 w-4 ${card.arrowColor} opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Calendars + Donut */}
      {showCalendar && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Special Cockfight Permitted Dates</h3>
              <div className="flex items-center gap-2">
                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">{currentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</span>
                <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
              </div>
            </div>
            <div className="mb-4">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: getDaysInMonth(currentMonth) + getFirstDayOfMonth(currentMonth) }).map((_, index) => {
                  const day = index - getFirstDayOfMonth(currentMonth) + 1;
                  if (day < 1 || day > getDaysInMonth(currentMonth)) return <div key={`empty-${index}`} className="bg-slate-50 border border-slate-100 h-16 rounded-lg" />;
                  const dateKey = formatDateKey(day, currentMonth.getMonth(), currentMonth.getFullYear());
                  const hasApplications = cockfightPermittedDates.has(dateKey);
                  const count = cockfightPermittedDates.get(dateKey)?.length || 0;
                  const isSelected = selectedDate === dateKey;
                  return (
                    <div key={day} onClick={() => handleDayClick(day)} className={`border rounded-lg p-2 h-16 cursor-pointer transition-all flex flex-col justify-between ${hasApplications ? 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100' : 'border-slate-200 bg-white hover:bg-slate-50'} ${isSelected ? 'ring-2 ring-teal-500 ring-inset' : ''}`}>
                      <div className="text-sm font-semibold text-slate-700">{day}</div>
                      {hasApplications && <div className="text-xs font-medium text-emerald-600">{count} permitted</div>}
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedDate && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-semibold text-slate-700 mb-3">Applications for {new Date(selectedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
                {dayApplications.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {dayApplications.map((app) => {
                      const sbResolution = app.parameters?.find((p: any) => p.param_name === 'SB Resolution No.')?.param_value || 'N/A';
                      const addressParts = ['Sitio', 'Barangay', 'Municipality', 'Province'].map(k => app.parameters?.find((p: any) => p.param_name === k)?.param_value || '').filter(Boolean);
                      return (
                        <div key={app.application_id} onClick={() => router.push(`/applications/${app.application_id}`)} className="p-2.5 bg-slate-50 rounded border border-slate-200 hover:border-teal-300 hover:bg-teal-50 cursor-pointer transition-all text-xs space-y-1">
                          <p className="text-slate-700"><span className="font-medium">Permit No.:</span> <span className="font-semibold">{app.permit_number || 'Pending'}</span><span className="ml-4 font-medium">SB Resolution No.:</span> <span className="font-semibold">{sbResolution}</span></p>
                          <p className="text-slate-700"><span className="font-medium">Permitee:</span> <span className="font-semibold">{app.entity_name}</span><span className="ml-4 font-medium">Address:</span> <span className="font-semibold">{addressParts.join(', ') || 'N/A'}</span></p>
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
          {/* Donut Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Permits by Type</h3>
            {data.permits.byCategory.length > 0 ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-36 w-36">
                  <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(${conicStops})` }}></div>
                  <div className="absolute inset-[25%] rounded-full bg-white flex items-center justify-center"><span className="text-lg font-bold text-slate-700">{totalByCategory}</span></div>
                </div>
                <div className="w-full space-y-1.5">
                  {data.permits.byCategory.slice(0, 5).map((cat, i) => (
                    <div key={cat.category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2"><div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: donutColors[i % donutColors.length] }}></div><span className="text-slate-600 truncate max-w-[120px]">{cat.category}</span></div>
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

        {/* Disco Calendar */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-50 flex items-center justify-center"><svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg></div>
              <h3 className="text-sm font-semibold text-slate-700">Disco Permitted Dates</h3>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleDiscoPrevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">{discoCurrentMonth.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</span>
              <button onClick={handleDiscoNextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
          </div>
          <div className="mb-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: getDaysInMonth(discoCurrentMonth) + getFirstDayOfMonth(discoCurrentMonth) }).map((_, index) => {
                const day = index - getFirstDayOfMonth(discoCurrentMonth) + 1;
                if (day < 1 || day > getDaysInMonth(discoCurrentMonth)) return <div key={`empty-${index}`} className="bg-slate-50 border border-slate-100 h-16 rounded-lg" />;
                const dateKey = formatDateKey(day, discoCurrentMonth.getMonth(), discoCurrentMonth.getFullYear());
                const hasApplications = discoPermittedDates.has(dateKey);
                const count = discoPermittedDates.get(dateKey)?.length || 0;
                const isSelected = discoSelectedDate === dateKey;
                return (
                  <div key={day} onClick={() => handleDiscoDayClick(day)} className={`border rounded-lg p-2 h-16 cursor-pointer transition-all flex flex-col justify-between ${hasApplications ? 'border-purple-300 bg-purple-50 hover:bg-purple-100' : 'border-slate-200 bg-white hover:bg-slate-50'} ${isSelected ? 'ring-2 ring-purple-500 ring-inset' : ''}`}>
                    <div className="text-sm font-semibold text-slate-700">{day}</div>
                    {hasApplications && <div className="text-xs font-medium text-purple-600">{count} permitted</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {discoSelectedDate && (
            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-semibold text-slate-700 mb-3">Applications for {new Date(discoSelectedDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</h4>
              {discoDayApplications.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {discoDayApplications.map((app) => {
                    const dateParam = app.parameters?.find((p: any) => p.param_name === 'Date')?.param_value || 'N/A';
                    const location = app.parameters?.find((p: any) => p.param_name === 'Location')?.param_value || '';
                    const addressParts = ['Street/Sitio', 'Barangay', 'Municipality', 'Province'].map(k => app.parameters?.find((p: any) => p.param_name === k)?.param_value || '').filter(Boolean);
                    const displayAddress = location || addressParts.join(', ') || 'N/A';
                    return (
                      <div key={app.application_id} onClick={() => router.push(`/applications/${app.application_id}`)} className="p-2.5 bg-slate-50 rounded border border-slate-200 hover:border-purple-300 hover:bg-purple-50 cursor-pointer transition-all text-xs space-y-1">
                        <p className="text-slate-700"><span className="font-medium">Permit No.:</span> <span className="font-semibold">{app.permit_number || 'Pending'}</span><span className="ml-4 font-medium">Date:</span> <span className="font-semibold">{dateParam}</span></p>
                        <p className="text-slate-700"><span className="font-medium">Permitee:</span> <span className="font-semibold">{app.entity_name}</span><span className="ml-4 font-medium">Address:</span> <span className="font-semibold">{displayAddress}</span></p>
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
        </>
      )}

      {/* Recent Applications + Expiring Permits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                    <div className="min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{app.application_number || `#${app.application_id}`}</p><p className="text-xs text-slate-500 truncate">{app.entity_name} · {app.permit_type_name}</p></div>
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
                      <div className="min-w-0"><p className="text-sm font-medium text-slate-800 truncate">{p.application_number || `#${p.application_id}`}</p><p className="text-xs text-slate-500 truncate">{p.entity_name} · {p.permit_type_name}</p></div>
                      <div className="flex-shrink-0 ml-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${days <= 7 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{days <= 0 ? 'Expired' : `${days}d left`}</span>
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
    </div>
  );

  const CitationsSection = () => (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
          <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Citations</h2>
          <p className="text-xs text-slate-400">Traffic violations and fine collections</p>
        </div>
      </div>

      {/* Citation stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <div><p className="text-2xl font-bold text-slate-800">{data.citations.total}</p><p className="text-xs text-slate-500">Total Citations</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
            <div><p className="text-2xl font-bold text-slate-800">{data.citations.paid}</p><p className="text-xs text-slate-500">Citations Paid</p></div>
          </div>
          <div className="mt-3"><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.citations.total > 0 ? (data.citations.paid / data.citations.total) * 100 : 0}%` }}></div></div></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center"><svg className="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <div><p className="text-2xl font-bold text-slate-800">{formatCurrency(data.citations.collectedFines)}</p><p className="text-xs text-slate-500">Fines Collected</p></div>
          </div>
          <p className="text-xs text-slate-400 mt-2">of {formatCurrency(data.citations.totalFines)} total</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center"><svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <div><p className="text-2xl font-bold text-slate-800">{data.citations.pending}</p><p className="text-xs text-slate-500">Pending Payment</p></div>
          </div>
        </div>
      </div>

      {/* Recent Citations table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Recent Citations</h3>
          <Link href="/citations" className="text-xs font-medium text-teal-600 hover:text-teal-700">View all</Link>
        </div>
        {data.recentCitations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-2.5 font-medium">Ticket #</th><th className="text-left px-5 py-2.5 font-medium">Driver</th><th className="text-left px-5 py-2.5 font-medium hidden sm:table-cell">Plate</th><th className="text-right px-5 py-2.5 font-medium">Fine</th><th className="text-center px-5 py-2.5 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-50">
                {data.recentCitations.map((c) => (
                  <tr key={c.citation_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-slate-800">{c.ticket_number}</td>
                    <td className="px-5 py-2.5 text-slate-600 truncate max-w-[150px]">{c.driver_name}</td>
                    <td className="px-5 py-2.5 text-slate-600 hidden sm:table-cell">{c.plate_number}</td>
                    <td className="px-5 py-2.5 text-right text-slate-700">{formatCurrency(c.fine_amount)}</td>
                    <td className="px-5 py-2.5 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.payment_status}</span></td>
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
  );

  const RightsAndRentalsSection = ({ compact = false }: { compact?: boolean }) => (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
          <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-800">Rights &amp; Rentals</h2>
          <p className="text-xs text-slate-400">Lease contracts, lessees, properties and collections</p>
        </div>
        <Link href="/admin/rights-and-rentals" className="ml-auto text-xs font-medium text-orange-600 hover:text-orange-700">View module</Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: 'Lessees', value: data.rightsAndRentals.totalLessees, href: '/admin/rights-and-rentals', bg: 'bg-violet-50', color: 'text-violet-600', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { label: 'Properties', value: data.rightsAndRentals.totalProperties, href: '/admin/rights-and-rentals/properties', bg: 'bg-sky-50', color: 'text-sky-600', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
          { label: 'Active Contracts', value: data.rightsAndRentals.activeContracts, href: '/admin/rights-and-rentals/lease-contracts', bg: 'bg-emerald-50', color: 'text-emerald-600', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
          { label: 'Total Contracts', value: data.rightsAndRentals.totalContracts, href: '/admin/rights-and-rentals/lease-contracts', bg: 'bg-slate-100', color: 'text-slate-600', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
          { label: 'Expired Contracts', value: data.rightsAndRentals.expiredContracts, href: '/admin/rights-and-rentals/lease-contracts', bg: 'bg-red-50', color: 'text-red-500', icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-orange-300 transition-all active:scale-[0.98]">
            <div className="flex items-center justify-between mb-3">
              <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center ${card.color}`}>{card.icon}</div>
              <svg className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Collections + Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Collections Breakdown</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-sky-50 flex items-center justify-center"><svg className="h-4 w-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><span className="text-sm text-slate-600">Rights Payments</span></div>
                <span className="text-sm font-semibold text-slate-800">{formatCurrency(data.rightsAndRentals.rightsCollected)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center"><svg className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg></div><span className="text-sm text-slate-600">Rental Payments</span></div>
                <span className="text-sm font-semibold text-slate-800">{formatCurrency(data.rightsAndRentals.rentalCollected)}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center"><svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div><span className="text-sm font-medium text-slate-700">Total Collected</span></div>
                <span className="text-sm font-bold text-emerald-600">{formatCurrency(data.rightsAndRentals.rightsCollected + data.rightsAndRentals.rentalCollected)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Recent Payments</h3>
            <Link href="/admin/rights-and-rentals/lease-contracts" className="text-xs font-medium text-orange-600 hover:text-orange-700">View contracts</Link>
          </div>
          {data.rightsAndRentals.recentPayments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {data.rightsAndRentals.recentPayments.map((payment, idx) => (
                <div key={idx} className="px-5 py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{payment.lessee_name}</p>
                    <p className="text-xs text-slate-500 truncate">{payment.property_name} · OR# {payment.or_number || 'N/A'}</p>
                  </div>
                  <div className="flex flex-col items-end ml-4 flex-shrink-0">
                    <span className="text-sm font-semibold text-slate-800">{formatCurrency(payment.amount_paid)}</span>
                    <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${payment.payment_type === 'rights' ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'}`}>{payment.payment_type}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No payments recorded yet</div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto space-y-10">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
              <p className="text-sm text-slate-500">{roleLabel} — {user?.full_name || user?.username}</p>
            </div>
          </div>

          {/* ── RIGHTS & RENTALS MANAGER ── */}
          {isRRManager && !isAdmin && <RightsAndRentalsSection />}

          {/* ── TRAFFIC OFFICER ── */}
          {isTrafficOfficer && !isAdmin && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <div><p className="text-2xl font-bold text-slate-800">{data.citations.total}</p><p className="text-xs text-slate-500">Total Citations</p></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>
                    <div><p className="text-2xl font-bold text-slate-800">{data.citations.paid}</p><p className="text-xs text-slate-500">Citations Paid</p></div>
                  </div>
                  <div className="mt-3"><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.citations.total > 0 ? (data.citations.paid / data.citations.total) * 100 : 0}%` }}></div></div></div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-sky-50 flex items-center justify-center"><svg className="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <div><p className="text-2xl font-bold text-slate-800">{formatCurrency(data.citations.collectedFines)}</p><p className="text-xs text-slate-500">Fines Collected</p></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">of {formatCurrency(data.citations.totalFines)} total</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">Recent Citations</h3>
                  <Link href="/citations" className="text-xs font-medium text-teal-600 hover:text-teal-700">View all</Link>
                </div>
                {data.recentCitations.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="text-xs text-slate-500 border-b border-slate-100"><th className="text-left px-5 py-2.5 font-medium">Ticket #</th><th className="text-left px-5 py-2.5 font-medium">Driver</th><th className="text-left px-5 py-2.5 font-medium hidden sm:table-cell">Plate</th><th className="text-right px-5 py-2.5 font-medium">Fine</th><th className="text-center px-5 py-2.5 font-medium">Status</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">
                        {data.recentCitations.map((c) => (
                          <tr key={c.citation_id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2.5 font-medium text-slate-800">{c.ticket_number}</td>
                            <td className="px-5 py-2.5 text-slate-600 truncate max-w-[150px]">{c.driver_name}</td>
                            <td className="px-5 py-2.5 text-slate-600 hidden sm:table-cell">{c.plate_number}</td>
                            <td className="px-5 py-2.5 text-right text-slate-700">{formatCurrency(c.fine_amount)}</td>
                            <td className="px-5 py-2.5 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.payment_status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center text-sm text-slate-400">No recent citations</div>
                )}
              </div>
            </>
          )}


          {/* ── PERMIT ROLES (Assessor, Approver, App Creator) ── */}
          {showPermits && !isAdmin && <PermitApplicationsSection showCalendar={true} />}

          {/* ── ADMIN / SUPERADMIN: grouped sections ── */}
          {isAdmin && (
            <>
              <PermitApplicationsSection showCalendar={true} />
              <div className="border-t border-slate-200" />
              <CitationsSection />
              <div className="border-t border-slate-200" />
              <RightsAndRentalsSection />
            </>
          )}

        </div>
      </Layout>
    </ProtectedRoute>
  );
}
