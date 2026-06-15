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
  const [bulkInput, setBulkInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    if (!bulkInput.trim()) {
      alert('Please enter unit data');
      return;
    }

    setSubmitting(true);
    try {
      // Parse bulk input - each line is a stall number, optionally with floor level, description
      // Format: stall_number | floor_level | unit_description | area_sqm
      const lines = bulkInput.trim().split('\n');
      const unitsToCreate: any[] = [];
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const parts = line.split('|').map(p => p.trim());
        const stallNumber = parts[0];
        
        if (!stallNumber) continue;
        
        unitsToCreate.push({
          stall_number: stallNumber,
          floor_level: parts[1] || null,
          unit_description: parts[2] || null,
          area_sqm: parts[3] ? parseFloat(parts[3]) : null,
          status: 'available'
        });
      }

      if (unitsToCreate.length === 0) {
        alert('No valid units found in the input');
        return;
      }

      // Create all units
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
        alert(`Successfully created ${successCount} units`);
      }

      setShowBulkAdd(false);
      setBulkInput('');
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
              onClick={() => setShowBulkAdd(true)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bulk Add Units</h3>
            <p className="text-sm text-gray-600 mb-4">Enter one unit per line. Format: Stall Number | Floor Level | Description | Area (sqm)</p>
            
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Example:</strong><br/>
                Stall A | Ground | Office | 50<br/>
                101 | 1st Floor | Retail | 75<br/>
                102 | 1st Floor | Storage |
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Unit Data *</label>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                placeholder="Stall A | Ground | Office | 50&#10;101 | 1st Floor | Retail | 75"
                rows={8}
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowBulkAdd(false);
                  setBulkInput('');
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
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
