'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/api';

export interface PropertyUnit {
  id: number;
  property_id: number;
  stall_number: string;
  floor_level: string | null;
  unit_description: string | null;
  area_sqm: number | null;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  created_at: string;
  updated_at: string;
}

interface PropertyUnitsSectionProps {
  propertyId: number;
  units: PropertyUnit[];
  canEdit: boolean;
  onUnitsUpdated: () => void;
}

export default function PropertyUnitsSection({
  propertyId,
  units,
  canEdit,
  onUnitsUpdated
}: PropertyUnitsSectionProps) {
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingUnit, setEditingUnit] = useState<PropertyUnit | null>(null);
  const [activeLeases, setActiveLeases] = useState<Map<number, boolean>>(new Map());
  const [unitForm, setUnitForm] = useState({
    stall_number: '',
    floor_level: '',
    unit_description: '',
    area_sqm: '',
    status: 'available'
  });
  const [bulkForm, setBulkForm] = useState({
    unit_count: '',
    floor_level: '',
    unit_description: '',
    area_sqm: '',
    starting_number: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const getNextStartingNumber = () => {
    const numericStalls = units
      .map((u) => parseInt(u.stall_number.replace(/\D/g, ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (numericStalls.length) {
      return Math.max(...numericStalls) + 1;
    }
    return units.length + 1;
  };

  const openBulkAddModal = () => {
    setBulkForm({
      unit_count: '',
      floor_level: '',
      unit_description: '',
      area_sqm: '',
      starting_number: String(getNextStartingNumber()),
    });
    setShowBulkAdd(true);
  };

  const buildBulkStallNumbers = (count: number, startNum: number) => {
    const existing = new Set(units.map((u) => u.stall_number.trim().toLowerCase()));
    const stallNumbers: string[] = [];
    let current = startNum;

    while (stallNumbers.length < count) {
      const stallNumber = String(current);
      if (!existing.has(stallNumber.toLowerCase())) {
        stallNumbers.push(stallNumber);
        existing.add(stallNumber.toLowerCase());
      }
      current += 1;
      if (current > startNum + count + 500) break;
    }

    return stallNumbers;
  };

  const getBulkPreview = () => {
    const count = parseInt(bulkForm.unit_count, 10);
    const startNum = parseInt(bulkForm.starting_number, 10);
    if (!Number.isFinite(count) || count < 1 || !Number.isFinite(startNum) || startNum < 1) {
      return [];
    }
    return buildBulkStallNumbers(Math.min(count, 5), startNum);
  };

  // Fetch active leases for the property to determine unit occupancy
  useEffect(() => {
    fetchActiveLeases();
  }, [propertyId, units]);

  const fetchActiveLeases = async () => {
    try {
      // Fetch all leases for this property
      const response = await api.get(`/api/rights-and-rentals/properties/${propertyId}/lease-contracts`);
      const leases = response.data || [];
      
      // Build a map of unit IDs that have active leases
      const occupiedUnits = new Map<number, boolean>();
      leases.forEach((lease: any) => {
        // Check if lease is active
        const now = new Date();
        const startDate = new Date(lease.contract_effective_date);
        const endDate = lease.contract_termination_date ? new Date(lease.contract_termination_date) : null;
        
        const isActive = startDate <= now && (!endDate || endDate >= now) && lease.status === 'active';
        
        if (isActive && lease.property_units && Array.isArray(lease.property_units)) {
          // Mark each unit in the lease as occupied
          lease.property_units.forEach((unit: any) => {
            occupiedUnits.set(unit.id, true);
          });
        }
      });
      
      setActiveLeases(occupiedUnits);
    } catch (error) {
      console.error('Error fetching active leases:', error);
      // Silently fail - this doesn't block the UI
    }
  };

  // Helper function to get the display status
  const getDisplayStatus = (unit: PropertyUnit): 'available' | 'occupied' | 'maintenance' | 'reserved' => {
    // If unit has an active lease, show as occupied
    if (activeLeases.has(unit.id) && activeLeases.get(unit.id)) {
      return 'occupied';
    }
    // Otherwise use the unit's stored status
    return unit.status;
  };

  const handleAddUnitClick = () => {
    setEditingUnit(null);
    setUnitForm({ stall_number: '', floor_level: '', unit_description: '', area_sqm: '', status: 'available' });
    setShowAddUnit(true);
  };

  const handleEditUnitClick = (unit: PropertyUnit) => {
    setEditingUnit(unit);
    setUnitForm({
      stall_number: unit.stall_number,
      floor_level: unit.floor_level || '',
      unit_description: unit.unit_description || '',
      area_sqm: unit.area_sqm?.toString() || '',
      status: unit.status
    });
    setShowAddUnit(true);
  };

  const handleSaveUnit = async () => {
    if (!unitForm.stall_number.trim()) {
      alert('Please enter a stall number');
      return;
    }

    setSubmitting(true);
    try {
      if (editingUnit) {
        await api.put(`/api/rights-and-rentals/units/${editingUnit.id}`, {
          stall_number: unitForm.stall_number,
          floor_level: unitForm.floor_level || null,
          unit_description: unitForm.unit_description || null,
          area_sqm: unitForm.area_sqm ? parseFloat(unitForm.area_sqm) : null,
          status: unitForm.status
        });
      } else {
        await api.post(`/api/rights-and-rentals/properties/${propertyId}/units`, {
          stall_number: unitForm.stall_number,
          floor_level: unitForm.floor_level || null,
          unit_description: unitForm.unit_description || null,
          area_sqm: unitForm.area_sqm ? parseFloat(unitForm.area_sqm) : null,
          status: unitForm.status
        });
      }
      setShowAddUnit(false);
      onUnitsUpdated();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error saving unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUnit = async (unitId: number) => {
    if (!confirm('Are you sure you want to delete this unit?')) return;

    try {
      await api.delete(`/api/rights-and-rentals/units/${unitId}`);
      onUnitsUpdated();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error deleting unit');
    }
  };

  const handleBulkAdd = async () => {
    const count = parseInt(bulkForm.unit_count, 10);
    const startNum = parseInt(bulkForm.starting_number, 10);

    if (!Number.isFinite(count) || count < 1) {
      alert('Please enter a valid number of stalls/units (at least 1)');
      return;
    }
    if (count > 200) {
      alert('Maximum 200 units can be added at once');
      return;
    }
    if (!Number.isFinite(startNum) || startNum < 1) {
      alert('Please enter a valid starting stall number');
      return;
    }

    const areaSqm = bulkForm.area_sqm.trim() ? parseFloat(bulkForm.area_sqm) : null;
    if (bulkForm.area_sqm.trim() && (!Number.isFinite(areaSqm!) || areaSqm! < 0)) {
      alert('Please enter a valid area in sqm');
      return;
    }

    const stallNumbers = buildBulkStallNumbers(count, startNum);
    if (stallNumbers.length < count) {
      alert(`Could only generate ${stallNumbers.length} unique stall numbers. Adjust the starting number and try again.`);
      return;
    }

    const unitsToCreate = stallNumbers.map((stall_number) => ({
      stall_number,
      floor_level: bulkForm.floor_level.trim() || null,
      unit_description: bulkForm.unit_description.trim() || null,
      area_sqm: areaSqm,
      status: 'available' as const,
    }));

    setSubmitting(true);
    try {
      let successCount = 0;
      let failureCount = 0;

      for (const unitData of unitsToCreate) {
        try {
          await api.post(`/api/rights-and-rentals/properties/${propertyId}/units`, unitData);
          successCount++;
        } catch (error: any) {
          console.error('Error creating unit:', unitData.stall_number, error);
          failureCount++;
        }
      }

      if (failureCount > 0) {
        alert(`Created ${successCount} units. Failed to create ${failureCount} units.`);
      } else {
        alert(`Successfully created ${successCount} unit${successCount === 1 ? '' : 's'}`);
      }

      setShowBulkAdd(false);
      setBulkForm({
        unit_count: '',
        floor_level: '',
        unit_description: '',
        area_sqm: '',
        starting_number: '',
      });
      onUnitsUpdated();
    } catch (error: any) {
      alert('Error processing bulk add: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'occupied':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'reserved':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden mb-6">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m0 0l8 4m-8-4v10l8 4m0-10l8 4m-8-4v10m8-10l-8-4" />
          </svg>
          Property Units
        </h2>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={handleAddUnitClick}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Unit
            </button>
            <button
              onClick={openBulkAddModal}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Bulk Add
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Unit Form Modal */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingUnit ? 'Edit Unit' : 'Add New Unit'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stall Number *</label>
                <input
                  type="text"
                  value={unitForm.stall_number}
                  onChange={(e) => setUnitForm({ ...unitForm, stall_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Stall A, 101, Suite 1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
                <input
                  type="text"
                  value={unitForm.floor_level}
                  onChange={(e) => setUnitForm({ ...unitForm, floor_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Ground, 1st, 2nd"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Description</label>
                <input
                  type="text"
                  value={unitForm.unit_description}
                  onChange={(e) => setUnitForm({ ...unitForm, unit_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Office, Retail, Storage"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={unitForm.area_sqm}
                  onChange={(e) => setUnitForm({ ...unitForm, area_sqm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={unitForm.status}
                  onChange={(e) => setUnitForm({ ...unitForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowAddUnit(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUnit}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Unit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowBulkAdd(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg max-h-[min(90dvh,calc(100vh-2rem))] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="shrink-0 border-b border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Bulk Add Units</h3>
                <button
                  type="button"
                  onClick={() => setShowBulkAdd(false)}
                  className="text-2xl leading-none text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Enter shared details once. Individual stall numbers are generated automatically.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Stalls/Units <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={bulkForm.unit_count}
                    onChange={(e) => setBulkForm({ ...bulkForm, unit_count: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Starting Stall #</label>
                  <input
                    type="number"
                    min="1"
                    value={bulkForm.starting_number}
                    onChange={(e) => setBulkForm({ ...bulkForm, starting_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Auto"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor Level</label>
                <input
                  type="text"
                  value={bulkForm.floor_level}
                  onChange={(e) => setBulkForm({ ...bulkForm, floor_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Ground, 1st Floor, 2nd Floor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Description</label>
                <input
                  type="text"
                  value={bulkForm.unit_description}
                  onChange={(e) => setBulkForm({ ...bulkForm, unit_description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Office, Retail, Storage"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (sqm)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={bulkForm.area_sqm}
                  onChange={(e) => setBulkForm({ ...bulkForm, area_sqm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Applied to all units (optional)"
                />
              </div>

              {getBulkPreview().length > 0 && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <p className="text-xs font-semibold text-indigo-900 mb-1">Preview (stall numbers)</p>
                  <p className="text-sm text-indigo-800 font-mono">
                    {getBulkPreview().join(', ')}
                    {parseInt(bulkForm.unit_count, 10) > 5
                      ? ` … +${parseInt(bulkForm.unit_count, 10) - 5} more`
                      : ''}
                  </p>
                  <p className="mt-2 text-xs text-indigo-700">
                    Each unit gets the same floor, description, and area. Status defaults to Available.
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 flex gap-3">
              <button
                type="button"
                onClick={() => setShowBulkAdd(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Units'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Units List - Grouped by Floor */}
      {units && units.length > 0 ? (
        <div className="space-y-6 p-6">
          {Object.entries(
            units.reduce((acc, unit) => {
              const floorKey = unit.floor_level || 'No Floor Assigned';
              if (!acc[floorKey]) acc[floorKey] = [];
              acc[floorKey].push(unit);
              return acc;
            }, {} as Record<string, PropertyUnit[]>)
          )
            .sort(([floorA], [floorB]) => {
              // Sort floors: Ground, Basement, then numeric (1st, 2nd, etc), then others
              const getFloorOrder = (floor: string) => {
                if (floor === 'Ground') return 0;
                if (floor === 'Basement') return -1;
                const num = parseInt(floor);
                if (!isNaN(num)) return num;
                return 999;
              };
              return getFloorOrder(floorA) - getFloorOrder(floorB);
            })
            .map(([floor, floorUnits]) => (
              <div key={floor} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Floor Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-3m0 0l7-4 7 4M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M9 5h6" />
                    </svg>
                    {floor}
                    <span className="ml-2 text-xs font-normal bg-white px-2 py-0.5 rounded text-gray-600">{floorUnits.length} unit{floorUnits.length > 1 ? 's' : ''}</span>
                  </h3>
                </div>

                {/* Floor Units Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Stall Number</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Area (sqm)</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {floorUnits.map((unit) => (
                        <tr key={unit.id} className="hover:bg-blue-50/50 transition-colors duration-150">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{unit.stall_number}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{unit.unit_description || '-'}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{unit.area_sqm || '-'}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(unit))}`}>
                              {getDisplayStatus(unit).charAt(0).toUpperCase() + getDisplayStatus(unit).slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2">
                              <Link
                                href={`/admin/rights-and-rentals/property/${propertyId}/units/${unit.id}`}
                                className="text-indigo-600 hover:text-indigo-700 font-medium"
                              >
                                View
                              </Link>
                              {canEdit && (
                                <>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={() => handleEditUnitClick(unit)}
                                    className="text-blue-600 hover:text-blue-700 font-medium"
                                  >
                                    Edit
                                  </button>
                                  <span className="text-gray-300">|</span>
                                  <button
                                    onClick={() => handleDeleteUnit(unit.id)}
                                    className="text-red-600 hover:text-red-700 font-medium"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-gray-600">No units added yet</p>
          {canEdit && (
            <button
              onClick={handleAddUnitClick}
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add First Unit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
