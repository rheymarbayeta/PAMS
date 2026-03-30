'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';

interface ReportRecord {
  application_id: string;
  application_number: string;
  entity_id: string;
  permit_type_id: string;
  permit_type_name: string;
  status: string;
  created_at: string;
  entity_name: string;
  business_name: string;
  owner_name: string;
  address: string;
  total_amount_due: number;
  total_balance_due: number;
  attribute_id: string;
  attribute_name: string;
}

interface Attribute {
  attribute_id: string;
  attribute_name: string;
}

interface ReportSummary {
  totalRecords: number;
  totalAmount: number;
  byStatus: Array<{ status: string; count: number }>;
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportRecord[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedAttribute, setSelectedAttribute] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');

  // Jasper report generation state
  const [generatingFormat, setGeneratingFormat] = useState<string | null>(null);
  const [jasperError, setJasperError] = useState<string | null>(null);

  // Fetch attributes for filter
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const response = await api.get('/reports/filter-options/attributes');
        if (response.data.success) {
          setAttributes(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching attributes:', err);
      }
    };

    fetchAttributes();
  }, []);

  // Fetch report data
  const fetchReportData = async (filters?: {
    attributeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};

      const attrId = filters?.attributeId ?? selectedAttribute;
      const start = filters?.startDate ?? startDate;
      const end = filters?.endDate ?? endDate;
      const statusVal = filters?.status ?? status;

      if (attrId) params.attributeId = attrId;
      if (start) params.startDate = start;
      if (end) params.endDate = end;
      if (statusVal) params.status = statusVal;

      const [reportRes, summaryRes] = await Promise.all([
        api.get('/reports', { params }),
        api.get('/reports/summary', { params })
      ]);

      if (reportRes.data.success) {
        setReportData(reportRes.data.data);
        console.log('');
        console.log('%c📊 REPORT DATA FETCHED', 'font-size: 16px; font-weight: bold; color: #2563eb;');
        console.log('================================================');
        console.log('Total Records:', reportRes.data.count);
        console.log('Full Response:', reportRes.data);
        
        if (reportRes.data.data.length > 0) {
          console.log('');
          console.log('%cFirst Record Details:', 'font-weight: bold; color: #16a34a;');
          console.table(reportRes.data.data[0]);
          
          console.log('');
          console.log('%cField Verification:', 'font-weight: bold; color: #ea580c;');
          const firstRecord = reportRes.data.data[0];
          console.log('  ✓ application_number:', firstRecord.application_number ?? '❌ MISSING');
          console.log('  ✓ business_name:', firstRecord.business_name ?? '❌ MISSING');
          console.log('  ✓ entity_name:', firstRecord.entity_name ?? '❌ MISSING');
          console.log('  ✓ address:', firstRecord.address ? '✅ Present (' + firstRecord.address.substring(0, 40) + '...)' : '❌ MISSING');
          console.log('  ✓ permit_type_name:', firstRecord.permit_type_name ?? '❌ MISSING');
          console.log('  ✓ attribute_name:', firstRecord.attribute_name ?? '❌ MISSING');
          console.log('  ✓ total_amount_due:', firstRecord.total_amount_due ?? '❌ MISSING');
          console.log('  ✓ total_balance_due:', firstRecord.total_balance_due ?? '❌ MISSING');
          console.log('  ✓ status:', firstRecord.status ?? '❌ MISSING');
          console.log('  ✓ created_at:', firstRecord.created_at ?? '❌ MISSING');
          
          console.log('');
          console.log('%cAll Records:', 'font-weight: bold; color: #7c3aed;');
          console.table(reportRes.data.data.map((r: any) => ({
            'App #': r.application_number,
            'Name': r.business_name || r.entity_name,
            'Permit Type': r.permit_type_name,
            'Attribute': r.attribute_name,
            'Amount': r.total_amount_due,
            'Status': r.status
          })));
        } else {
          console.log('%c⚠️ No records found!', 'color: #dc2626; font-weight: bold;');
        }
        console.log('================================================');
        console.log('');
      }

      if (summaryRes.data.success) {
        setSummary(summaryRes.data.summary);
        console.log('');
        console.log('%c📈 REPORT SUMMARY FETCHED', 'font-size: 16px; font-weight: bold; color: #9333ea;');
        console.log('================================================');
        console.log('Summary Data:', summaryRes.data.summary);
        console.log('Total Records:', summaryRes.data.summary.totalRecords);
        console.log('Total Amount:', summaryRes.data.summary.totalAmount);
        console.log('Status Breakdown:', summaryRes.data.summary.byStatus);
        console.table(summaryRes.data.summary.byStatus);
        console.log('================================================');
        console.log('');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch report data';
      setError(errorMessage);
      console.error('');
      console.error('%c❌ ERROR FETCHING REPORT DATA', 'font-size: 14px; font-weight: bold; color: #dc2626;');
      console.error('================================================');
      console.error('Error Message:', errorMessage);
      console.error('Full Error:', err);
      console.error('Error Stack:', err instanceof Error ? err.stack : 'N/A');
      console.error('================================================');
      console.error('');
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchReportData();
  }, []);

  // Apply filters
  const handleApplyFilters = () => {
    fetchReportData({
      attributeId: selectedAttribute,
      startDate,
      endDate,
      status
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSelectedAttribute('');
    setStartDate('');
    setEndDate('');
    setStatus('');

    setTimeout(() => {
      fetchReportData({
        attributeId: '',
        startDate: '',
        endDate: '',
        status: ''
      });
    }, 0);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['App #', 'Name', 'Address', 'Permit Type', 'Attribute', 'Status', 'Amount', 'Date'];
    
    const rows = reportData.map(record => [
      record.application_number || '',
      record.business_name || record.entity_name || '',
      record.address || '',
      record.permit_type_name || '',
      record.attribute_name || '',
      record.status,
      record.total_amount_due || '0',
      new Date(record.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Generate Jasper Report
  const handleGenerateJasperReport = async (format: 'pdf' | 'html' | 'csv' | 'xlsx') => {
    if (reportData.length === 0) {
      setJasperError('No data to export. Please apply filters or ensure data exists.');
      setTimeout(() => setJasperError(null), 3000);
      return;
    }

    try {
      setGeneratingFormat(format);
      setJasperError(null);

      // Call the backend report generation endpoint
      const response = await api.post('/reports/generate', {
        templateName: 'applications',
        format: format,
        attributeId: selectedAttribute || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        statusFilter: status || undefined
      }, {
        responseType: 'blob' // Important: get response as blob for file download
      });

      // Create a blob URL and download
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Determine file extension and proper MIME type
      let fileName = `report_${new Date().toISOString().split('T')[0]}`;
      const responseHeaders = response.headers['content-disposition'];
      
      if (responseHeaders) {
        const match = responseHeaders.match(/filename="?(.+?)"?$/);
        if (match) fileName = match[1];
      } else {
        fileName += format === 'xlsx' ? '.xlsx' : `.${format}`;
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Report generated successfully in ${format.toUpperCase()} format`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate report';
      setJasperError(`Error generating ${format.toUpperCase()} report: ${errorMsg}`);
      console.error('Report generation error:', err);
      setTimeout(() => setJasperError(null), 5000);
    } finally {
      setGeneratingFormat(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'Assessed':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'Pending Approval':
        return 'bg-orange-100 text-orange-800 border border-orange-300';
      case 'Approved':
      case 'Paid':
      case 'Issued':
      case 'Released':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  return (
    <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Viewer', 'Assessor', 'Approver']}>
      <Layout>
        <div className="p-6 bg-gray-50 min-h-screen">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 Reports</h1>
            <p className="text-gray-600">View and analyze permit applications with flexible filtering options</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              ⚠️ {error}
            </div>
          )}

          {/* Filter Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>🔍</span> Filter Options
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Attribute Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attribute</label>
                <select
                  value={selectedAttribute}
                  onChange={(e) => setSelectedAttribute(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Attributes</option>
                  {attributes.map(attr => (
                    <option key={attr.attribute_id} value={attr.attribute_id}>
                      {attr.attribute_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Assessed">Assessed</option>
                  <option value="Pending Approval">Pending Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="Issued">Issued</option>
                  <option value="Released">Released</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-between">
              <div className="flex gap-3">
                <button
                  onClick={handleApplyFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                >
                  ✓ Apply Filters
                </button>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium flex items-center gap-2"
                >
                  ↻ Reset
                </button>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
              >
                ⬇ Export CSV
              </button>
            </div>
          </div>

          {/* Jasper Report Generation Section */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg shadow-md p-6 mb-6 border border-indigo-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>📄</span> Generate Professional Report (Jasper)
            </h2>

            {jasperError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                <span>⚠️</span>
                <span>{jasperError}</span>
              </div>
            )}

            <p className="text-gray-700 text-sm mb-4">
              Generate and download reports in your preferred format with all current filters applied.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleGenerateJasperReport('html')}
                disabled={generatingFormat !== null}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {generatingFormat === 'html' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>🌐</span> HTML Report
                  </>
                )}
              </button>

              <button
                onClick={() => handleGenerateJasperReport('pdf')}
                disabled={generatingFormat !== null}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {generatingFormat === 'pdf' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>📕</span> PDF Report
                  </>
                )}
              </button>

              <button
                onClick={() => handleGenerateJasperReport('csv')}
                disabled={generatingFormat !== null}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {generatingFormat === 'csv' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>📊</span> CSV Report
                  </>
                )}
              </button>

              <button
                onClick={() => handleGenerateJasperReport('xlsx')}
                disabled={generatingFormat !== null}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg transition font-medium flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                {generatingFormat === 'xlsx' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <span>📗</span> Excel Report
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-600 mt-4 italic">
              💡 Tip: HTML reports can be viewed in your browser and printed to PDF. PDF reports can be printed directly.
            </p>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-300 shadow-sm">
                <p className="text-sm text-blue-700 font-medium mb-1">Total Records</p>
                <p className="text-3xl font-bold text-blue-900">{summary.totalRecords}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-300 shadow-sm">
                <p className="text-sm text-green-700 font-medium mb-1">Total Amount</p>
                <p className="text-3xl font-bold text-green-900">₱{summary.totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-300 shadow-sm">
                <p className="text-sm text-purple-700 font-medium mb-2">Status Breakdown</p>
                <div className="space-y-1">
                  {summary.byStatus.slice(0, 3).map(item => (
                    <p key={item.status} className="text-xs text-purple-800">
                      <span className="font-semibold">{item.status}:</span> {item.count}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Data Table Section */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading report data...</p>
              </div>
            ) : reportData.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 text-lg">📋 No records found matching your filters</p>
                <p className="text-gray-400 text-sm mt-2">Try adjusting your filter criteria</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">App #</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Address</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Permit Type</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Attribute</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.map((record, idx) => (
                      <tr key={record.application_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-blue-600">
                          {record.application_number || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {record.business_name || record.entity_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {record.address ? record.address.substring(0, 40) + (record.address.length > 40 ? '...' : '') : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {record.permit_type_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {record.attribute_name || '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                          ₱{(record.total_amount_due || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(record.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          {reportData.length > 0 && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 text-center">
              <p className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{reportData.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{summary?.totalRecords || 0}</span> records
              </p>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
