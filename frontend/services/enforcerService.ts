import api from './api';

interface Enforcer {
  enforcer_id: string;
  badge_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  position: string;
  department?: string;
  station?: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'On Leave';
  citations_issued: number;
  total_fines: number;
  license_number?: string;
  license_expiry?: string;
  date_hired?: string;
}

interface EnforcerStats {
  total_enforcer: number;
  active_count: number;
  inactive_count: number;
  suspended_count: number;
  total_citations: number;
  total_fines: number;
}

/**
 * Get all enforcers with filters
 */
export const getEnforcers = async (params?: {
  status?: string;
  department?: string;
  station?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  try {
    const response = await api.get('/api/enforcers', { params });
    return response.data;
  } catch (error) {
    console.error('getEnforcers error:', error);
    throw error;
  }
};

/**
 * Get single enforcer with statistics
 */
export const getEnforcer = async (id: string) => {
  try {
    const response = await api.get(`/api/enforcers/${id}`);
    return response.data;
  } catch (error) {
    console.error('getEnforcer error:', error);
    throw error;
  }
};

/**
 * Create new enforcer
 */
export const createEnforcer = async (data: {
  badge_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  position?: string;
  department?: string;
  station?: string;
  license_number?: string;
  license_expiry?: string;
  date_hired?: string;
  supervisor_id?: string;
  notes?: string;
}) => {
  try {
    const response = await api.post('/api/enforcers', data);
    return response.data;
  } catch (error) {
    console.error('createEnforcer error:', error);
    throw error;
  }
};

/**
 * Update enforcer
 */
export const updateEnforcer = async (id: string, data: Partial<Enforcer>) => {
  try {
    const response = await api.put(`/api/enforcers/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('updateEnforcer error:', error);
    throw error;
  }
};

/**
 * Delete enforcer
 */
export const deleteEnforcer = async (id: string) => {
  try {
    const response = await api.delete(`/api/enforcers/${id}`);
    return response.data;
  } catch (error) {
    console.error('deleteEnforcer error:', error);
    throw error;
  }
};

/**
 * Get enforcer statistics
 */
export const getEnforcerStats = async (): Promise<EnforcerStats> => {
  try {
    const response = await api.get('/api/enforcers/stats/summary');
    return response.data;
  } catch (error) {
    console.error('getEnforcerStats error:', error);
    throw error;
  }
};

/**
 * Get filter options (departments, stations, statuses)
 */
export const getFilterOptions = async () => {
  try {
    const response = await api.get('/api/enforcers/filters/options');
    return response.data;
  } catch (error) {
    console.error('getFilterOptions error:', error);
    throw error;
  }
};

export default {
  getEnforcers,
  getEnforcer,
  createEnforcer,
  updateEnforcer,
  deleteEnforcer,
  getEnforcerStats,
  getFilterOptions,
};
