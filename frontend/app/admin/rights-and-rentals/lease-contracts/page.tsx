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

export default function LeaseContractsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<LeaseContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [properties, setProperties] = useState<{ id: number; property_name: string }[]>([]);
  const [units, setUnits] = useState<{ id: number; stall_number: string; property_id: number }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
  
  // Bulk billing states
  const [showBulkBillingModal, setShowBulkBillingModal] = useState(false);
  const [bulkBillingMonth, setBulkBillingMonth] = useState<number>(new Date().getMonth() + 1);
  const [bulkBillingYear, setBulkBillingYear] = useState<number>(new Date().getFullYear());
  const [bulkBillingHTML, setBulkBillingHTML] = useState<string>('');
  const [bulkBillingLoading, setBulkBillingLoading] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProperty, selectedUnit]);

  useEffect(() => {
    fetchContracts();
    fetchProperties();
    fetchUnits();
  }, []);

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

  const fetchUnits = async () => {
    try {
      const response = await api.get('/api/rights-and-rentals/properties');
      // Flatten all units from all properties
      const allUnits = (response.data || []).flatMap((prop: any) =>
        (prop.units || []).map((unit: any) => ({
          id: unit.id,
          stall_number: unit.stall_number,
          property_id: prop.id
        }))
      );
      setUnits(allUnits);
    } catch (error) {
      console.error('Error fetching units:', error);
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

  const generateBulkBilling = async () => {
    if (filteredContracts.length === 0) {
      showAlert('No contracts to generate billing for', 'Info');
      return;
    }

    setBulkBillingLoading(true);
    try {
      // Fetch billing data for each filtered contract
      const billingDataPromises = filteredContracts.map(contract =>
        api.get(`/api/rights-and-rentals/lease-contracts/${contract.id}/billing?month=${bulkBillingMonth}&year=${bulkBillingYear}`)
          .then(res => ({
            contract,
            billing: res.data
          }))
          .catch(err => ({
            contract,
            billing: null,
            error: err
          }))
      );

      const billingResults = await Promise.all(billingDataPromises);
      const validBilling = billingResults.filter(r => r.billing);

      if (validBilling.length === 0) {
        showAlert('Could not fetch billing data for contracts', 'Error');
        setBulkBillingLoading(false);
        return;
      }

      // Generate HTML with 2 statements per page
      const html = generateBulkBillingHTML(validBilling, bulkBillingMonth, bulkBillingYear);
      setBulkBillingHTML(html);
      setShowBulkBillingModal(true);
    } catch (error) {
      console.error('Error generating bulk billing:', error);
      showAlert('Error generating bulk billing', 'Error');
    } finally {
      setBulkBillingLoading(false);
    }
  };

  const generateBulkBillingHTML = (billingResults: any[], month: number, year: number): string => {
    const statements = billingResults.map(r => ({
      contract: r.contract,
      billing: r.billing
    }));

    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulk Billing Statements</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; background: white; }
    .page { width: 210mm; height: 297mm; margin: 0; padding: 0; page-break-after: always; display: flex; flex-direction: column; }
    .statement-wrapper { height: 148.5mm; padding: 8mm; border: 1px solid #ddd; page-break-inside: avoid; display: flex; flex-direction: column; font-size: 11px; }
    
    .billing-header { text-align: center; margin-bottom: 6px; line-height: 1.2; }
    .billing-header-title { font-size: 10px; font-weight: bold; color: #000; }
    .billing-header-subtitle { font-size: 9px; color: #333; }
    .billing-header-office { font-size: 11px; font-weight: bold; color: #000; margin: 2px 0; }
    .billing-header-tel { font-size: 8px; color: #666; }
    
    .billing-location { display: flex; gap: 10mm; margin: 6px 0; font-size: 9px; }
    .location-left { flex: 1; }
    .location-left-title { font-weight: bold; margin-bottom: 2px; }
    .location-right { text-align: right; }
    .location-right-number { font-weight: bold; }
    
    .lessee-info { margin: 4px 0; font-size: 9px; }
    .lessee-name { font-weight: bold; font-size: 10px; }
    .lessee-space { font-size: 8px; color: #666; }
    
    .amount-due-box { background: #f0f0f0; padding: 4px 8px; margin: 4px 0; display: flex; justify-content: space-between; align-items: center; border: 1px solid #ddd; }
    .amount-due-label { font-weight: bold; font-size: 9px; }
    .amount-due-value { font-size: 12px; font-weight: bold; color: #1e40af; min-width: 50px; text-align: right; }
    
    .due-date { font-size: 8px; margin: 2px 0; }
    
    .note { font-size: 7px; color: #666; margin: 2px 0; font-style: italic; }
    
    .monthly-table { width: 100%; border-collapse: collapse; font-size: 8px; margin: 4px 0; }
    .monthly-table th { background: #e5e7eb; padding: 2px 4px; text-align: left; font-weight: bold; border: 1px solid #ccc; }
    .monthly-table td { padding: 2px 4px; border: 1px solid #ccc; }
    .monthly-table .label { width: 60%; }
    .monthly-table .amount { width: 40%; text-align: right; }
    
    @media print {
      body { margin: 0; padding: 0; background: white; }
      .page { margin: 0; page-break-after: always; }
      .statement-wrapper { page-break-inside: avoid; margin: 0; }
    }
  </style>
</head>
<body>
`;

    // Group statements into pairs for A4 pages
    for (let i = 0; i < statements.length; i += 2) {
      html += '<div class="page">';
      
      // First statement
      html += generateStatementHTML(statements[i], month, year);
      
      // Second statement (if exists)
      if (i + 1 < statements.length) {
        html += generateStatementHTML(statements[i + 1], month, year);
      }
      
      html += '</div>';
    }

    html += '</body></html>';
    return html;
  };

  const generateStatementHTML = (data: any, month: number, year: number): string => {
    const { contract, billing } = data;
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const fmt = (n: number) => {
      return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const dueDate = billing?.due_date 
      ? new Date(billing.due_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : `${monthShort[month - 1]}. 30, ${year}`;

    const totalAmount = (billing?.monthly_rights_amount || 0) + (billing?.monthly_rental_amount || 0);
    const billingNumber = `MPM-${year}-${String(month).padStart(2, '0')}-${String(contract.id).padStart(3, '0')}`;
    
    // Date range for the period
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const dateRange = `${monthShort[month - 1]} 1-${endDate.getDate()}, ${year}`;

    return `
    <div class="statement-wrapper">
      <div class="billing-header">
        <div class="billing-header-title">REPUBLIC OF THE PHILIPPINES</div>
        <div class="billing-header-subtitle">MUNICIPALITY OF DALAGUETE</div>
        <div class="billing-header-subtitle">PROVINCE OF CEBU</div>
        <div class="billing-header-office">MUNICIPAL TREASURER'S OFFICE</div>
        <div class="billing-header-tel">Tel. # 520 4141 loc. 309</div>
      </div>

      <div class="billing-location">
        <div class="location-left">
          <div class="location-left-title">${contract.property_name}</div>
          <div>${contract.property_name}</div>
        </div>
        <div class="location-right">
          <div class="location-right-number">BILLING STATEMENT No.</div>
          <div style="font-weight: bold;">${billingNumber}</div>
        </div>
      </div>

      <div style="text-align: right; font-size: 8px; margin: 2px 0;">
        As of ${dateRange}
      </div>

      <div class="lessee-info">
        <div class="lessee-name">${contract.lessee_name}</div>
        <div class="lessee-space">SPACE No: ${contract.id}</div>
      </div>

      <div class="amount-due-box">
        <div class="amount-due-label">TOTAL AMOUNT DUE:</div>
        <div class="amount-due-value">₱ ${fmt(totalAmount)}</div>
      </div>

      <div class="due-date">
        <strong>PAYMENT DUE DATE:</strong> ${dueDate}
      </div>
      <div class="note">
        Note: 20% surcharge for late payments.
      </div>

      <div style="font-size: 8px; text-align: center; font-weight: bold; margin: 3px 0; letter-spacing: 2px;">
        MONTHLY RENTALS
      </div>

      <table class="monthly-table">
        <tbody>
          <tr>
            <td class="label">BALANCE (${monthShort[Math.max(0, month - 2)]} ${year}):</td>
            <td class="amount">₱ ${fmt(billing?.previous_balance || 0)}</td>
          </tr>
          <tr>
            <td class="label">Surcharge (20%)</td>
            <td class="amount">₱ ${fmt(billing?.surcharge || 0)}</td>
          </tr>
          <tr style="background: #f9fafb;">
            <td class="label"><strong>This Month (${monthShort[month - 1]} ${year}):</strong></td>
            <td class="amount"><strong>₱ ${fmt(billing?.monthly_rental_amount || 0)}</strong></td>
          </tr>
          <tr>
            <td class="label">Less: Late Payment</td>
            <td class="amount">₱ ${fmt(billing?.late_payment_discount || 0)}</td>
          </tr>
          <tr style="border-top: 2px solid #000; font-weight: bold;">
            <td class="label">Monthly Rental:</td>
            <td class="amount">₱ ${fmt(totalAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `;
  };

  const downloadBillingPDF = async () => {
    try {
      // Create a temporary link and download
      const element = document.createElement('a');
      const file = new Blob([bulkBillingHTML], { type: 'text/html' });
      element.href = URL.createObjectURL(file);
      element.download = `bulk-billing-${bulkBillingMonth}-${bulkBillingYear}.html`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      showAlert('Error downloading billing', 'Error');
    }
  };

  const printBulkBilling = () => {
    const printWindow = window.open('', '', 'width=1000,height=600');
    if (printWindow) {
      printWindow.document.write(bulkBillingHTML);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const userRoles = user?.roles || [user?.role_name];
  const canEdit = userRoles.some(role => role && role !== 'Viewer');

  const filteredContracts = contracts.filter(c => {
    // Search filter (lessee or property name)
    const searchMatch = c.lessee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.property_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Property filter
    const propertyMatch = !selectedProperty || c.property_name === selectedProperty;
    
    // Unit filter - need to check if contract has the selected unit
    let unitMatch = !selectedUnit;
    if (selectedUnit && c.property_units && c.property_units.length > 0) {
      unitMatch = c.property_units.some(unit => unit.stall_number === selectedUnit);
    }
    
    return searchMatch && propertyMatch && unitMatch;
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
                      setSelectedUnit(''); // Reset unit filter when property changes
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Property Unit</label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">All Units</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.stall_number}>
                        {unit.stall_number}
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
          {showBulkBillingModal && !bulkBillingHTML && (
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
                    onClick={() => setShowBulkBillingModal(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateBulkBilling}
                    disabled={bulkBillingLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {bulkBillingLoading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Billing Display Modal */}
          {bulkBillingHTML && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full h-full flex flex-col mx-4 my-4">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Bulk Billing Statements</h2>
                  <p className="text-sm text-gray-600">{filteredContracts.length} contracts - {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][bulkBillingMonth - 1]} {bulkBillingYear}</p>
                </div>
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                  <iframe
                    srcDoc={bulkBillingHTML}
                    className="w-full h-full bg-white"
                    title="Bulk Billing Preview"
                  />
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-between">
                  <button
                    onClick={() => {
                      setBulkBillingHTML('');
                      setShowBulkBillingModal(true);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={printBulkBilling}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4H9m20 0H3" />
                      </svg>
                      Print
                    </button>
                    <button
                      onClick={downloadBillingPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                    <button
                      onClick={() => setBulkBillingHTML('')}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
