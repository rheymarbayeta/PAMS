'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { showAlert } from '@/utils/modal';

interface Entity {
  entity_id: string;
  firstname?: string;
  middlename?: string;
  lastname?: string;
  birthdate?: string;
  gender?: string;
  entity_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  entity_type?: string;
  etracs_objid?: string;
  etracs_entityno?: string;
}

interface VerificationResult {
  objid: string;
  name: string;
  firstname: string;
  lastname: string;
  middlename?: string;
  birthdate?: string;
  gender?: string;
  match_score: number;
  matched_fields: string[];
  address_text?: string;
  email?: string;
}

export default function AddEntityPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasRole } = useAuth();
  const entityId = searchParams.get('id');
  const etracsObjId = searchParams.get('etracs_id');

  const [loading, setLoading] = useState(!!entityId);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);
  const [showVerificationResults, setShowVerificationResults] = useState(false);
  const [selectedFromEtracs, setSelectedFromEtracs] = useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string>('');

  const [formData, setFormData] = useState<Entity>({
    entity_id: '',
    firstname: '',
    middlename: '',
    lastname: '',
    birthdate: '',
    gender: '',
    entity_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    entity_type: 'INDIVIDUAL',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing entity if editing
  useEffect(() => {
    if (entityId) {
      fetchEntity(entityId);
    } else if (etracsObjId) {
      loadEtracsEntity(etracsObjId);
    }
  }, [entityId, etracsObjId]);

  // Check if user can edit entities
  const isViewer = user && (user.role_name === 'Viewer' || !user.roles?.some((role: string) => role !== 'Viewer'));
  if (isViewer) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="text-center py-20">
              <p className="text-gray-600 font-medium">You don't have permission to add or edit entities.</p>
              <Link href="/admin/entities" className="text-emerald-600 hover:text-emerald-700 font-medium mt-4 inline-block">
                Back to Entities
              </Link>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const fetchEntity = async (id: string) => {
    try {
      const response = await api.get(`/api/entities/${id}`);
      setFormData(response.data);
    } catch (error) {
      console.error('Error fetching entity:', error);
      showAlert('Failed to load entity', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const loadEtracsEntity = async (objId: string) => {
    try {
      const response = await api.get(`/api/entities/etracs/${objId}`);
      const entity = response.data;
      const newFormData = {
        entity_id: '',
        firstname: entity.individual?.firstname || '',
        middlename: entity.individual?.middlename || '',
        lastname: entity.individual?.lastname || '',
        birthdate: entity.individual?.birthdate || '',
        gender: entity.individual?.gender || '',
        entity_name: entity.name || '',
        contact_person: [entity.individual?.firstname, entity.individual?.lastname].filter(Boolean).join(' ') || '',
        email: entity.individual?.email || '',
        phone: entity.individual?.phone || '',
        address: entity.address_text || '',
        entity_type: entity.type || 'INDIVIDUAL',
        etracs_objid: objId,
        etracs_entityno: entity.entityno || '',
      };
      setFormData(newFormData);
    } catch (error) {
      console.error('Error loading eTracs entity:', error);
      showAlert('Failed to load entity from eTracs', 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWithEtracs = async () => {
    setVerifying(true);
    setVerificationError('');
    setVerificationResults([]);

    try {
      // Need at least one field
      if (!formData.firstname && !formData.lastname && !formData.middlename && !formData.birthdate) {
        setVerificationError('Please enter at least firstname, lastname, or birthdate to verify');
        setVerifying(false);
        return;
      }

      const response = await api.get('/api/entities/etracs/check-duplicate', {
        params: {
          firstname: formData.firstname || undefined,
          lastname: formData.lastname || undefined,
          middlename: formData.middlename || undefined,
          birthdate: formData.birthdate || undefined,
        },
      });

      console.log('eTracs Verification Response received');
      
      if (response.data.results && response.data.results.length > 0) {
        setVerificationResults(response.data.results);
        setShowVerificationResults(true);
      } else {
        setVerificationError('No matches found in eTracs');
      }
    } catch (error: any) {
      setVerificationError(error.response?.data?.error || 'Verification failed. Please try again.');
      console.error('Verification error:', error);
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectEtracsResult = (result: VerificationResult) => {
    const updatedFormData = {
      firstname: result.firstname,
      middlename: result.middlename || '',
      lastname: result.lastname,
      birthdate: result.birthdate || '',
      gender: result.gender || '',
      entity_name: result.name,
      contact_person: result.name,
      address: result.address_text || '',
      email: result.email || '',
      etracs_objid: result.objid,
      etracs_match_score: result.match_score,
    };
    
    setFormData(prev => ({
      ...prev,
      ...updatedFormData
    }));
    setSelectedFromEtracs(result);
    setShowVerificationResults(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.entity_name?.trim()) {
      newErrors.entity_name = 'Entity name is required';
    }

    if (!formData.firstname?.trim()) {
      newErrors.firstname = 'First name is required';
    }

    if (!formData.lastname?.trim()) {
      newErrors.lastname = 'Last name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const submitData = {
        firstname: formData.firstname || '',
        middlename: formData.middlename || '',
        lastname: formData.lastname || '',
        birthdate: formData.birthdate || '',
        gender: formData.gender || '',
        entity_name: formData.entity_name || '',
        contact_person: formData.contact_person || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        entity_type: formData.entity_type || 'INDIVIDUAL',
        etracs_objid: formData.etracs_objid || null,
        etracs_entityno: formData.etracs_entityno || null,
      };

      if (entityId) {
        await api.put(`/api/entities/${entityId}`, submitData);
      } else {
        await api.post('/api/entities', submitData);
      }

      router.push('/admin/entities');
    } catch (error: any) {
      showAlert(error.response?.data?.error || 'Error saving entity', 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-indigo-100"></div>
                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
              </div>
              <p className="mt-4 text-gray-600 font-medium">Loading...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-8 max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                {entityId ? 'Edit Entity' : 'Add New Entity'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage entity information and verify with eTracs</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* eTracs Verification Section */}
            {!entityId && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  eTracs Cross-Match Verification
                </h2>
                
                {selectedFromEtracs && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Matched with eTracs entity: <span className="font-semibold">{selectedFromEtracs.name}</span>
                      {selectedFromEtracs.match_score && <span className="ml-2 text-green-600">({selectedFromEtracs.match_score}% match)</span>}
                    </p>
                  </div>
                )}

                {verificationError && (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">{verificationError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={formData.firstname}
                      onChange={(e) => setFormData({ ...formData, firstname: e.target.value })}
                      placeholder="First name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                    <input
                      type="text"
                      value={formData.middlename}
                      onChange={(e) => setFormData({ ...formData, middlename: e.target.value })}
                      placeholder="Middle name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastname}
                      onChange={(e) => setFormData({ ...formData, lastname: e.target.value })}
                      placeholder="Last name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Birthdate</label>
                    <input
                      type="date"
                      value={formData.birthdate}
                      onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">Select gender</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyWithEtracs}
                  disabled={verifying}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {verifying ? 'Verifying...' : 'Verify with eTracs'}
                </button>
              </div>
            )}

            {/* eTracs Results Modal */}
            {showVerificationResults && (
              <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
                <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-gray-900">eTracs Verification Results</h3>
                      <button
                        onClick={() => setShowVerificationResults(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {verificationResults.map((result) => (
                        <div
                          key={result.objid}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleSelectEtracsResult(result)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{result.name}</h4>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                                <span>DOB: {result.birthdate || 'N/A'}</span>
                                <span>{result.address_text || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="ml-4 text-right">
                              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                                result.match_score === 100 ? 'bg-green-100 text-green-700' :
                                result.match_score >= 80 ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {result.match_score}% match
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {result.matched_fields?.map(field => (
                              <span key={field} className="inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">
                                ✓ {field}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowVerificationResults(false)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Entity Form Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Entity Information</h2>

              {/* Entity Name - Required */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.entity_name}
                  onChange={(e) => {
                    setFormData({ ...formData, entity_name: e.target.value });
                    if (errors.entity_name) setErrors({ ...errors, entity_name: '' });
                  }}
                  placeholder="Enter entity/organization name"
                  className={`w-full border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none ${
                    errors.entity_name ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.entity_name && <p className="mt-1 text-sm text-red-600">{errors.entity_name}</p>}
              </div>

              {/* First and Last Name - Required if not from eTracs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstname}
                    onChange={(e) => {
                      setFormData({ ...formData, firstname: e.target.value });
                      if (errors.firstname) setErrors({ ...errors, firstname: '' });
                    }}
                    placeholder="First name"
                    className={`w-full border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none ${
                      errors.firstname ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.firstname && <p className="mt-1 text-sm text-red-600">{errors.firstname}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastname}
                    onChange={(e) => {
                      setFormData({ ...formData, lastname: e.target.value });
                      if (errors.lastname) setErrors({ ...errors, lastname: '' });
                    }}
                    placeholder="Last name"
                    className={`w-full border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none ${
                      errors.lastname ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.lastname && <p className="mt-1 text-sm text-red-600">{errors.lastname}</p>}
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    placeholder="Contact person name"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="Email address"
                  className={`w-full border rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none ${
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  }`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Address */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address, city, province"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none resize-none"
                />
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={formData.middlename}
                    onChange={(e) => setFormData({ ...formData, middlename: e.target.value })}
                    placeholder="Middle name"
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birthdate
                  </label>
                  <input
                    type="date"
                    value={formData.birthdate}
                    onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-900 bg-gray-50 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all outline-none"
                  >
                    <option value="">Select gender</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>

              {/* eTracs Info Display (if synced) */}
              {formData.etracs_objid && (
                <div className="pt-6 mt-6 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3">eTracs Information</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Entity ID:</span>
                        <p className="text-gray-600 break-all">{formData.etracs_objid}</p>
                      </div>
                      {formData.etracs_entityno && (
                        <div>
                          <span className="font-medium text-gray-700">Entity Number:</span>
                          <p className="text-gray-600">{formData.etracs_entityno}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6">
              <Link
                href="/admin/entities"
                className="inline-flex items-center justify-center px-6 py-3 sm:py-2.5 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center px-6 py-3 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-emerald-800 focus:ring-4 focus:ring-emerald-200 transition-all duration-200 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : entityId ? 'Update Entity' : 'Create Entity'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
