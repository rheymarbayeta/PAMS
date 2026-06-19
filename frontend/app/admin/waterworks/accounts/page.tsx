'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import waterworksService, { ConsumerAccount, WaterSupply } from '@/services/waterworksService';
import { showAlert } from '@/utils/modal';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

function AccountsContent() {
  const searchParams = useSearchParams();
  const initialSupply = searchParams.get('supply_id') || '';

  const [accounts, setAccounts] = useState<ConsumerAccount[]>([]);
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [supplyFilter, setSupplyFilter] = useState(initialSupply);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ConsumerAccount | null>(null);

  const [form, setForm] = useState({
    account_number: '',
    supply_id: '',
    consumer_name: '',
    address: '',
    contact_number: '',
    email: '',
    meter_number: '',
    connection_date: '',
    status: 'active' as ConsumerAccount['status'],
    previous_reading: '0',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit: 15 };
      if (search) params.search = search;
      if (supplyFilter) params.supply_id = supplyFilter;
      const [accRes, supRes] = await Promise.all([
        waterworksService.getAccounts(params),
        waterworksService.getSupplies({ limit: 100 }),
      ]);
      setAccounts(accRes.data);
      setTotalPages(accRes.pagination.pages || 1);
      setSupplies(supRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, supplyFilter, page]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      account_number: '',
      supply_id: supplyFilter || (supplies[0]?.supply_id || ''),
      consumer_name: '',
      address: '',
      contact_number: '',
      email: '',
      meter_number: '',
      connection_date: '',
      status: 'active',
      previous_reading: '0',
    });
    setShowModal(true);
  };

  const openEdit = (a: ConsumerAccount) => {
    setEditing(a);
    setForm({
      account_number: a.account_number,
      supply_id: a.supply_id,
      consumer_name: a.consumer_name,
      address: a.address || '',
      contact_number: a.contact_number || '',
      email: a.email || '',
      meter_number: a.meter_number || '',
      connection_date: a.connection_date || '',
      status: a.status,
      previous_reading: String(a.previous_reading ?? 0),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.account_number || !form.supply_id || !form.consumer_name) {
      showAlert('Account number, supply, and consumer name are required', 'Validation');
      return;
    }
    try {
      const payload = { ...form, previous_reading: parseFloat(form.previous_reading) || 0 };
      if (editing) {
        await waterworksService.updateAccount(editing.account_id, payload);
      } else {
        await waterworksService.createAccount(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to save account', 'Error');
    }
  };

  return (
    <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumer Accounts</h1>
          <p className="text-gray-600 text-sm">Manage water consumer accounts by supply</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          Add Account
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64"
        />
        <select
          value={supplyFilter}
          onChange={(e) => { setSupplyFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Supplies</option>
          {supplies.map((s) => (
            <option key={s.supply_id} value={s.supply_id}>{s.supply_name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consumer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supply</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meter</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Last Reading</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {accounts.map((a) => (
                <tr key={a.account_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{a.account_number}</td>
                  <td className="px-4 py-3 text-sm">{a.consumer_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.supply_name}</td>
                  <td className="px-4 py-3 text-sm">{a.meter_number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right">{a.last_reading ?? a.previous_reading ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm space-x-2">
                    <Link href={`/admin/waterworks/accounts/${a.account_id}`} className="text-blue-600 hover:underline">View</Link>
                    <button onClick={() => openEdit(a)} className="text-gray-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
              {!accounts.length && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No accounts found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && <div className="mt-4"><Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} /></div>}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 my-8">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Account' : 'New Consumer Account'}</h2>
            <div className="space-y-3">
              <input placeholder="Account Number *" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <select value={form.supply_id} onChange={(e) => setForm({ ...form, supply_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select supply *</option>
                {supplies.map((s) => <option key={s.supply_id} value={s.supply_id}>{s.supply_name}</option>)}
              </select>
              <input placeholder="Consumer Name *" value={form.consumer_name} onChange={(e) => setForm({ ...form, consumer_name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Contact" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
              </div>
              <input placeholder="Meter Number" value={form.meter_number} onChange={(e) => setForm({ ...form, meter_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={form.connection_date} onChange={(e) => setForm({ ...form, connection_date: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                <input type="number" step="0.01" placeholder="Initial reading" value={form.previous_reading} onChange={(e) => setForm({ ...form, previous_reading: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
              </div>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ConsumerAccount['status'] })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="active">Active</option>
                <option value="disconnected">Disconnected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WaterworksAccountsPage() {
  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
          <AccountsContent />
        </Suspense>
      </Layout>
    </ProtectedRoute>
  );
}
