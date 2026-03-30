import api from './api';

/**
 * eTracs Service
 * Frontend service for eTracs API integration
 * Communicates with backend /api/entities/etracs/* and /api/citations/etracs/* endpoints
 */

// ==================== Entities Integration ====================

/**
 * Search eTracs for entities
 */
export const searchEtracsEntities = async (search: string = '', page: number = 1) => {
  try {
    const response = await api.get('/api/entities/etracs/search', {
      params: { search, page }
    });
    return response.data;
  } catch (error) {
    console.error('searchEtracsEntities error:', error);
    throw error;
  }
};

/**
 * Check for duplicate individuals in eTracs
 */
export const checkEtracsDuplicate = async (criteria: {
  firstname?: string;
  lastname?: string;
  middlename?: string;
  birthdate?: string;
}) => {
  try {
    const response = await api.get('/api/entities/etracs/check-duplicate', {
      params: criteria
    });
    return response.data;
  } catch (error) {
    console.error('checkEtracsDuplicate error:', error);
    throw error;
  }
};

/**
 * Sync an eTracs entity to PAMS local database
 */
export const syncEtracsEntity = async (etracs_objid: string, etracs_entityno?: string) => {
  try {
    const response = await api.post('/api/entities/etracs/sync', {
      etracs_objid,
      etracs_entityno
    });
    return response.data;
  } catch (error) {
    console.error('syncEtracsEntity error:', error);
    throw error;
  }
};

/**
 * Get eTracs entity details without syncing
 */
export const getEtracsEntity = async (etracs_id: string) => {
  try {
    const response = await api.get(`/api/entities/etracs/${etracs_id}`);
    return response.data;
  } catch (error) {
    console.error('getEtracsEntity error:', error);
    throw error;
  }
};

// ==================== Citations Integration ====================

/**
 * Verify driver information with eTracs
 */
export const verifyDriverWithEtracs = async (criteria: {
  firstname?: string;
  lastname?: string;
  middlename?: string;
  birthdate?: string;
}) => {
  try {
    const response = await api.get('/api/citations/etracs/verify-driver', {
      params: criteria
    });
    return response.data;
  } catch (error) {
    console.error('verifyDriverWithEtracs error:', error);
    throw error;
  }
};

/**
 * Link a citation to an eTracs entity
 */
export const linkCitationToEtracsEntity = async (citationId: string, etracs_objid: string) => {
  try {
    const response = await api.post(`/api/citations/${citationId}/link-etracs-entity`, {
      etracs_objid
    });
    return response.data;
  } catch (error) {
    console.error('linkCitationToEtracsEntity error:', error);
    throw error;
  }
};

/**
 * Get eTracs entity linked to a citation
 */
export const getCitationEtracsEntity = async (citationId: string) => {
  try {
    const response = await api.get(`/api/citations/${citationId}/etracs-entity`);
    return response.data;
  } catch (error) {
    console.error('getCitationEtracsEntity error:', error);
    throw error;
  }
};

/**
 * Search eTracs for entities (for driver lookup in citations)
 */
export const searchEtracsForDrivers = async (search: string = '', page: number = 1) => {
  try {
    const response = await api.get('/api/citations/etracs/search', {
      params: { search, page }
    });
    return response.data;
  } catch (error) {
    console.error('searchEtracsForDrivers error:', error);
    throw error;
  }
};

export default {
  // Entities endpoints
  searchEtracsEntities,
  checkEtracsDuplicate,
  syncEtracsEntity,
  getEtracsEntity,
  
  // Citations endpoints
  verifyDriverWithEtracs,
  linkCitationToEtracsEntity,
  getCitationEtracsEntity,
  searchEtracsForDrivers,
};
