'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/utils/formatters';

interface CitationDetails {
  citation_id: string;
  ticket_number: string;
  driver_name: string;
  driver_address: string;
  driver_contact: string;
  license_number: string;
  license_expiry: string;
  vehicle_type: string;
  vehicle_color: string;
  plate_number: string;
  vehicle_registration: string;
  vehicle_owner: string;
  owner_name: string;
  owner_address: string;
  owner_contact: string;
  violations: string | string[];
  other_violations: string;
  violation_location: string;
  violation_time: string;
  violation_date: string;
  remarks: string;
  fine_amount: number;
  payment_status: string;
  enforcer_id: string;
  enforcer_name: string;
  enforcer_badge: string;
  enforcer_signature: string;
  witness_name: string;
  witness_signature: string;
  supervisor_name: string;
  supervisor_signature: string;
  seal_stamp: string;
  is_completed: boolean;
  issued_by_name: string;
  created_at: string;
  updated_at: string;
}

interface PaymentRecord {
  payment_id: string;
  amount_paid: number;
  payment_method: string;
  payment_date: string;
  receipt_number: string;
  notes: string;
}

interface AuditTrailRecord {
  log_id: string;
  action: string;
  details: string;
  timestamp: string;
  user_name: string;
  user_email: string;
}

const VIOLATIONS = [
  "No Driver's License",
  'Over Pricing (Allowable Fare Rates)',
  'Not in Proper Clothes/Personal Hygiene',
  'Under the Influence of Liquor or Drugs',
  'Smoking while Driving',
  'Use of Cellular Phone or Other Gadgets',
  'Failure to Convey Passenger',
  'Disregarding Traffic Signs, Signals & Markings',
  'Over Speeding',
  'Drag Racing',
  'Counter Flow',
  'No Protective Helmet',
  'Arrogant Driver',
  'No Registration',
  'Out of Route/Line',
  'Entering National Highway',
  'No Reflector, Side Mirror and Horn or Bell',
  'Obstruction to Traffic',
  'Overloading',
  'Illegal Parking/Loading/Unloading',
  'Cutting Trip/Not Following Route',
  'Others',
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Paid: 'bg-green-100 text-green-800 border-green-200',
    Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Installment: 'bg-blue-100 text-blue-800 border-blue-200',
    'Partially Paid': 'bg-orange-100 text-orange-800 border-orange-200',
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${
        colors[status] ?? 'bg-slate-100 text-slate-800 border-slate-200'
      }`}
    >
      {status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-800">{value || '—'}</p>
    </div>
  );
}

export default function CitationDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { user, hasRole } = useAuth();
  const citationId = params.id as string;

  const [citation, setCitation] = useState<CitationDetails | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailRecord[]>([]);
  const [enforcers, setEnforcers] = useState<{ enforcer_id: string; full_name: string; badge_number: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{
    ticketNumber: string;
    driverName: string;
    driverAddress: string;
    driverContact: string;
    licenseNumber: string;
    licenseExpiry: string;
    vehicleType: string;
    vehicleColor: string;
    plateNumber: string;
    vehicleRegistration: string;
    vehicleOwner: string;
    ownerName: string;
    ownerAddress: string;
    ownerContact: string;
    violationLocation: string;
    violationTime: string;
    violationDate: string;
    remarks: string;
    fineAmount: string;
    paymentStatus: string;
    isCompleted: boolean;
    enforcerId: string;
    enforcerName: string;
    enforcerBadge: string;
    witnessName: string;
    supervisorName: string;
    violations: string[];
    otherViolations: string;
  }>({
    ticketNumber: '',
    driverName: '',
    driverAddress: '',
    driverContact: '',
    licenseNumber: '',
    licenseExpiry: '',
    vehicleType: '',
    vehicleColor: '',
    plateNumber: '',
    vehicleRegistration: '',
    vehicleOwner: '',
    ownerName: '',
    ownerAddress: '',
    ownerContact: '',
    violationLocation: '',
    violationTime: '',
    violationDate: '',
    remarks: '',
    fineAmount: '',
    paymentStatus: '',
    isCompleted: false,
    enforcerId: '',
    enforcerName: '',
    enforcerBadge: '',
    witnessName: '',
    supervisorName: '',
    violations: [],
    otherViolations: '',
  });

  // Payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_method: 'Cash',
    receipt_number: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0],
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Payment edit state
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    receipt_number: '',
    amount_paid: '',
    payment_date: '',
  });
  const [editPaymentSaving, setEditPaymentSaving] = useState(false);

  useEffect(() => {
    if (citationId) {
      fetchCitationDetails();
      fetchAuditTrail();
    }
  }, [citationId]);

  useEffect(() => {
    api.get('/api/enforcers?limit=1000&status=Active')
      .then((r) => setEnforcers(r.data.data || []))
      .catch(() => {});
  }, []);

  const fetchCitationDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/citations/${citationId}`);
      const data: CitationDetails = response.data.data;
      setCitation(data);
      setEditData({
        ticketNumber: data.ticket_number || '',
        driverName: data.driver_name || '',
        driverAddress: data.driver_address || '',
        driverContact: data.driver_contact || '',
        licenseNumber: data.license_number || '',
        licenseExpiry: data.license_expiry || '',
        vehicleType: data.vehicle_type || '',
        vehicleColor: data.vehicle_color || '',
        plateNumber: data.plate_number || '',
        vehicleRegistration: data.vehicle_registration || '',
        vehicleOwner: data.vehicle_owner || '',
        ownerName: data.owner_name || '',
        ownerAddress: data.owner_address || '',
        ownerContact: data.owner_contact || '',
        violationLocation: data.violation_location || '',
        violationTime: data.violation_time || '',
        violationDate: data.violation_date || '',
        remarks: data.remarks || '',
        fineAmount: String(data.fine_amount) || '',
        paymentStatus: data.payment_status || '',
        isCompleted: !!data.is_completed,
        enforcerId: data.enforcer_id || '',
        enforcerName: data.enforcer_name || '',
        enforcerBadge: data.enforcer_badge || '',
        witnessName: data.witness_name || '',
        supervisorName: data.supervisor_name || '',
        violations: Array.isArray(data.violations)
          ? data.violations
          : (() => { try { return JSON.parse(data.violations as string) || []; } catch { return []; } })(),
        otherViolations: data.other_violations || '',
      });
      setPayments(response.data.payments || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch citation details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditTrail = async () => {
    try {
      setAuditLoading(true);
      const response = await api.get(`/api/citations/${citationId}/audit-trail`);
      setAuditTrail(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch audit trail:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await api.put(`/api/citations/${citationId}`, {
        ticketNumber: editData.ticketNumber,
        driverName: editData.driverName,
        driverAddress: editData.driverAddress,
        driverContact: editData.driverContact,
        licenseNumber: editData.licenseNumber,
        licenseExpiry: editData.licenseExpiry,
        vehicleType: editData.vehicleType,
        vehicleColor: editData.vehicleColor,
        plateNumber: editData.plateNumber,
        vehicleRegistration: editData.vehicleRegistration,
        vehicleOwner: editData.vehicleOwner,
        ownerName: editData.ownerName,
        ownerAddress: editData.ownerAddress,
        ownerContact: editData.ownerContact,
        violationLocation: editData.violationLocation,
        violationTime: editData.violationTime,
        violationDate: editData.violationDate,
        remarks: editData.remarks,
        paymentStatus: editData.paymentStatus,
        fineAmount: parseFloat(editData.fineAmount) || 0,
        isCompleted: editData.isCompleted,
        enforcerId: editData.enforcerId,
        enforcerName: editData.enforcerName,
        enforcerBadge: editData.enforcerBadge,
        witnessName: editData.witnessName,
        supervisorName: editData.supervisorName,
        violations: editData.violations,
        otherViolations: editData.otherViolations,
      });
      await fetchCitationDetails();
      await fetchAuditTrail();
      setIsEditing(false);
      showSuccess('Citation updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update citation');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentForm.amount_paid || parseFloat(paymentForm.amount_paid) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }
    try {
      setPaymentSaving(true);
      await api.post(`/api/citations/${citationId}/payment`, {
        amountPaid: parseFloat(paymentForm.amount_paid),
        paymentMethod: paymentForm.payment_method,
        receiptNumber: paymentForm.receipt_number,
        notes: paymentForm.notes,
        paymentDate: paymentForm.payment_date,
      });
      setPaymentForm({ amount_paid: '', payment_method: 'Cash', receipt_number: '', notes: '', payment_date: new Date().toISOString().split('T')[0] });
      setShowPaymentForm(false);
      await fetchCitationDetails();
      await fetchAuditTrail();
      showSuccess('Payment recorded successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record payment');
    } finally {
      setPaymentSaving(false);
    }
  };

  const startEditPayment = (payment: PaymentRecord) => {
    setEditingPaymentId(payment.payment_id);
    setEditPaymentForm({
      receipt_number: payment.receipt_number || '',
      amount_paid: String(payment.amount_paid),
      payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
    });
  };

  const handleSaveEditPayment = async () => {
    if (!editingPaymentId) return;
    if (!editPaymentForm.amount_paid || parseFloat(editPaymentForm.amount_paid) <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }
    try {
      setEditPaymentSaving(true);
      await api.put(`/api/citations/${citationId}/payment/${editingPaymentId}`, {
        receiptNumber: editPaymentForm.receipt_number,
        amountPaid: parseFloat(editPaymentForm.amount_paid),
        paymentDate: editPaymentForm.payment_date,
      });
      setEditingPaymentId(null);
      await fetchCitationDetails();
      await fetchAuditTrail();
      showSuccess('Payment updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update payment');
    } finally {
      setEditPaymentSaving(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteCitation = async () => {
    try {
      setDeleting(true);
      await api.delete(`/api/citations/${citationId}`);
      showSuccess('Citation deleted successfully');
      setTimeout(() => router.push('/citations'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete citation');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const parseViolations = (): string[] => {
    if (!citation?.violations) return [];
    if (Array.isArray(citation.violations)) return citation.violations as string[];
    try {
      return JSON.parse(citation.violations as string);
    } catch {
      return [];
    }
  };

  const isAdmin = hasRole(['Admin', 'SuperAdmin']);
  const canDelete = hasRole(['Admin', 'SuperAdmin', 'Citation Manager']);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-64">
            <div className="text-center">
              <div className="h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-700 animate-spin mx-auto mb-3" />
              <p className="text-slate-600 text-sm">Loading citation details...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error && !citation) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-700 font-semibold mb-1">Citation Not Found</p>
            <p className="text-slate-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 text-sm transition-colors"
            >
              Go Back
            </button>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!citation) return null;

  const violations = parseViolations();
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const fineAmount = Number(citation.fine_amount) || 0;
  const balanceDue = fineAmount - totalPaid;

  // Compute effective payment status based on actual payments
  const effectiveStatus = totalPaid <= 0
    ? (citation.payment_status === 'Paid' ? 'Pending' : citation.payment_status)
    : totalPaid >= fineAmount
      ? 'Paid'
      : 'Partially Paid';

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pb-10">
          
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-5">

          {/* Alerts */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {successMsg}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {error}
              <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-800">✕</button>
            </div>
          )}

          {/* Header */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-800">
                      Ticket #{citation.ticket_number}
                    </h1>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={effectiveStatus} />
                      <span className="text-xs px-2 py-1 rounded text-slate-600 bg-slate-100">
                        {payments.length} {payments.length === 1 ? 'payment' : 'payments'}
                      </span>
                    </div>
                    {citation.is_completed && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Completed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Issued by {citation.issued_by_name} &middot;{' '}
                    {citation.created_at
                      ? new Date(citation.created_at).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => router.back()}
                  className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  ← Back
                </button>
                {isAdmin && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Print
                </button>
                {canDelete && !isEditing && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Delete Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="bg-red-50 border-b border-red-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-red-900">Delete Citation</h3>
                  </div>
                </div>
                <div className="px-6 py-4">
                  <p className="text-slate-700 mb-2">
                    Are you sure you want to delete this citation?
                  </p>
                  <p className="text-sm text-slate-600 mb-4">
                    Ticket #{citation.ticket_number} - This action cannot be undone.
                  </p>
                  <p className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 rounded px-3 py-2">
                    ⚠️ All associated payment records will be permanently deleted.
                  </p>
                </div>
                <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteCitation}
                    disabled={deleting}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                  >
                    {deleting ? (
                      <>
                        <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>🗑️ Delete Citation</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Panel */}
          {isEditing && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
              <h2 className="text-sm font-bold text-amber-800 mb-4 uppercase tracking-wide">✏️ Edit Citation Details</h2>
              <div className="space-y-6">

                {/* Ticket Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Ticket Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Ticket Number</label>
                      <input
                        type="text"
                        value={editData.ticketNumber}
                        onChange={(e) => setEditData((p) => ({ ...p, ticketNumber: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Violation Date</label>
                      <input
                        type="date"
                        value={editData.violationDate}
                        onChange={(e) => setEditData((p) => ({ ...p, violationDate: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Driver Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Driver Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Driver Name *"
                      value={editData.driverName}
                      onChange={(e) => setEditData((p) => ({ ...p, driverName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Driver Address"
                      value={editData.driverAddress}
                      onChange={(e) => setEditData((p) => ({ ...p, driverAddress: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Driver Contact"
                      value={editData.driverContact}
                      onChange={(e) => setEditData((p) => ({ ...p, driverContact: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="License Number"
                      value={editData.licenseNumber}
                      onChange={(e) => setEditData((p) => ({ ...p, licenseNumber: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="date"
                      placeholder="License Expiry"
                      value={editData.licenseExpiry}
                      onChange={(e) => setEditData((p) => ({ ...p, licenseExpiry: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Vehicle Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Vehicle Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Vehicle Type"
                      value={editData.vehicleType}
                      onChange={(e) => setEditData((p) => ({ ...p, vehicleType: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Plate Number *"
                      value={editData.plateNumber}
                      onChange={(e) => setEditData((p) => ({ ...p, plateNumber: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Vehicle Color"
                      value={editData.vehicleColor}
                      onChange={(e) => setEditData((p) => ({ ...p, vehicleColor: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Vehicle Registration"
                      value={editData.vehicleRegistration}
                      onChange={(e) => setEditData((p) => ({ ...p, vehicleRegistration: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Vehicle Owner"
                      value={editData.vehicleOwner}
                      onChange={(e) => setEditData((p) => ({ ...p, vehicleOwner: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Owner Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Registered Owner Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Owner Name"
                      value={editData.ownerName}
                      onChange={(e) => setEditData((p) => ({ ...p, ownerName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Owner Address"
                      value={editData.ownerAddress}
                      onChange={(e) => setEditData((p) => ({ ...p, ownerAddress: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Owner Contact"
                      value={editData.ownerContact}
                      onChange={(e) => setEditData((p) => ({ ...p, ownerContact: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Violation Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Violation Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Violation Location"
                      value={editData.violationLocation}
                      onChange={(e) => setEditData((p) => ({ ...p, violationLocation: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="time"
                      value={editData.violationTime}
                      onChange={(e) => setEditData((p) => ({ ...p, violationTime: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase">Violations Committed</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-3">
                    {VIOLATIONS.map((v) => (
                      <label key={v} className="flex items-center gap-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={editData.violations.includes(v)}
                          onChange={() =>
                            setEditData((p) => ({
                              ...p,
                              violations: p.violations.includes(v)
                                ? p.violations.filter((x) => x !== v)
                                : [...p.violations, v],
                            }))
                          }
                          className="w-4 h-4 rounded border-slate-300 text-amber-600"
                        />
                        <span className="text-sm text-slate-700">{v}</span>
                      </label>
                    ))}
                  </div>
                  {editData.violations.includes('Others') && (
                    <input
                      type="text"
                      placeholder="Describe other violations"
                      value={editData.otherViolations}
                      onChange={(e) => setEditData((p) => ({ ...p, otherViolations: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  )}
                </div>

                {/* Enforcer Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Enforcer & Witness Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={editData.enforcerId}
                      onChange={(e) => {
                        const selected = enforcers.find((en) => en.enforcer_id === e.target.value);
                        setEditData((p) => ({
                          ...p,
                          enforcerId: e.target.value,
                          enforcerName: selected?.full_name || p.enforcerName,
                          enforcerBadge: selected?.badge_number || p.enforcerBadge,
                        }));
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">— Select Enforcer —</option>
                      {enforcers.map((en) => (
                        <option key={en.enforcer_id} value={en.enforcer_id}>
                          {en.full_name} (#{en.badge_number})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Enforcer Badge"
                      value={editData.enforcerBadge}
                      onChange={(e) => setEditData((p) => ({ ...p, enforcerBadge: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Witness Name"
                      value={editData.witnessName}
                      onChange={(e) => setEditData((p) => ({ ...p, witnessName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Supervisor Name"
                      value={editData.supervisorName}
                      onChange={(e) => setEditData((p) => ({ ...p, supervisorName: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Payment & Status Information */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Payment & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Fine Amount (₱)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.fineAmount}
                        onChange={(e) => setEditData((p) => ({ ...p, fineAmount: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Payment Status</label>
                      <select
                        value={editData.paymentStatus}
                        onChange={(e) => setEditData((p) => ({ ...p, paymentStatus: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Paid">Paid</option>
                        <option value="Partially Paid">Partially Paid</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editData.isCompleted}
                          onChange={(e) => setEditData((p) => ({ ...p, isCompleted: e.target.checked }))}
                          className="w-4 h-4 rounded border-slate-300 text-slate-800"
                        />
                        <span className="text-sm font-medium text-slate-700">Mark as Completed</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 pb-2 border-b border-amber-200">Additional Notes</h3>
                  <textarea
                    value={editData.remarks}
                    onChange={(e) => setEditData((p) => ({ ...p, remarks: e.target.value }))}
                    placeholder="Remarks or notes about the citation"
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6 pt-4 border-t border-amber-200">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {saving ? 'Saving...' : '✓ Save All Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fine Amount</p>
              <p className="text-xl font-bold text-slate-800">₱{formatCurrency(fineAmount)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total Paid</p>
              <p className="text-xl font-bold text-green-600">₱{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Balance Due</p>
              <p className={`text-xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₱{formatCurrency(balanceDue)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Violation Date</p>
              <p className="text-base font-bold text-slate-800">
                {citation.violation_date
                  ? new Date(citation.violation_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* Driver Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
                Driver Information
              </h2>
              <div className="space-y-4">
                <InfoRow label="Driver Name" value={citation.driver_name} />
                <InfoRow label="Address" value={citation.driver_address} />
                <InfoRow label="Contact" value={citation.driver_contact} />
                <InfoRow label="License Number" value={citation.license_number} />
                <InfoRow label="License Expiry" value={citation.license_expiry
                  ? new Date(citation.license_expiry).toLocaleDateString()
                  : undefined} />
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
                Vehicle Information
              </h2>
              <div className="space-y-4">
                <InfoRow label="Vehicle Type" value={citation.vehicle_type} />
                <InfoRow label="Plate Number" value={citation.plate_number} />
                <InfoRow label="Color" value={citation.vehicle_color} />
                <InfoRow label="Registration" value={citation.vehicle_registration} />
                <InfoRow label="Owner" value={citation.owner_name || citation.vehicle_owner} />
                <InfoRow label="Owner Address" value={citation.owner_address} />
              </div>
            </div>
          </div>

          {/* Violation Details */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
              Violation Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <InfoRow label="Location" value={citation.violation_location} />
              <InfoRow
                label="Date"
                value={citation.violation_date
                  ? new Date(citation.violation_date).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })
                  : undefined}
              />
              <InfoRow label="Time" value={citation.violation_time} />
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Violations Committed</p>
              {violations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {violations.map((v: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full border border-red-200"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No violations recorded</p>
              )}
            </div>

            {citation.other_violations && (
              <InfoRow label="Other Violations" value={citation.other_violations} />
            )}

            {citation.remarks && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Remarks</p>
                <p className="text-sm text-slate-800 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  {citation.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Enforcer Information */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-2 mb-4">
              Enforcer Information
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoRow label="Enforcer Name" value={citation.enforcer_name} />
              <InfoRow label="Badge Number" value={citation.enforcer_badge} />
              <InfoRow label="Witness" value={citation.witness_name} />
              <InfoRow label="Supervisor" value={citation.supervisor_name} />
            </div>
          </div>

          {/* Payment History */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                Payment History
                {payments.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-normal normal-case">
                    {payments.length} record{payments.length !== 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              {citation.payment_status !== 'Paid' && (
                <button
                  onClick={() => { setShowPaymentForm(!showPaymentForm); setError(''); }}
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {showPaymentForm ? 'Cancel' : '+ Add Payment'}
                </button>
              )}
            </div>

            {/* Payment Form */}
            {showPaymentForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-blue-800 mb-3">Record New Payment</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">
                      Amount Paid (₱) *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={balanceDue}
                      value={paymentForm.amount_paid}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, amount_paid: e.target.value }))}
                      placeholder={`Max ₱${balanceDue.toFixed(2)}`}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Payment Date</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Payment Method</label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Check">Check</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Online Transfer">Online Transfer</option>
                      <option value="GCash">GCash</option>
                      <option value="Maya">Maya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Receipt Number</label>
                    <input
                      type="text"
                      value={paymentForm.receipt_number}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, receipt_number: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase">Notes</label>
                    <input
                      type="text"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))}
                      placeholder="Optional"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddPayment}
                  disabled={paymentSaving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {paymentSaving ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            )}

            {/* Payment Progress Bar */}
            {fineAmount > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Payment Progress</span>
                  <span>{Math.min(100, Math.round((totalPaid / fineAmount) * 100))}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalPaid / fineAmount) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Payments Table */}
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Receipt #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Notes</th>
                      {isAdmin && <th className="px-4 py-2 text-center text-xs font-semibold text-slate-600 uppercase">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((payment) =>
                      editingPaymentId === payment.payment_id ? (
                        /* Inline edit row */
                        <tr key={payment.payment_id} className="bg-amber-50">
                          <td className="px-2 py-2">
                            <input
                              type="date"
                              value={editPaymentForm.payment_date}
                              onChange={(e) => setEditPaymentForm((p) => ({ ...p, payment_date: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editPaymentForm.amount_paid}
                              onChange={(e) => setEditPaymentForm((p) => ({ ...p, amount_paid: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </td>
                          <td className="px-2 py-2 text-slate-500 text-xs italic">{payment.payment_method}</td>
                          <td className="px-2 py-2">
                            <input
                              type="text"
                              value={editPaymentForm.receipt_number}
                              onChange={(e) => setEditPaymentForm((p) => ({ ...p, receipt_number: e.target.value }))}
                              placeholder="Receipt #"
                              className="w-full px-2 py-1 text-sm border border-amber-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                          </td>
                          <td className="px-2 py-2 text-slate-500 text-xs italic">{payment.notes || '—'}</td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={handleSaveEditPayment}
                                disabled={editPaymentSaving}
                                className="px-2 py-1 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                              >
                                {editPaymentSaving ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingPaymentId(null)}
                                disabled={editPaymentSaving}
                                className="px-2 py-1 text-xs font-semibold bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        /* Normal display row */
                        <tr key={payment.payment_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-600">
                            {new Date(payment.payment_date).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </td>
                          <td className="px-4 py-3 font-semibold text-green-700">
                            ₱{formatCurrency(Number(payment.amount_paid))}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{payment.payment_method}</td>
                          <td className="px-4 py-3 text-slate-600">{payment.receipt_number || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{payment.notes || '—'}</td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => startEditPayment(payment)}
                                className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded hover:bg-amber-200 transition-colors border border-amber-200"
                              >
                                Edit
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200">
                      <td className="px-4 py-2 text-xs font-bold text-slate-600 uppercase">Total</td>
                      <td className="px-4 py-2 font-bold text-green-700">₱{formatCurrency(totalPaid)}</td>
                      <td colSpan={isAdmin ? 4 : 3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-100">
                No payments recorded yet.
              </div>
            )}
          </div>

          {/* Metadata Footer */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
            <span>Citation ID: <span className="font-mono text-slate-700">{citation.citation_id}</span></span>
            {citation.created_at && (
              <span>
                Created:{' '}
                <span className="text-slate-700">
                  {new Date(citation.created_at).toLocaleString()}
                </span>
              </span>
            )}
            {citation.updated_at && (
              <span>
                Last Updated:{' '}
                <span className="text-slate-700">
                  {new Date(citation.updated_at).toLocaleString()}
                </span>
              </span>
            )}
          </div>
          </div>

          {/* Right Column - Audit Trail */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 p-5 sticky top-20 max-h-[calc(100vh-140px)] overflow-y-auto">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Audit Trail
              </h2>

              {auditLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-slate-700 animate-spin" />
                </div>
              ) : auditTrail.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  <svg className="h-8 w-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  No activity yet
                </div>
              ) : (
                <div className="space-y-4">
                  {auditTrail.map((log, index) => {
                    const actionColors: Record<string, { bg: string; icon: string }> = {
                      'CREATE_CITATION': { bg: 'bg-blue-50', icon: '✨' },
                      'UPDATE_CITATION': { bg: 'bg-amber-50', icon: '✏️' },
                      'DELETE_CITATION': { bg: 'bg-red-50', icon: '🗑️' },
                      'RECORD_CITATION_PAYMENT': { bg: 'bg-green-50', icon: '💳' },
                    };
                    const action = actionColors[log.action] || { bg: 'bg-slate-50', icon: '📝' };
                    const isFirstItem = index === 0;

                    return (
                      <div key={log.log_id} className="relative">
                        {/* Timeline line */}
                        {!isFirstItem && (
                          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-100 -translate-y-12" />
                        )}
                        {/* Timeline item */}
                        <div className="flex gap-3">
                          <div className={`h-5 w-5 rounded-full border-2 border-white ring-2 ring-slate-200 shrink-0 mt-0.5 ${action.bg} flex items-center justify-center text-xs`}>
                            {action.icon}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="text-xs font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{log.details}</p>
                            <div className="mt-2 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                              <div>by <span className="font-medium">{log.user_name || 'System'}</span></div>
                              <div>{new Date(log.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
