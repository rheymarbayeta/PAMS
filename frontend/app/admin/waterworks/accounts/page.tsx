'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import waterworksService, {
  ConsumerAccount,
  WaterSupply,
  AccountType,
  ACCOUNT_TYPE_OPTIONS,
} from '@/services/waterworksService';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert, showConfirm } from '@/utils/modal';
import { formatPeso } from '@/utils/formatters';

const WW_ROLES = ['SuperAdmin', 'Admin', 'Waterworks Manager'];
const WW_DELETE_ROLES = ['SuperAdmin', 'Admin'];

interface Entity {
  entity_id: string;
  entity_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
}

const EMPTY_NEW_ENTITY_FORM = {
  entity_name: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
};

function buildConsumerName(first: string, middle: string, last: string): string {
  return [first.trim(), middle.trim(), last.trim()].filter(Boolean).join(' ');
}

function splitSearchToNames(search: string) {
  const parts = search.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first_name: '', middle_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: '', middle_name: '', last_name: parts[0] };
  if (parts.length === 2) return { first_name: parts[0], middle_name: '', last_name: parts[1] };
  return {
    first_name: parts[0],
    middle_name: parts.slice(1, -1).join(' '),
    last_name: parts[parts.length - 1],
  };
}

function accountTypeCode(type?: AccountType): string {
  return ACCOUNT_TYPE_OPTIONS.find((t) => t.value === type)?.code || 'R';
}

function AccountsContent() {
  const { hasRole } = useAuth();
  const canDeleteAccount = hasRole(WW_DELETE_ROLES);
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

  const [entitySearch, setEntitySearch] = useState('');
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [showNewEntityModal, setShowNewEntityModal] = useState(false);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [newEntityForm, setNewEntityForm] = useState({ ...EMPTY_NEW_ENTITY_FORM });
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);

  const updateNewEntityNameField = (field: 'first_name' | 'middle_name' | 'last_name', value: string) => {
    setNewEntityForm((prev) => {
      const next = { ...prev, [field]: value };
      next.entity_name = buildConsumerName(next.first_name, next.middle_name, next.last_name);
      return next;
    });
  };

  const openNewEntityModal = (searchPrefill = '') => {
    const names = splitSearchToNames(searchPrefill);
    const entity_name = buildConsumerName(names.first_name, names.middle_name, names.last_name);
    setNewEntityForm({
      ...EMPTY_NEW_ENTITY_FORM,
      ...names,
      entity_name,
    });
    setShowNewEntityModal(true);
  };

  const [form, setForm] = useState({
    account_number: '',
    account_type: 'residential' as AccountType,
    supply_id: '',
    entity_id: '',
    consumer_name: '',
    address: '',
    contact_number: '',
    email: '',
    meter_number: '',
    connection_date: '',
    status: 'active' as ConsumerAccount['status'],
    previous_reading: '0',
    unpaid_dues: '0',
    unpaid_dues_notes: '',
  });

  const fetchNextAccountNumber = useCallback(async (supplyId: string, accountType: AccountType) => {
    if (!supplyId) return;
    try {
      setLoadingNextNumber(true);
      const result = await waterworksService.getNextAccountNumber(supplyId, accountType);
      setForm((prev) => ({ ...prev, account_number: result.account_number }));
    } catch (error) {
      console.error('Error fetching next account number:', error);
      showAlert('Could not generate account number. Check supply and try again.', 'Warning');
    } finally {
      setLoadingNextNumber(false);
    }
  }, []);

  useEffect(() => {
    if (!showModal || editing) return;
    if (!form.supply_id) return;
    fetchNextAccountNumber(form.supply_id, form.account_type);
  }, [showModal, editing, form.supply_id, form.account_type, fetchNextAccountNumber]);

  const fetchEntities = useCallback(async (searchTerm: string = '') => {
    try {
      const response = await api.get(`/api/entities${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setFilteredEntities(response.data);
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (showModal) fetchEntities(entitySearch);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [entitySearch, fetchEntities, showModal]);

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

  const resetEntityState = () => {
    setEntitySearch('');
    setSelectedEntity(null);
    setShowEntityDropdown(false);
    setShowNewEntityModal(false);
    setNewEntityForm({ ...EMPTY_NEW_ENTITY_FORM });
  };

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
    setForm({
      ...form,
      entity_id: entity.entity_id,
      consumer_name: entity.entity_name,
      address: entity.address || '',
      contact_number: entity.phone || '',
      email: entity.email || '',
    });
    setEntitySearch(entity.entity_name);
    setShowEntityDropdown(false);
  };

  const handleEntitySearchChange = (value: string) => {
    setEntitySearch(value);
    setShowEntityDropdown(true);
    if (!value) {
      setSelectedEntity(null);
      setForm({ ...form, entity_id: '', consumer_name: '' });
    }
  };

  const handleCreateNewEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    const entity_name = buildConsumerName(
      newEntityForm.first_name,
      newEntityForm.middle_name,
      newEntityForm.last_name
    );
    if (!entity_name) {
      showAlert('Please enter at least a first or last name');
      return;
    }
    setCreatingEntity(true);
    try {
      const response = await api.post('/api/entities', {
        entity_name,
        firstname: newEntityForm.first_name.trim() || null,
        middlename: newEntityForm.middle_name.trim() || null,
        lastname: newEntityForm.last_name.trim() || null,
        contact_person: entity_name,
        email: newEntityForm.email.trim() || null,
        phone: newEntityForm.phone.trim() || null,
        address: newEntityForm.address.trim() || null,
      });

      handleEntitySelect(response.data);
      setShowNewEntityModal(false);
      setNewEntityForm({ ...EMPTY_NEW_ENTITY_FORM });
      showAlert('Consumer added successfully!');
    } catch (error: any) {
      showAlert(error.response?.data?.error || 'Error creating consumer');
    } finally {
      setCreatingEntity(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    resetEntityState();
    setForm({
      account_number: '',
      account_type: 'residential',
      supply_id: supplyFilter || (supplies[0]?.supply_id || ''),
      entity_id: '',
      consumer_name: '',
      address: '',
      contact_number: '',
      email: '',
      meter_number: '',
      connection_date: '',
      status: 'active',
      previous_reading: '0',
      unpaid_dues: '0',
      unpaid_dues_notes: '',
    });
    setShowModal(true);
  };

  const openEdit = (a: ConsumerAccount) => {
    setEditing(a);
    resetEntityState();
    setForm({
      account_number: a.account_number,
      account_type: a.account_type || 'residential',
      supply_id: a.supply_id,
      entity_id: a.entity_id || '',
      consumer_name: a.consumer_name,
      address: a.address || '',
      contact_number: a.contact_number || '',
      email: a.email || '',
      meter_number: a.meter_number || '',
      connection_date: a.connection_date || '',
      status: a.status,
      // Prefer opening/initial reading when no meter reading has been recorded yet
      previous_reading: String(
        a.last_reading_date == null
          ? (a.previous_reading ?? a.last_reading ?? 0)
          : (a.previous_reading ?? 0)
      ),
      unpaid_dues: String(a.unpaid_dues ?? 0),
      unpaid_dues_notes: a.unpaid_dues_notes || '',
    });
    if (a.entity_id) {
      setSelectedEntity({
        entity_id: a.entity_id,
        entity_name: a.linked_entity_name || a.consumer_name,
        contact_person: null,
        email: a.email || null,
        phone: a.contact_number || null,
        address: a.address || null,
      });
      setEntitySearch(a.linked_entity_name || a.consumer_name);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.supply_id) {
      showAlert('Water supply is required', 'Validation');
      return;
    }
    if (!editing && !form.account_number) {
      showAlert('Account number is being generated. Please wait or try again.', 'Validation');
      return;
    }
    if (!form.entity_id && !editing) {
      showAlert('Select a consumer from entities or add a new one', 'Validation');
      return;
    }
    try {
      const openingReading = parseFloat(form.previous_reading) || 0;
      const payload = {
        ...form,
        entity_id: form.entity_id || undefined,
        previous_reading: openingReading,
        // Keep meter position in sync when editing initial reading (no readings yet)
        ...(editing && !editing.last_reading_date ? { last_reading: openingReading } : {}),
        unpaid_dues: parseFloat(form.unpaid_dues) || 0,
        unpaid_dues_notes: form.unpaid_dues_notes.trim() || null,
      };
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

  const handleDelete = (a: ConsumerAccount) => {
    showConfirm(
      `Delete account ${a.account_number} (${a.consumer_name})? This will also remove related readings, bills, and payments.`,
      'Confirm Delete',
      async () => {
        try {
          await waterworksService.deleteAccount(a.account_id);
          fetchData();
        } catch (e: any) {
          showAlert(e.response?.data?.error || 'Failed to delete account', 'Error');
        }
      },
      undefined,
      { isDangerous: true }
    );
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
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
          <input
            type="text"
            placeholder="Account, consumer, meter..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Water Supply</label>
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
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl shadow border overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
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
                  <td className="px-4 py-3 text-sm">
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                      {accountTypeCode(a.account_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {a.consumer_name}
                    {a.entity_id && (
                      <span className="ml-1 text-xs text-gray-400" title="Linked to entity">· entity</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.supply_name}</td>
                  <td className="px-4 py-3 text-sm">{a.meter_number || '—'}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {a.last_reading_date != null
                      ? (a.last_reading ?? a.previous_reading ?? 0)
                      : (a.previous_reading ?? a.last_reading ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${a.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm space-x-2">
                    <Link href={`/admin/waterworks/accounts/${a.account_id}`} className="text-blue-600 hover:underline">View</Link>
                    <button onClick={() => openEdit(a)} className="text-gray-600 hover:underline">Edit</button>
                    {canDeleteAccount && (
                      <button onClick={() => handleDelete(a)} className="text-red-600 hover:underline">Delete</button>
                    )}
                  </td>
                </tr>
              ))}
              {!accounts.length && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No accounts found</td></tr>
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
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Consumer *</label>
                  <button
                    type="button"
                    onClick={() => openNewEntityModal()}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add new consumer
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search entities by name..."
                    value={entitySearch}
                    onChange={(e) => handleEntitySearchChange(e.target.value)}
                    onFocus={() => setShowEntityDropdown(true)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                  {entitySearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setEntitySearch('');
                        setSelectedEntity(null);
                        setForm({ ...form, entity_id: '', consumer_name: '' });
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  )}
                  {showEntityDropdown && filteredEntities.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                      {filteredEntities.map((entity) => (
                        <div
                          key={entity.entity_id}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 text-sm"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleEntitySelect(entity);
                          }}
                        >
                          <div className="font-medium">{entity.entity_name}</div>
                          {entity.contact_person && (
                            <div className="text-xs text-gray-500">{entity.contact_person}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showEntityDropdown && entitySearch && filteredEntities.length === 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg p-3">
                      <p className="text-sm text-gray-500 mb-2">No consumer found matching &quot;{entitySearch}&quot;</p>
                      <button
                        type="button"
                        onClick={() => openNewEntityModal(entitySearch)}
                        className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium"
                      >
                        + Add New Consumer
                      </button>
                    </div>
                  )}
                </div>
                {selectedEntity && (
                  <p className="mt-1 text-xs text-green-700">
                    Selected: {selectedEntity.entity_name}
                  </p>
                )}
                {!selectedEntity && editing && form.consumer_name && (
                  <p className="mt-1 text-xs text-amber-700">
                    Legacy account (no entity link): {form.consumer_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Water Supply *</label>
                <select
                  value={form.supply_id}
                  onChange={(e) => setForm({ ...form, supply_id: e.target.value })}
                  disabled={!!editing}
                  className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50"
                >
                  <option value="">Select supply</option>
                  {supplies.map((s) => <option key={s.supply_id} value={s.supply_id}>{s.supply_name} ({s.supply_code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
                <select
                  value={form.account_type}
                  onChange={(e) => setForm({ ...form, account_type: e.target.value as AccountType })}
                  disabled={!!editing}
                  className="w-full px-3 py-2 border rounded-lg text-sm disabled:bg-gray-50"
                >
                  {ACCOUNT_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.code})
                    </option>
                  ))}
                </select>
                {!editing && form.supply_id && (
                  <p className="mt-1 text-xs text-gray-500">
                    Format: supply code − type − series (e.g. WS000001-{accountTypeCode(form.account_type)}-0001)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
                <input
                  value={loadingNextNumber && !editing ? 'Generating...' : form.account_number}
                  readOnly
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Address</label>
                <input
                  placeholder="Optional override from entity address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                  <input value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meter Number</label>
                <input value={form.meter_number} onChange={(e) => setForm({ ...form, meter_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Connection Date</label>
                  <input type="date" value={form.connection_date} onChange={(e) => setForm({ ...form, connection_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Reading (m³)</label>
                  <input type="number" step="0.01" value={form.previous_reading} onChange={(e) => setForm({ ...form, previous_reading: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unpaid Dues (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.unpaid_dues}
                  onChange={(e) => setForm({ ...form, unpaid_dues: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Prior unpaid balance carried into the next bill as previous balance
                  {parseFloat(form.unpaid_dues) > 0 ? ` (${formatPeso(parseFloat(form.unpaid_dues) || 0)})` : ''}.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unpaid Dues Notes</label>
                <textarea
                  value={form.unpaid_dues_notes}
                  onChange={(e) => setForm({ ...form, unpaid_dues_notes: e.target.value })}
                  placeholder="Optional (e.g. arrears from prior system, period covered)"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ConsumerAccount['status'] })} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="active">Active</option>
                  <option value="disconnected">Disconnected</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {showNewEntityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold mb-1">Add New Consumer</h2>
            <p className="text-sm text-gray-500 mb-4">Creates a new entity record for this water account</p>
            <form onSubmit={handleCreateNewEntity} className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input value={newEntityForm.first_name} onChange={(e) => updateNewEntityNameField('first_name', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                  <input value={newEntityForm.middle_name} onChange={(e) => updateNewEntityNameField('middle_name', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input value={newEntityForm.last_name} onChange={(e) => updateNewEntityNameField('last_name', e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Consumer Name</label>
                <input
                  readOnly
                  value={newEntityForm.entity_name}
                  placeholder="Auto-generated from name fields"
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newEntityForm.email} onChange={(e) => setNewEntityForm({ ...newEntityForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={newEntityForm.phone} onChange={(e) => setNewEntityForm({ ...newEntityForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={newEntityForm.address} onChange={(e) => setNewEntityForm({ ...newEntityForm, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewEntityModal(false)} className="px-4 py-2 text-gray-600 border rounded-lg text-sm">Cancel</button>
                <button type="submit" disabled={creatingEntity} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                  {creatingEntity ? 'Saving...' : 'Add Consumer'}
                </button>
              </div>
            </form>
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
