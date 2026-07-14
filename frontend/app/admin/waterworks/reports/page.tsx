'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import waterworksService, { WaterSupply } from '@/services/waterworksService';
import { formatPeso } from '@/utils/formatters';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

export default function WaterworksReportsPage() {
  const now = new Date();
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    billing_month: String(now.getMonth() + 1),
    billing_year: String(now.getFullYear()),
    supply_id: '',
  });

  const loadReport = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (filters.billing_month) params.billing_month = filters.billing_month;
      if (filters.billing_year) params.billing_year = filters.billing_year;
      if (filters.supply_id) params.supply_id = filters.supply_id;
      const data = await waterworksService.getCollectionSummary(params);
      setReport(data);
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
    loadReport();
  }, [filters]);

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Reports</h1>
          <p className="text-gray-600 text-sm mb-6">Collection summary by water supply</p>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-blue-900 text-sm">Cost Recovery / Rate Computation</p>
              <p className="text-xs text-blue-800/80 mt-0.5">
                Enter demand and expenses, then print the Rempark-style rate worksheet.
              </p>
            </div>
            <Link
              href="/admin/waterworks/rate-computation"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium"
            >
              Open Rate Computation
            </Link>
          </div>

          <div className="flex flex-wrap gap-3 mb-6">
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
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="bg-white rounded-xl border overflow-hidden mb-8">
                <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Collection by Supply</h2>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Supply</th>
                      <th className="px-4 py-3 text-right">Bills</th>
                      <th className="px-4 py-3 text-right">Total Billed</th>
                      <th className="px-4 py-3 text-right">Collected</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(report?.by_supply || []).map((row: any) => (
                      <tr key={row.supply_id}>
                        <td className="px-4 py-3 font-medium">{row.supply_name}</td>
                        <td className="px-4 py-3 text-right">{row.bill_count}</td>
                        <td className="px-4 py-3 text-right">{formatPeso(row.total_billed || 0)}</td>
                        <td className="px-4 py-3 text-right text-green-700">{formatPeso(row.total_collected || 0)}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatPeso(row.total_outstanding || 0)}</td>
                      </tr>
                    ))}
                    {!report?.by_supply?.length && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No data for selected period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <h2 className="px-4 py-3 font-semibold bg-gray-50 border-b">Unpaid Accounts (Top 100)</h2>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Account</th>
                      <th className="px-4 py-3 text-left">Supply</th>
                      <th className="px-4 py-3 text-left">Period</th>
                      <th className="px-4 py-3 text-right">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(report?.unpaid_accounts || []).map((row: any) => (
                      <tr key={`${row.account_id}-${row.billing_month}-${row.billing_year}`}>
                        <td className="px-4 py-3">
                          <Link href={`/admin/waterworks/accounts/${row.account_id}`} className="text-blue-600 hover:underline">{row.account_number}</Link>
                          <div className="text-xs text-gray-500">{row.consumer_name}</div>
                        </td>
                        <td className="px-4 py-3">{row.supply_name}</td>
                        <td className="px-4 py-3">{row.billing_month}/{row.billing_year}</td>
                        <td className="px-4 py-3 text-right text-red-600">{formatPeso(row.balance_due || 0)}</td>
                      </tr>
                    ))}
                    {!report?.unpaid_accounts?.length && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No unpaid accounts</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
