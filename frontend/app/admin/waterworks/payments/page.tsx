'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import waterworksService, { WaterPayment, WaterSupply } from '@/services/waterworksService';
import { formatPeso } from '@/utils/formatters';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

export default function WaterworksPaymentsPage() {
  const [payments, setPayments] = useState<WaterPayment[]>([]);
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [supplyFilter, setSupplyFilter] = useState('');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 20 };
      if (supplyFilter) params.supply_id = supplyFilter;
      const res = await waterworksService.getPayments(params);
      setPayments(res.data);
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
    fetchPayments();
  }, [supplyFilter, page]);

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Payment Records</h1>
          <p className="text-gray-600 text-sm mb-6">Waterworks payment ledger</p>

          <div className="flex flex-wrap gap-3 mb-4 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Water Supply</label>
              <select value={supplyFilter} onChange={(e) => { setSupplyFilter(e.target.value); setPage(1); }} className="px-3 py-2 border rounded-lg text-sm">
                <option value="">All supplies</option>
                {supplies.map((s) => <option key={s.supply_id} value={s.supply_id}>{s.supply_name}</option>)}
              </select>
            </div>
            <span className="text-sm text-gray-600 ml-auto pb-2">Page total: {formatPeso(totalCollected)}</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Account</th>
                    <th className="px-4 py-3 text-left">Supply</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">OR #</th>
                    <th className="px-4 py-3 text-left">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((p) => (
                    <tr key={p.payment_id}>
                      <td className="px-4 py-3">{p.payment_date}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/waterworks/accounts/${p.account_id}`} className="text-blue-600 hover:underline">{p.account_number}</Link>
                        <div className="text-xs text-gray-500">{p.consumer_name}</div>
                      </td>
                      <td className="px-4 py-3">{p.supply_name}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatPeso(p.amount_paid)}</td>
                      <td className="px-4 py-3">{p.or_number || '—'}</td>
                      <td className="px-4 py-3">{p.recorded_by_name || '—'}</td>
                    </tr>
                  ))}
                  {!payments.length && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No payments found</td></tr>}
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
