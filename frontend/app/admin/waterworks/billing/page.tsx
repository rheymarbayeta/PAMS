'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import waterworksService, { WaterBill, WaterSupply } from '@/services/waterworksService';
import { showAlert } from '@/utils/modal';
import { formatPeso } from '@/utils/formatters';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

export default function WaterworksBillingPage() {
  const now = new Date();
  const [bills, setBills] = useState<WaterBill[]>([]);
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    supply_id: '',
    billing_month: String(now.getMonth() + 1),
    billing_year: String(now.getFullYear()),
    status: '',
  });

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filters.supply_id) params.supply_id = filters.supply_id;
      if (filters.billing_month) params.billing_month = filters.billing_month;
      if (filters.billing_year) params.billing_year = filters.billing_year;
      if (filters.status) params.status = filters.status;
      const res = await waterworksService.getBills(params);
      setBills(res.data);
      setTotalPages(res.pagination.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    waterworksService.getSupplies({ limit: 100 }).then((r) => setSupplies(r.data));
  }, []);

  useEffect(() => {
    fetchBills();
  }, [filters, page]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await waterworksService.generateBills({
        billing_month: parseInt(filters.billing_month),
        billing_year: parseInt(filters.billing_year),
        supply_id: filters.supply_id || undefined,
      });
      showAlert(res.message || 'Bills generated', 'Success');
      fetchBills();
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to generate bills', 'Error');
    } finally {
      setGenerating(false);
    }
  };

  const openPrint = (accountId: string) => {
    const token = localStorage.getItem('token');
    window.open(
      `/waterworks-billing-statement.html?account_id=${accountId}&month=${filters.billing_month}&year=${filters.billing_year}&token=${token}`,
      '_blank'
    );
  };

  const openBulkPrint = () => {
    if (!bills.length) {
      showAlert('No bills to print for this period', 'Info');
      return;
    }
    const token = localStorage.getItem('token') || '';
    const params = new URLSearchParams({
      month: filters.billing_month,
      year: filters.billing_year,
      token,
      _v: String(Date.now()),
    });
    if (filters.supply_id) params.set('supply_id', filters.supply_id);
    if (filters.status) params.set('status', filters.status);
    window.open(`/waterworks-bulk-billing-statements.html?${params.toString()}`, '_blank');
  };

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Billing</h1>
              <p className="text-gray-600 text-sm">Generate and view water billing statements</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openBulkPrint}
                disabled={!bills.length}
                className="px-4 py-2 border border-blue-600 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
              >
                Print Bulk (2 / A4)
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate Bills for Period'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Water Supply</label>
              <select value={filters.supply_id} onChange={(e) => setFilters({ ...filters, supply_id: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
                <option value="">All supplies</option>
                {supplies.map((s) => <option key={s.supply_id} value={s.supply_id}>{s.supply_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Billing Month</label>
              <input type="number" min={1} max={12} value={filters.billing_month} onChange={(e) => setFilters({ ...filters, billing_month: e.target.value })} className="w-20 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Billing Year</label>
              <input type="number" value={filters.billing_year} onChange={(e) => setFilters({ ...filters, billing_year: e.target.value })} className="w-24 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 border rounded-lg text-sm">
                <option value="">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Account</th>
                    <th className="px-4 py-3 text-left">Supply</th>
                    <th className="px-4 py-3 text-left">Period Covered</th>
                    <th className="px-4 py-3 text-left">Collection Date</th>
                    <th className="px-4 py-3 text-right">Consumption</th>
                    <th className="px-4 py-3 text-right">Total Due</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bills.map((b) => (
                    <tr key={b.bill_id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/waterworks/accounts/${b.account_id}`} className="text-blue-600 hover:underline">{b.account_number}</Link>
                        <div className="text-xs text-gray-500">{b.consumer_name}</div>
                      </td>
                      <td className="px-4 py-3">{b.supply_name}</td>
                      <td className="px-4 py-3">
                        <div>{b.period_covered || `${b.billing_month}/${b.billing_year}`}</div>
                        <div className="text-xs text-gray-500">{b.billing_period_label || `${b.billing_month}/${b.billing_year}`}</div>
                      </td>
                      <td className="px-4 py-3">{b.collection_date_label || '—'}</td>
                      <td className="px-4 py-3 text-right">{b.consumption} m³</td>
                      <td className="px-4 py-3 text-right">{formatPeso(b.total_due)}</td>
                      <td className="px-4 py-3 text-right">{formatPeso(b.total_paid || 0)}</td>
                      <td className="px-4 py-3 text-center capitalize">{b.status}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openPrint(b.account_id)} className="text-blue-600 hover:underline">Print</button>
                      </td>
                    </tr>
                  ))}
                  {!bills.length && <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">No bills for this period</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && <div className="mt-4"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
