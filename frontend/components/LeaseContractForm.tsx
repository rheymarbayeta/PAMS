'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/services/api';

interface Lessee {
  id: number;
  name: string;
}

interface Property {
  id: number;
  property_name: string;
}

interface PropertyUnit {
  id: number;
  stall_number: string;
  floor_level: string;
  unit_description: string;
  area_sqm: string;
  status: string;
}

interface LeaseContractFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  submitLabel: string;
  isLoading: boolean;
}

export default function LeaseContractForm({
  initialData,
  onSubmit,
  submitLabel,
  isLoading
}: LeaseContractFormProps) {
  const [lessees, setLessees] = useState<Lessee[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyUnits, setPropertyUnits] = useState<PropertyUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [formData, setFormData] = useState({
    lessee_id: '',
    property_id: '',
    contract_effective_date: '',
    contract_termination_date: '',
    principal_amount: '',
    monthly_rights_amount: '',
    monthly_rental_amount: '',
    downpayment: '',
    status: 'active'
  });
  const [selectedUnitIds, setSelectedUnitIds] = useState<number[]>([]);
  const [noTerminationDate, setNoTerminationDate] = useState(false);
  const [lesseeSearch, setLesseeSearch] = useState('');
  const [lesseeDropdownOpen, setLesseeDropdownOpen] = useState(false);
  const lesseeDropdownRef = useRef<HTMLDivElement>(null);

  // Close lessee dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (lesseeDropdownRef.current && !lesseeDropdownRef.current.contains(e.target as Node)) {
        setLesseeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (initialData) {
      const terminationDate = initialData.contract_termination_date?.split('T')[0] || '';
      setNoTerminationDate(!terminationDate);
      setFormData({
        lessee_id: initialData.lessee_id || '',
        property_id: initialData.property_id || '',
        contract_effective_date: initialData.contract_effective_date?.split('T')[0] || '',
        contract_termination_date: terminationDate,
        principal_amount: initialData.principal_amount?.toString() || '',
        monthly_rights_amount: initialData.monthly_rights_amount?.toString() || '',
        monthly_rental_amount: initialData.monthly_rental_amount?.toString() || '',
        downpayment: initialData.downpayment?.toString() || '',
        status: initialData.status || 'active'
      });
      // Initialise selected units from property_units array (new) or legacy property_unit_id
      if (Array.isArray(initialData.property_units) && initialData.property_units.length > 0) {
        setSelectedUnitIds(initialData.property_units.map((u: any) => Number(u.id)));
      } else if (initialData.property_unit_id) {
        setSelectedUnitIds([Number(initialData.property_unit_id)]);
      } else {
        setSelectedUnitIds([]);
      }
    }
  }, [initialData]);

  // Fetch property units when property changes (do not clear selected units here —
  // that wiped existing selections on edit before initialData finished loading)
  useEffect(() => {
    if (formData.property_id) {
      fetchPropertyUnits(formData.property_id);
    } else {
      setPropertyUnits([]);
    }
  }, [formData.property_id]);

  const fetchPropertyUnits = async (propertyId: string) => {
    setUnitsLoading(true);
    try {
      const response = await api.get(`/api/rights-and-rentals/properties/${propertyId}/units`);
      setPropertyUnits(response.data || []);
    } catch (error) {
      console.error('Error fetching property units:', error);
      setPropertyUnits([]);
    } finally {
      setUnitsLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const [lesseeRes, propertyRes] = await Promise.all([
        api.get('/api/rights-and-rentals/lessees'),
        api.get('/api/rights-and-rentals/properties')
      ]);
      setLessees(lesseeRes.data || []);
      setProperties(propertyRes.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
      setError('Failed to load form options');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'property_id') {
      setSelectedUnitIds([]);
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.lessee_id || !formData.property_id || !formData.contract_effective_date) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      await onSubmit({
        ...formData,
        lessee_id: parseInt(formData.lessee_id),
        property_id: parseInt(formData.property_id),
        property_unit_ids: selectedUnitIds,
        contract_termination_date: noTerminationDate ? null : formData.contract_termination_date || null,
        principal_amount: formData.principal_amount ? parseFloat(formData.principal_amount) : 0,
        monthly_rights_amount: formData.monthly_rights_amount ? parseFloat(formData.monthly_rights_amount) : 0,
        monthly_rental_amount: formData.monthly_rental_amount ? parseFloat(formData.monthly_rental_amount) : 0,
        downpayment: formData.downpayment ? parseFloat(formData.downpayment) : 0
      });
    } catch (error: any) {
      setError(error.response?.data?.error || 'Error submitting form');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-indigo-100"></div>
          <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <svg className="h-5 w-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lessee – searchable */}
        <div className="relative" ref={lesseeDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lessee *
          </label>
          {/* Hidden native input for form validation */}
          <input type="hidden" name="lessee_id" value={formData.lessee_id} required />
          <div
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between focus-within:ring-2 focus-within:ring-indigo-600 focus-within:border-indigo-600"
            onClick={() => setLesseeDropdownOpen(o => !o)}
          >
            <span className={formData.lessee_id ? 'text-gray-900' : 'text-gray-400'}>
              {formData.lessee_id
                ? lessees.find(l => String(l.id) === String(formData.lessee_id))?.name || 'Select a lessee'
                : 'Select a lessee'}
            </span>
            <svg className={`w-4 h-4 text-gray-400 transition-transform ${lesseeDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          {lesseeDropdownOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="p-2 border-b border-gray-100">
                <input
                  autoFocus
                  type="text"
                  placeholder="Search lessee..."
                  value={lesseeSearch}
                  onChange={e => setLesseeSearch(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={e => e.stopPropagation()}
                />
              </div>
              <ul className="max-h-52 overflow-y-auto">
                <li
                  className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, lessee_id: '' }));
                    setLesseeSearch('');
                    setLesseeDropdownOpen(false);
                  }}
                >
                  — Select a lessee —
                </li>
                {lessees
                  .filter(l => l.name.toLowerCase().includes(lesseeSearch.toLowerCase()))
                  .map(lessee => (
                    <li
                      key={lessee.id}
                      className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
                        String(formData.lessee_id) === String(lessee.id) ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-800'
                      }`}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, lessee_id: String(lessee.id) }));
                        setLesseeSearch('');
                        setLesseeDropdownOpen(false);
                      }}
                    >
                      {lessee.name}
                    </li>
                  ))}
                {lessees.filter(l => l.name.toLowerCase().includes(lesseeSearch.toLowerCase())).length === 0 && (
                  <li className="px-4 py-2 text-sm text-gray-400 italic">No matches found</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Property */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property *
          </label>
          <select
            name="property_id"
            value={formData.property_id}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Select a property</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.property_name}
              </option>
            ))}
          </select>
        </div>

        {/* Property Units – multi-select */}
        {formData.property_id && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Units
              {selectedUnitIds.length > 0 && (
                <span className="ml-2 text-xs font-normal text-indigo-600">
                  {selectedUnitIds.length} selected
                </span>
              )}
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Select all units for this contract. Existing selections are kept when adding more.
            </p>
            {unitsLoading ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading units...
              </div>
            ) : propertyUnits.length === 0 ? (
              <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm">
                No units available for this property
              </div>
            ) : (
              (() => {
                // Show available units + any already-selected units (edit mode)
                const visibleUnits = propertyUnits.filter(
                  u => u.status === 'available' || selectedUnitIds.includes(u.id)
                );
                return visibleUnits.length === 0 ? (
                  <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    No available units for this property
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {visibleUnits.map(unit => {
                      const isSelected = selectedUnitIds.includes(unit.id);
                      return (
                        <label
                          key={unit.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedUnitIds(prev =>
                                prev.includes(unit.id)
                                  ? prev.filter(id => id !== unit.id)
                                  : [...prev, unit.id]
                              );
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="flex-1 text-sm text-gray-800">
                            <span className="font-medium">{unit.stall_number}</span>
                            {unit.unit_description ? ` – ${unit.unit_description}` : ''}
                            {unit.floor_level ? ` (${unit.floor_level})` : ''}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Effective Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Effective Date *
          </label>
          <input
            type="date"
            name="contract_effective_date"
            value={formData.contract_effective_date}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Termination Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Termination Date
          </label>
          <input
            type="date"
            name="contract_termination_date"
            value={noTerminationDate ? '' : formData.contract_termination_date}
            onChange={handleChange}
            disabled={noTerminationDate}
            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
              noTerminationDate ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
            }`}
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noTerminationDate}
              onChange={e => {
                setNoTerminationDate(e.target.checked);
                if (e.target.checked) {
                  setFormData(prev => ({ ...prev, contract_termination_date: '' }));
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-600">No termination date specified</span>
          </label>
        </div>

        {/* Principal Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Principal Amount (PHP)
          </label>
          <input
            type="number"
            name="principal_amount"
            value={formData.principal_amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Monthly Rights Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Rights Amount (PHP)
          </label>
          <input
            type="number"
            name="monthly_rights_amount"
            value={formData.monthly_rights_amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Monthly Rental Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Monthly Rental Amount (PHP)
          </label>
          <input
            type="number"
            name="monthly_rental_amount"
            value={formData.monthly_rental_amount}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Downpayment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Downpayment (PHP)
          </label>
          <input
            type="number"
            name="downpayment"
            value={formData.downpayment}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="active">Active</option>
            <option value="terminated">Terminated</option>
            <option value="expired">Expired</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex gap-3 pt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
