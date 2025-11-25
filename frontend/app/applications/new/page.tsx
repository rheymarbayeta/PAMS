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

interface PermitTypeOption {
  permit_type_id: string;
  permit_type_name: string;
  attribute_id?: string | null;
  attribute_name?: string | null;
  is_active?: boolean;
}

export default function NewApplicationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<Entity[]>([]);
  const [entitySearch, setEntitySearch] = useState('');
  const [showEntityDropdown, setShowEntityDropdown] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [permitTypes, setPermitTypes] = useState<PermitTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableMunicipalities] = useState<string[]>(Object.keys(BARANGAYS_BY_MUNICIPALITY));
  const [availableBarangays, setAvailableBarangays] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    entity_id: '',
    permit_type: '',
    municipality: '',
    province: '',
    country: '',
    barangay: '',
    parameters: [
      { param_name: 'Business_Type', param_value: '' },
      { param_name: 'Description', param_value: '' },
    ],
  });

  useEffect(() => {
    fetchEntities();
    fetchPermitTypes();
    fetchDefaultSettings();
  }, []);

  const fetchPermitTypes = async () => {
    try {
      const response = await api.get('/api/permit-types');
      const activePermitTypes = response.data.filter((pt: PermitTypeOption) => pt.is_active);
      setPermitTypes(activePermitTypes);
    } catch (error) {
      console.error('Error fetching permit types:', error);
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
      }));
    } catch (error) {
      console.error('Error fetching default settings:', error);
      // Fallback to hardcoded defaults
      setFormData(prev => ({
        ...prev,
        municipality: 'Dalaguete',
        province: 'Cebu',
        country: 'Philippines',
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

  const canCreate = user && ['SuperAdmin', 'Admin', 'Application Creator'].includes(user.role_name);
  const selectedPermitType = permitTypes.find(
    (pt) => pt.permit_type_name === formData.permit_type
  );

  if (!canCreate) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="px-4 py-6 sm:px-0">
            <div className="text-red-600">You do not have permission to create applications.</div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Application</h1>

          <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
            <div className="mb-4 relative">
              <label htmlFor="entity_search" className="block text-sm font-medium text-gray-700 mb-2">
                Entity (Applicant) *
              </label>
              <div className="relative">
                <input
                  id="entity_search"
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10"
                  placeholder="Search for entity or applicant..."
                  value={entitySearch}
                  onChange={(e) => handleEntitySearchChange(e.target.value)}
                  onFocus={() => setShowEntityDropdown(true)}
                  onBlur={() => {
                    // Delay to allow click on dropdown item
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
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
                {showEntityDropdown && filteredEntities.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredEntities.map((entity) => (
                      <div
                        key={entity.entity_id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
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
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-sm text-gray-500">
                    No entities found. Create a new entity in the Entities management page.
                  </div>
                )}
              </div>
              {selectedEntity && (
                <div className="mt-2 text-sm text-gray-600">
                  Selected: <span className="font-medium">{selectedEntity.entity_name}</span>
                  {selectedEntity.contact_person && ` (${selectedEntity.contact_person})`}
                </div>
              )}
              <input
                type="hidden"
                name="entity_id"
                value={formData.entity_id}
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="permit_type" className="block text-sm font-medium text-gray-700 mb-2">
                Permit Type *
              </label>
              <select
                id="permit_type"
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                value={formData.permit_type}
                onChange={(e) => setFormData({ ...formData, permit_type: e.target.value })}
                aria-label="Select permit type"
              >
                <option value="">Select a permit type</option>
                {permitTypes.map((permitType) => {
                  const label = permitType.attribute_name
                    ? `${permitType.permit_type_name} (${permitType.attribute_name})`
                    : permitType.permit_type_name;
                  return (
                    <option key={permitType.permit_type_id} value={permitType.permit_type_name}>
                      {label}
                    </option>
                  );
                })}
              </select>
              {selectedPermitType?.attribute_name && (
                <p className="mt-2 text-sm text-gray-600">
                  Attribute: <span className="font-medium">{selectedPermitType.attribute_name}</span>
                </p>
              )}
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Address Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="municipality" className="block text-sm font-medium text-gray-700 mb-2">
                    Municipality *
                  </label>
                  <select
                    id="municipality"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
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

            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Application Parameters
                </label>
                <button
                  type="button"
                  onClick={addParameter}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Add Parameter
                </button>
              </div>
              {formData.parameters.map((param, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Parameter name"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
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
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    value={param.param_value}
                    onChange={(e) => handleParameterChange(index, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeParameter(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Application'}
              </button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

