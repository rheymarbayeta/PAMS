'use client';

import { useEffect, useState } from 'react';
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
    property_unit_id: '',
    contract_effective_date: '',
    contract_termination_date: '',
    principal_amount: '',
    monthly_rights_amount: '',
    monthly_rental_amount: '',
    downpayment: '',
    status: 'active'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        lessee_id: initialData.lessee_id || '',
        property_id: initialData.property_id || '',
        property_unit_id: initialData.property_unit_id || '',
        contract_effective_date: initialData.contract_effective_date?.split('T')[0] || '',
        contract_termination_date: initialData.contract_termination_date?.split('T')[0] || '',
        principal_amount: initialData.principal_amount?.toString() || '',
        monthly_rights_amount: initialData.monthly_rights_amount?.toString() || '',
        monthly_rental_amount: initialData.monthly_rental_amount?.toString() || '',
        downpayment: initialData.downpayment?.toString() || '',
        status: initialData.status || 'active'
      });
    }
  }, [initialData]);

  // Fetch property units when property changes
  useEffect(() => {
    if (formData.property_id) {
      fetchPropertyUnits(formData.property_id);
    } else {
      setPropertyUnits([]);
      setFormData(prev => ({ ...prev, property_unit_id: '' }));
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
        property_unit_id: formData.property_unit_id ? parseInt(formData.property_unit_id) : null,
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
        {/* Lessee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Lessee *
          </label>
          <select
            name="lessee_id"
            value={formData.lessee_id}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          >
            <option value="">Select a lessee</option>
            {lessees.map(lessee => (
              <option key={lessee.id} value={lessee.id}>
                {lessee.name}
              </option>
            ))}
          </select>
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

        {/* Property Unit */}
        {formData.property_id && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Unit {propertyUnits.length === 0 && !unitsLoading ? '(No units available)' : ''}
            </label>
            {unitsLoading ? (
              <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading units...
              </div>
            ) : (
              <select
                name="property_unit_id"
                value={formData.property_unit_id}
                onChange={handleChange}
                disabled={propertyUnits.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select a unit (Optional) --</option>
                {propertyUnits.map(unit => (
                  <option key={unit.id} value={unit.id}>
                    {unit.stall_number} - {unit.unit_description} ({unit.status})
                  </option>
                ))}
              </select>
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
            value={formData.contract_termination_date}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
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
