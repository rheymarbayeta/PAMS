'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Pagination from '@/components/Pagination';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert, showConfirm } from '@/utils/modal';

interface LeaseContract {
  id: number;
  lessee_name: string;
  property_name: string;
  contract_effective_date: string;
  contract_termination_date: string | null;
  principal_amount: number;
  monthly_rights_amount: number;
  monthly_rental_amount: number;
  downpayment: number;
  status: string;
  property_units?: { id: number; stall_number: string; floor_level: string; unit_description: string; area_sqm: number | null; status: string }[];
}

const NO_FLOOR_LABEL = 'No Floor Assigned';

function getFloorLabel(floorLevel: string | null | undefined): string {
  return floorLevel || NO_FLOOR_LABEL;
}

export default function LeaseContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<LeaseContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedFloorLevel, setSelectedFloorLevel] = useState<string>('');
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([]);
  const [floorLevels, setFloorLevels] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
  
  // Bulk billing states
  const [showBulkBillingModal, setShowBulkBillingModal] = useState(false);
  const [bulkBillingMonth, setBulkBillingMonth] = useState<number>(new Date().getMonth() + 1);
  const [bulkBillingYear, setBulkBillingYear] = useState<number>(new Date().getFullYear());
  const [bulkBillingUrl, setBulkBillingUrl] = useState<string>('');

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProperty, selectedFloorLevel]);

  useEffect(() => {
    fetchContracts();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (!selectedProperty) {
      setFloorLevels([]);
      return;
    }
    const property = properties.find(p => p.property_name === selectedProperty);
    if (!property) {
      setFloorLevels([]);
      return;
    }
    fetchFloorLevelsForProperty(property.id);
  }, [selectedProperty, properties]);

  const fetchContracts = async () => {
    try {
      const response = await api.get('/api/rights-and-rentals/lease-contracts');
      setContracts(response.data);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/rights-and-rentals/properties');
      setProperties(response.data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchFloorLevelsForProperty = async (propertyId: number) => {
    try {
      const response = await api.get(`/api/rights-and-rentals/properties/${propertyId}/units`);
      const floors = new Set<string>();
      (response.data || []).forEach((unit: { floor_level: string | null }) => {
        floors.add(getFloorLabel(unit.floor_level));
      });
      setFloorLevels(Array.from(floors).sort((a, b) => a.localeCompare(b)));
    } catch (error) {
      console.error('Error fetching floor levels:', error);
      setFloorLevels([]);
    }
  };

  const handleDelete = async (contractId: number) => {
    showConfirm(
      'Are you sure you want to delete this lease contract? This action cannot be undone.',
      'Confirm Delete',
      async () => {
        try {
          await api.delete(`/api/rights-and-rentals/lease-contracts/${contractId}`);
          fetchContracts();
        } catch (error: any) {
          showAlert(error.response?.data?.error || 'Error deleting lease contract', 'Error');
        }
      },
      undefined,
      { isDangerous: true }
    );
  };

  const generateBulkBilling = () => {
    if (filteredContracts.length === 0) {
      showAlert('No contracts to generate billing for', 'Info');
      return;
    }

    const token = localStorage.getItem('token') || '';
    const ids = filteredContracts.map(c => c.id).join(',');
    const url = `/bulk-billing-statements.html?ids=${ids}&month=${bulkBillingMonth}&year=${bulkBillingYear}&token=${encodeURIComponent(token)}&_v=${Date.now()}`;
    setBulkBillingUrl(url);
  };

  const closeBulkBillingPreview = () => {
    setBulkBillingUrl('');
    setShowBulkBillingModal(false);
  };

  const closeBulkBilling = () => {
    setShowBulkBillingModal(false);
    setBulkBillingUrl('');
  };

  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  const filteredContracts = contracts.filter(c => {
    // Search filter (lessee or property name)
    const searchMatch = c.lessee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.property_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Property filter
    const propertyMatch = !selectedProperty || c.property_name === selectedProperty;
    
    // Floor level filter
    let floorMatch = !selectedFloorLevel;
    if (selectedFloorLevel && c.property_units && c.property_units.length > 0) {
      floorMatch = c.property_units.some(unit => getFloorLabel(unit.floor_level) === selectedFloorLevel);
    }
    
    return searchMatch && propertyMatch && floorMatch;
  });

  const totalPages = Math.ceil(filteredContracts.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedContracts = filteredContracts.slice(startIndex, endIndex);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP'
    }).format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Assessor', 'Rights and Rentals Manager']}>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading lease contracts...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Assessor', 'Rights and Rentals Manager']}>
      <Layout>
        <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Lease Contracts</h1>
                  <p className="text-gray-600">{contracts.length} contracts</p>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {filteredContracts.length > 0 && (
                    <button
                      onClick={() => setShowBulkBillingModal(true)}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      title="Generate bulk billing for filtered contracts"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate Bulk Billing
                    </button>
                  )}
                  <Link
                    href="/admin/rights-and-rentals/lease-contracts/add"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Contract
                  </Link>
                </div>
              )}
            </div>

            {/* Search and Filter */}
            <div className="space-y-3">
              {/* Search box */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search by lessee or property name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <svg className="absolute right-3 top-3 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Property and Unit filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Property</label>
                  <select
                    value={selectedProperty}
                    onChange={(e) => {
                      setSelectedProperty(e.target.value);
                      setSelectedFloorLevel(''); // Reset unit filter when property changes
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">All Properties</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.property_name}>
                        {prop.property_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Floor Level</label>
                  <select
                    value={selectedFloorLevel}
                    onChange={(e) => setSelectedFloorLevel(e.target.value)}
                    disabled={!selectedProperty}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">{selectedProperty ? 'All Floor Levels' : 'Select a property first'}</option>
                    {floorLevels.map(floor => (
                      <option key={floor} value={floor}>
                        {floor}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Records Info */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredContracts.length)} of {filteredContracts.length} contracts
            </p>
            <select
              value={recordsPerPage}
              onChange={(e) => {
                setRecordsPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            {paginatedContracts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-gray-600">No lease contracts found</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Lessee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Property</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Effective Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Monthly Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedContracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{contract.lessee_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {contract.property_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {formatDate(contract.contract_effective_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="text-sm text-gray-600">
                            Rights: {formatCurrency(contract.monthly_rights_amount)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Rental: {formatCurrency(contract.monthly_rental_amount)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <Link
                          href={`/admin/rights-and-rentals/lease-contracts/${contract.id}`}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View
                        </Link>
                        {canEdit && (
                          <>
                            <span className="text-gray-300">|</span>
                            <Link
                              href={`/admin/rights-and-rentals/lease-contracts/${contract.id}/edit`}
                              className="text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                              Edit
                            </Link>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleDelete(contract.id)}
                              className="text-red-600 hover:text-red-900 font-medium"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-6">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>

          {/* Bulk Billing Modal - Month/Year Selection */}
          {showBulkBillingModal && !bulkBillingUrl && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900">Generate Bulk Billing</h2>
                  <p className="text-sm text-gray-600">Selected contracts: {filteredContracts.length}</p>
                </div>
                <div className="px-6 py-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                    <select
                      value={bulkBillingMonth}
                      onChange={(e) => setBulkBillingMonth(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                        return <option key={i + 1} value={i + 1}>{monthNames[i]}</option>;
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={bulkBillingYear}
                      onChange={(e) => setBulkBillingYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      min={2020}
                      max={2099}
                    />
                  </div>
                  <p className="text-xs text-gray-600">Billing statements will be formatted with 2 statements per A4 page</p>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                  <button
                    onClick={closeBulkBilling}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateBulkBilling}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Billing Preview Modal */}
          {bulkBillingUrl && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4">
              <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-5xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Bulk Billing Statements</h3>
                    <p className="text-sm text-gray-600">
                      {filteredContracts.length} contracts — {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][bulkBillingMonth - 1]} {bulkBillingYear}
                    </p>
                  </div>
                  <button
                    onClick={closeBulkBillingPreview}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <iframe
                    src={bulkBillingUrl}
                    className="w-full h-full border-0"
                    title="Bulk Billing Statements"
                  />
                </div>
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => {
                      setBulkBillingUrl('');
                      setShowBulkBillingModal(true);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={closeBulkBillingPreview}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
