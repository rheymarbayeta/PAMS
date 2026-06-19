'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import waterworksService, { MeterReading, WaterSupply } from '@/services/waterworksService';
import { showAlert, showConfirm } from '@/utils/modal';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

export default function WaterworksReadingsPage() {
  const now = new Date();
  const [readings, setReadings] = useState<MeterReading[]>([]);
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: 'pending',
    supply_id: '',
    period_month: String(now.getMonth() + 1),
    period_year: String(now.getFullYear()),
  });

  const fetchReadings = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.supply_id) params.supply_id = filters.supply_id;
      if (filters.period_month) params.period_month = filters.period_month;
      if (filters.period_year) params.period_year = filters.period_year;
      const res = await waterworksService.getReadings(params);
      setReadings(res.data);
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
    fetchReadings();
  }, [filters, page]);

  const handleVerify = (id: string, action: 'verify' | 'reject') => {
    const msg = action === 'verify' ? 'Verify this reading?' : 'Reject this reading?';
    showConfirm(msg, 'Confirm', async () => {
      try {
        await waterworksService.verifyReading(id, action);
        fetchReadings();
      } catch (e: any) {
        showAlert(e.response?.data?.error || 'Action failed', 'Error');
      }
    });
  };

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Meter Readings</h1>
          <p className="text-gray-600 text-sm mb-6">Review and verify submitted meter readings</p>

          <div className="flex flex-wrap gap-3 mb-4">
            <select value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={filters.supply_id} onChange={(e) => { setFilters({ ...filters, supply_id: e.target.value }); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">All supplies</option>
              {supplies.map((s) => <option key={s.supply_id} value={s.supply_id}>{s.supply_name}</option>)}
            </select>
            <input type="number" min={1} max={12} value={filters.period_month} onChange={(e) => setFilters({ ...filters, period_month: e.target.value })} className="w-20 px-3 py-2 border rounded-lg text-sm" placeholder="Mo" />
            <input type="number" value={filters.period_year} onChange={(e) => setFilters({ ...filters, period_year: e.target.value })} className="w-24 px-3 py-2 border rounded-lg text-sm" placeholder="Year" />
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
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-right">Previous</th>
                    <th className="px-4 py-3 text-right">Current</th>
                    <th className="px-4 py-3 text-right">Consumption</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {readings.map((r) => (
                    <tr key={r.reading_id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.consumer_name}</div>
                        <div className="text-xs text-gray-500">{r.account_number}</div>
                      </td>
                      <td className="px-4 py-3">{r.supply_name}</td>
                      <td className="px-4 py-3">{r.reading_period_month}/{r.reading_period_year}</td>
                      <td className="px-4 py-3 text-right">{r.previous_reading}</td>
                      <td className="px-4 py-3 text-right">{r.current_reading}</td>
                      <td className="px-4 py-3 text-right">{r.consumption} m³</td>
                      <td className="px-4 py-3 text-center capitalize">{r.status}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {r.status === 'pending' && (
                          <>
                            <button onClick={() => handleVerify(r.reading_id, 'verify')} className="text-green-600 hover:underline">Verify</button>
                            <button onClick={() => handleVerify(r.reading_id, 'reject')} className="text-red-600 hover:underline">Reject</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!readings.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No readings found</td></tr>}
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
