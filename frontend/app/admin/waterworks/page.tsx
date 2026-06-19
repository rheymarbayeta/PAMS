'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import waterworksService, { WaterSupply } from '@/services/waterworksService';
import api from '@/services/api';
import { showAlert, showConfirm } from '@/utils/modal';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];

function generateSupplyCode(name: string): string {
  const code = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);

  return code || 'SUPPLY';
}

interface UserOption {
  user_id: string;
  full_name: string;
  username: string;
}

export default function WaterworksSuppliesPage() {
  const [supplies, setSupplies] = useState<WaterSupply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<WaterSupply | null>(null);
  const [showReaders, setShowReaders] = useState<string | null>(null);
  const [readers, setReaders] = useState<any[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const [form, setForm] = useState({
    supply_code: '',
    supply_name: '',
    location: '',
    description: '',
    rate_per_cubic_meter: '0',
    minimum_charge: '0',
    status: 'active' as WaterSupply['status'],
  });

  const fetchSupplies = async () => {
    try {
      setLoading(true);
      const res = await waterworksService.getSupplies({ search, page, limit: 15 });
      setSupplies(res.data);
      setTotalPages(res.pagination.pages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, [search, page]);

  const openCreate = () => {
    setEditing(null);
    setCodeManuallyEdited(false);
    setForm({ supply_code: '', supply_name: '', location: '', description: '', rate_per_cubic_meter: '0', minimum_charge: '0', status: 'active' });
    setShowModal(true);
  };

  const handleSupplyNameChange = (supply_name: string) => {
    setForm((prev) => ({
      ...prev,
      supply_name,
      supply_code: !editing && !codeManuallyEdited ? generateSupplyCode(supply_name) : prev.supply_code,
    }));
  };

  const handleSupplyCodeChange = (supply_code: string) => {
    if (!editing) setCodeManuallyEdited(true);
    setForm((prev) => ({ ...prev, supply_code }));
  };

  const openEdit = (s: WaterSupply) => {
    setEditing(s);
    setCodeManuallyEdited(true);
    setForm({
      supply_code: s.supply_code,
      supply_name: s.supply_name,
      location: s.location || '',
      description: s.description || '',
      rate_per_cubic_meter: String(s.rate_per_cubic_meter),
      minimum_charge: String(s.minimum_charge),
      status: s.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.supply_code || !form.supply_name) {
      showAlert('Supply code and name are required', 'Validation');
      return;
    }
    try {
      const payload = {
        ...form,
        rate_per_cubic_meter: parseFloat(form.rate_per_cubic_meter) || 0,
        minimum_charge: parseFloat(form.minimum_charge) || 0,
      };
      if (editing) {
        await waterworksService.updateSupply(editing.supply_id, payload);
      } else {
        await waterworksService.createSupply(payload);
      }
      setShowModal(false);
      fetchSupplies();
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to save supply', 'Error');
    }
  };

  const handleDelete = (s: WaterSupply) => {
    showConfirm(`Delete water supply "${s.supply_name}"?`, 'Confirm', async () => {
      try {
        await waterworksService.deleteSupply(s.supply_id);
        fetchSupplies();
      } catch (e: any) {
        showAlert(e.response?.data?.error || 'Failed to delete', 'Error');
      }
    }, undefined, { isDangerous: true });
  };

  const openReaders = async (supplyId: string) => {
    setShowReaders(supplyId);
    try {
      const [readerList, usersRes] = await Promise.all([
        waterworksService.getSupplyReaders({ supply_id: supplyId }),
        api.get('/api/users'),
      ]);
      setReaders(readerList);
      setUsers(usersRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const assignReader = async () => {
    if (!showReaders || !selectedUserId) return;
    try {
      await waterworksService.assignReader(showReaders, selectedUserId);
      setSelectedUserId('');
      openReaders(showReaders);
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to assign reader', 'Error');
    }
  };

  const removeReader = async (assignmentId: string) => {
    try {
      await waterworksService.removeReader(assignmentId);
      if (showReaders) openReaders(showReaders);
    } catch (e: any) {
      showAlert(e.response?.data?.error || 'Failed to remove reader', 'Error');
    }
  };

  return (
    <ProtectedRoute allowedRoles={WW_ROLES}>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Water Supplies</h1>
              <p className="text-gray-600 text-sm">Manage physical water supply systems and rates</p>
            </div>
            <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Add Supply
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search supplies..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full sm:w-80 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate/m³</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Min Charge</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Accounts</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {supplies.map((s) => (
                    <tr key={s.supply_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{s.supply_code}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.supply_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{s.location || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right">₱{Number(s.rate_per_cubic_meter).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-right">₱{Number(s.minimum_charge).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-center">{s.account_count ?? 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm space-x-2">
                        <Link href={`/admin/waterworks/accounts?supply_id=${s.supply_id}`} className="text-blue-600 hover:underline">Accounts</Link>
                        <button onClick={() => openReaders(s.supply_id)} className="text-indigo-600 hover:underline">Readers</button>
                        <button onClick={() => openEdit(s)} className="text-gray-600 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {!supplies.length && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No water supplies found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Supply' : 'New Water Supply'}</h2>
              <div className="space-y-3">
                <input
                  placeholder="Supply Name *"
                  value={form.supply_name}
                  onChange={(e) => handleSupplyNameChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div>
                  <input
                    placeholder="Supply Code *"
                    value={form.supply_code}
                    onChange={(e) => handleSupplyCodeChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                  />
                  {!editing && !codeManuallyEdited && form.supply_name && (
                    <p className="mt-1 text-xs text-gray-500">Auto-generated from supply name</p>
                  )}
                </div>
                <input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" placeholder="Rate per m³" value={form.rate_per_cubic_meter} onChange={(e) => setForm({ ...form, rate_per_cubic_meter: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" step="0.01" placeholder="Minimum charge" value={form.minimum_charge} onChange={(e) => setForm({ ...form, minimum_charge: e.target.value })} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WaterSupply['status'] })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg text-sm">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button>
              </div>
            </div>
          </div>
        )}

        {showReaders && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-bold mb-4">Meter Reader Assignments</h2>
              <div className="flex gap-2 mb-4">
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm">
                  <option value="">Select user...</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>{u.full_name} ({u.username})</option>
                  ))}
                </select>
                <button onClick={assignReader} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">Add</button>
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {readers.map((r) => (
                  <li key={r.assignment_id} className="flex justify-between items-center text-sm border-b pb-2">
                    <span>{r.full_name}</span>
                    <button onClick={() => removeReader(r.assignment_id)} className="text-red-600 text-xs">Remove</button>
                  </li>
                ))}
                {!readers.length && <li className="text-gray-500 text-sm">No readers assigned</li>}
              </ul>
              <button onClick={() => setShowReaders(null)} className="mt-4 w-full px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
