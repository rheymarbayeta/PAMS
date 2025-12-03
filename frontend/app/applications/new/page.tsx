'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { getBarangaysByMunicipality, BARANGAYS_BY_MUNICIPALITY } from '@/utils/barangays';

interface Entity {
  entity_id: string;
  entity_name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

interface AssessmentRuleOption {
  rule_id: string;
  permit_type_id: string;
  permit_type_name: string;
  attribute_id: string;
  attribute_name: string;
  rule_name: string;
  is_active: boolean;
  validity_type?: 'fixed' | 'custom';
}

export default function NewApplicationPage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [assessmentRules, setAssessmentRules] = useState<AssessmentRuleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableMunicipalities] = useState<string[]>(Object.keys(BARANGAYS_BY_MUNICIPALITY));
  const [availableBarangays, setAvailableBarangays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    entity_id: '',
    permit_type: '',
    rule_id: '',
    municipality: '',
    province: '',
    country: '',
    barangay: '',
    parameters: [] as { param_name: string; param_value: string }[],
  });

  useEffect(() => {
    fetchEntities();
    fetchAssessmentRules();
    fetchDefaultSettings();
  }, []);

  const fetchAssessmentRules = async () => {
    try {
      const response = await api.get('/api/assessment-rules');
      // Filter only active rules
      const activeRules = response.data.filter((rule: AssessmentRuleOption) => rule.is_active);
      setAssessmentRules(activeRules);
    } catch (error) {
      console.error('Error fetching assessment rules:', error);
    }
  };

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);
    setFormData({ ...formData, entity_id: entity.entity_id });
    setEntitySearch(entity.entity_name);
    setShowEntityDropdown(false);
  };

  const handleEntitySearchChange = (value: string) => {
    setEntitySearch(value);
    setShowEntityDropdown(true);
    if (!value) {
      setSelectedEntity(null);
      setFormData({ ...formData, entity_id: '' });
    }
  };

  useEffect(() => {
    // Update barangays when municipality changes
    if (formData.municipality) {
      const barangays = getBarangaysByMunicipality(formData.municipality);
      setAvailableBarangays(barangays);
      // Reset barangay if it's not in the new list
      if (formData.barangay && !barangays.includes(formData.barangay)) {
        setFormData(prev => ({ ...prev, barangay: '' }));
      }
    } else {
      setAvailableBarangays([]);
    }
  }, [formData.municipality, formData.barangay]);

  const fetchDefaultSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const settings = response.data;
      
      setFormData(prev => ({
        ...prev,
        municipality: settings.default_municipality?.value || '',
        province: settings.default_province?.value || '',
        country: settings.default_country?.value || '',
        parameters: [
          { param_name: 'Date', param_value: '' },
          { param_name: 'Conduct/engage in', param_value: '' },
        ],
      }));
    } catch (error) {
      console.error('Error fetching default settings:', error);
      // Fallback to hardcoded defaults
      setFormData(prev => ({
        ...prev,
        municipality: 'Dalaguete',
        province: 'Cebu',
        country: 'Philippines',
        parameters: [
          { param_name: 'Date', param_value: '' },
          { param_name: 'Conduct/engage in', param_value: '' },
        ],
      }));
    }
  };

  const fetchEntities = useCallback(async (searchTerm: string = '') => {
    try {
      const response = await api.get(`/api/entities${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      const fetchedEntities = response.data;
      if (!searchTerm) {
        // Only update main entities list when not searching
        setEntities(fetchedEntities);
      }
      setFilteredEntities(fetchedEntities);
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  }, []);

  useEffect(() => {
    // Debounce search - fetch from API when user types
    const timeoutId = setTimeout(() => {
      fetchEntities(entitySearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [entitySearch, fetchEntities]);

  const handleParameterChange = (index: number, value: string) => {
    const newParameters = [...formData.parameters];
    newParameters[index].param_value = value;
    setFormData({ ...formData, parameters: newParameters });
  };

  const addParameter = () => {
    setFormData({
      ...formData,
      parameters: [...formData.parameters, { param_name: '', param_value: '' }],
    });
  };

  const removeParameter = (index: number) => {
    const newParameters = formData.parameters.filter((_, i) => i !== index);
    setFormData({ ...formData, parameters: newParameters });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate entity is selected
    if (!formData.entity_id || !selectedEntity) {
      alert('Please select an entity (applicant) from the search results');
      return;
    }

    // Validate rule is selected
    if (!formData.rule_id) {
      alert('Please select a permit type');
      return;
    }

    setLoading(true);

    try {
      // Build parameters array including address fields
      const parameters = [
        { param_name: 'Municipality', param_value: formData.municipality },
        { param_name: 'Province', param_value: formData.province },
        { param_name: 'Country', param_value: formData.country },
        { param_name: 'Barangay', param_value: formData.barangay },
        ...formData.parameters.filter((p) => p.param_name && p.param_value),
      ];

      const response = await api.post('/api/applications', {
        entity_id: formData.entity_id,
        permit_type: formData.permit_type,
        rule_id: formData.rule_id,
        parameters: parameters,
      });

      alert('Application created successfully!');
      router.push(`/applications/${response.data.application_id}`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error creating application');
    } finally {
      setLoading(false);
    }
  };

  const canCreate = user && hasRole(['SuperAdmin', 'Admin', 'Application Creator']);
  const selectedRule = assessmentRules.find(
    (r) => r.rule_id === formData.rule_id
  );

  if (!canCreate) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
                <p className="text-gray-500">You do not have permission to create applications.</p>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-2 py-4 sm:px-4 sm:py-6">
          {/* Page Header */}
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl sm:rounded-2xl shadow-lg shadow-green-500/30">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                New Application
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Fill in the details to submit a new permit application</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white shadow-lg shadow-gray-200/50 rounded-xl sm:rounded-2xl border border-gray-100 p-4 sm:p-6 lg:p-8">
            {/* Entity Search */}
            <div className="mb-5 sm:mb-6 relative">
              <label htmlFor="entity_search" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                Entity (Applicant) *
              </label>
              <div className="relative">
                <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="entity_search"
                  type="text"
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-xl pl-10 sm:pl-12 pr-10 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 text-base"
                  placeholder="Search for entity..."
                  value={entitySearch}
                  onChange={(e) => handleEntitySearchChange(e.target.value)}
                  onFocus={() => setShowEntityDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowEntityDropdown(false), 200);
                  }}
                  aria-label="Search for entity (applicant)"
                />
                {entitySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setEntitySearch('');
                      setSelectedEntity(null);
                      setFormData({ ...formData, entity_id: '' });
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                {showEntityDropdown && filteredEntities.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-auto">
                    {filteredEntities.map((entity) => (
                      <div
                        key={entity.entity_id}
                        className="px-4 py-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleEntitySelect(entity);
                        }}
                      >
                        <div className="font-medium text-gray-900">{entity.entity_name}</div>
                        {entity.contact_person && (
                          <div className="text-sm text-gray-500">{entity.contact_person}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {showEntityDropdown && entitySearch && filteredEntities.length === 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      No entities found. Create a new entity in the Entities management page.
                    </div>
                  </div>
                )}
              </div>
              {selectedEntity && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selected: <span className="font-medium">{selectedEntity.entity_name}</span>
                  {selectedEntity.contact_person && ` (${selectedEntity.contact_person})`}
                </div>
              )}
              <input type="hidden" name="entity_id" value={formData.entity_id} required />
            </div>

            {/* Permit Type */}
            <div className="mb-6">
              <label htmlFor="permit_type" className="block text-sm font-medium text-gray-700 mb-2">
                Permit Type *
              </label>
              <select
                id="permit_type"
                required
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                value={formData.rule_id}
                onChange={(e) => {
                  const selectedRule = assessmentRules.find(r => r.rule_id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    rule_id: e.target.value,
                    permit_type: selectedRule ? selectedRule.rule_name : ''
                  });
                }}
                aria-label="Select permit type"
              >
                <option value="">Select a permit type</option>
                {assessmentRules.map((rule) => {
                  const label = `${rule.permit_type_name} - ${rule.attribute_name}`;
                  return (
                    <option key={rule.rule_id} value={rule.rule_id}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {formData.rule_id && (
                <p className="mt-2 text-sm text-indigo-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Selected: <span className="font-medium">{formData.permit_type}</span>
                </p>
              )}
            </div>

            {/* Address Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="municipality" className="block text-sm font-medium text-gray-700 mb-2">
                    Municipality *
                  </label>
                  <select
                    id="municipality"
                    required
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    value={formData.municipality}
                    onChange={(e) => setFormData({ ...formData, municipality: e.target.value, barangay: '' })}
                    aria-label="Select municipality"
                  >
                    <option value="">Select Municipality</option>
                    {availableMunicipalities.map((municipality) => (
                      <option key={municipality} value={municipality}>
                        {municipality}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-2">
                    Province *
                  </label>
                  <input
                    id="province"
                    type="text"
                    required
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Province"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    aria-label="Province"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <input
                    id="country"
                    type="text"
                    required
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    aria-label="Country"
                  />
                </div>
                <div>
                  <label htmlFor="barangay" className="block text-sm font-medium text-gray-700 mb-2">
                    Barangay *
                  </label>
                  <select
                    id="barangay"
                    required
                    className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    value={formData.barangay}
                    aria-label="Select a barangay"
                    onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                    disabled={!formData.municipality || availableBarangays.length === 0}
                  >
                    <option value="">
                      {!formData.municipality 
                        ? 'Select Municipality first' 
                        : availableBarangays.length === 0 
                        ? 'No barangays available' 
                        : 'Select Barangay'}
                    </option>
                    {availableBarangays.map((barangay) => (
                      <option key={barangay} value={barangay}>
                        {barangay}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Parameters Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Application Parameters
                </h3>
                <button
                  type="button"
                  onClick={addParameter}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Parameter
                </button>
              </div>
              <div className="space-y-3">
                {formData.parameters.map((param, index) => (
                  <div key={index} className="flex gap-3 items-center p-4 bg-gray-50/50 border border-gray-200 rounded-xl">
                    <input
                      type="text"
                      placeholder="Parameter name"
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={param.param_name}
                      onChange={(e) => {
                        const newParameters = [...formData.parameters];
                        newParameters[index].param_name = e.target.value;
                        setFormData({ ...formData, parameters: newParameters });
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Value"
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                      value={param.param_value}
                      onChange={(e) => handleParameterChange(index, e.target.value)}
                    />
                    <button
                      type="button"
                      title="Remove parameter"
                      onClick={() => removeParameter(index)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 sm:pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.back()}
                className="w-full sm:w-auto px-5 sm:px-6 py-3 sm:py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 sm:py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg shadow-green-500/30 hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 font-medium"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

