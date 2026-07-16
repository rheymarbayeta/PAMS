'use client';

import { formatCurrency } from '@/utils/formatters';
import type { CitationListItem } from './constants';

type ViewMode = 'list' | 'grid' | 'table';

function paymentStatusClass(status: string) {
  if (status === 'Paid') return 'bg-green-100 text-green-800';
  if (status === 'Pending') return 'bg-yellow-100 text-yellow-800';
  if (status === 'Partially Paid' || status === 'Installment') return 'bg-orange-100 text-orange-800';
  return 'bg-blue-100 text-blue-800';
}

export function CitationListPanel({
  loading,
  citations,
  paginatedCitations,
  filteredCount,
  listSearchTerm,
  onSearchChange,
  onClearSearch,
  viewMode,
  onViewModeChange,
  recordsPerPage,
  onRecordsPerPageChange,
  currentPage,
  totalPages,
  onPageChange,
  pageWindow,
  onSelect,
}: {
  loading: boolean;
  citations: CitationListItem[];
  paginatedCitations: CitationListItem[];
  filteredCount: number;
  listSearchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  recordsPerPage: number;
  onRecordsPerPageChange: (n: number) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageWindow: Array<number | null>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-slate-200">
        <svg className="h-5 w-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search by ticket number or driver name..."
          value={listSearchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm"
        />
        {listSearchTerm && (
          <button onClick={onClearSearch} className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Clear search">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-auto flex-shrink-0">
          {(['list', 'grid', 'table'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`p-1.5 rounded-md transition-all duration-200 ${
                viewMode === mode ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
              }`}
              title={`${mode} view`}
            >
              <span className="sr-only">{mode}</span>
              {mode === 'list' && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              )}
              {mode === 'grid' && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              )}
              {mode === 'table' && (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {filteredCount > 0 && (
        <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              Showing <span className="font-semibold">{Math.min(recordsPerPage, filteredCount)}</span> records per page out of{' '}
              <span className="font-semibold">{filteredCount}</span> total
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="records-per-page-selector" className="text-sm font-medium text-slate-700">
                Records per page:
              </label>
              <select
                id="records-per-page-selector"
                value={recordsPerPage}
                onChange={(e) => onRecordsPerPageChange(Number(e.target.value))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:border-slate-800 focus:ring-2 focus:ring-slate-300 transition-all outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-600">
              Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {pageWindow.map((pageNum, idx) =>
                pageNum === null ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-2 text-sm text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      currentPage === pageNum
                        ? 'bg-slate-800 text-white'
                        : 'border border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <div className="inline-flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-slate-200 border-t-slate-600 animate-spin" />
          </div>
          <p className="mt-2 text-slate-600">Loading citations...</p>
        </div>
      ) : citations.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-600">
          No citations found. Create a new citation to get started.
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Ticket #</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Driver Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Plate Number</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Fine Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Payment Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedCitations.map((citation) => (
                <tr
                  key={citation.citation_id}
                  onClick={() => onSelect(citation.citation_id)}
                  className="hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{citation.ticket_number}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{citation.driver_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{citation.plate_number}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    ₱{formatCurrency(Number(citation.fine_amount) || 0)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${paymentStatusClass(citation.payment_status)}`}>
                      {citation.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {new Date(citation.violation_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCitations.map((citation) => (
            <div
              key={citation.citation_id}
              onClick={() => onSelect(citation.citation_id)}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 cursor-pointer transition-all duration-200 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold text-slate-800">{citation.ticket_number}</span>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusClass(citation.payment_status)}`}>
                  {citation.payment_status}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-medium text-slate-700 truncate">{citation.driver_name}</p>
                <p>{citation.plate_number}</p>
                <p>{new Date(citation.violation_date).toLocaleDateString()}</p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">{citation.issued_by_name}</span>
                <span className="text-sm font-semibold text-slate-800">
                  ₱{formatCurrency(Number(citation.fine_amount) || 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-200">
            {paginatedCitations.map((citation) => (
              <li
                key={citation.citation_id}
                onClick={() => onSelect(citation.citation_id)}
                className="px-4 sm:px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{citation.ticket_number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusClass(citation.payment_status)}`}>
                        {citation.payment_status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700 font-medium">{citation.driver_name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <span>{citation.plate_number}</span>
                      <span>•</span>
                      <span>{new Date(citation.violation_date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{citation.issued_by_name}</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 flex-shrink-0">
                    ₱{formatCurrency(Number(citation.fine_amount) || 0)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
