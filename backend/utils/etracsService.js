const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * eTracs API Service
 * Integrates PAMS with the eTracs external API for entity management
 * 
 * Base URL: http://192.168.11.17:9050/api
 * Production API Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c
 */

const ETRACS_BASE_URL = 'http://192.168.11.17:9050/api';
const ETRACS_API_KEY = process.env.ETRACS_API_KEY || 'etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c';

/**
 * Makes an HTTP request to the eTracs API
 * @param {string} endpoint - API endpoint (e.g., '/entities', '/entity-individuals')
 * @param {string} method - HTTP method (GET, POST, etc.)
 * @param {object} data - Request body for POST/PUT requests
 * @returns {Promise<object>} - API response data
 */
async function makeEtracsRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(ETRACS_BASE_URL + endpoint);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'X-API-Key': ETRACS_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            const error = new Error(parsed.message || `HTTP ${res.statusCode}`);
            error.status = res.statusCode;
            error.data = parsed;
            reject(error);
          }
        } catch (e) {
          reject(new Error(`Failed to parse eTracs API response: ${e.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`eTracs API request failed: ${error.message}`));
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('eTracs API request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Search for entities in eTracs
 * @param {string} search - Search term (entity name or number)
 * @param {number} page - Page number for pagination
 * @returns {Promise<object>} - List of entities
 */
async function searchEntities(search = '', page = 1) {
  try {
    let endpoint = `/entities?page=${page}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    const response = await makeEtracsRequest(endpoint);
    return response;
  } catch (error) {
    console.error('eTracs searchEntities error:', error.message);
    throw error;
  }
}

/**
 * Get a specific entity by ID
 * @param {string} id - Entity objid from eTracs
 * @returns {Promise<object>} - Entity details
 */
async function getEntity(id) {
  try {
    const response = await makeEtracsRequest(`/entities/${id}`);
    return response;
  } catch (error) {
    console.error(`eTracs getEntity(${id}) error:`, error.message);
    throw error;
  }
}

/**
 * Check for duplicate entities based on name and birthdate
 * @param {object} criteria - Criteria object with firstname, lastname, middlename, birthdate
 * @returns {Promise<array>} - List of potential duplicates with match scores
 */
async function checkDuplicateEntity(criteria) {
  try {
    const params = new URLSearchParams();
    
    if (criteria.firstname) params.append('firstname', criteria.firstname);
    if (criteria.lastname) params.append('lastname', criteria.lastname);
    if (criteria.middlename) params.append('middlename', criteria.middlename);
    if (criteria.birthdate) params.append('birthdate', criteria.birthdate);

    if (params.toString() === '') {
      throw new Error('At least one field (firstname, lastname, middlename, birthdate) is required');
    }

    const response = await makeEtracsRequest(`/entities/duplicate-check?${params.toString()}`);
    return response;
  } catch (error) {
    console.error('eTracs checkDuplicateEntity error:', error.message);
    throw error;
  }
}

/**
 * Get an exact match for an entity (returns full match or null)
 * @param {object} criteria - Full criteria object with firstname, lastname, middlename, birthdate
 * @returns {Promise<object|null>} - Entity if 100% match found, null otherwise
 */
async function getExactEntityMatch(criteria) {
  try {
    const results = await checkDuplicateEntity(criteria);
    
    if (Array.isArray(results) && results.length > 0) {
      const firstResult = results[0];
      if (firstResult.match_score === 100) {
        return firstResult;
      }
    }
    
    return null;
  } catch (error) {
    console.error('eTracs getExactEntityMatch error:', error.message);
    throw error;
  }
}

/**
 * Search for entity individuals
 * @param {string} search - Search term (firstname, lastname, middlename)
 * @param {number} page - Page number for pagination
 * @returns {Promise<object>} - List of individuals
 */
async function searchIndividuals(search = '', page = 1) {
  try {
    let endpoint = `/entity-individuals?page=${page}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    const response = await makeEtracsRequest(endpoint);
    return response;
  } catch (error) {
    console.error('eTracs searchIndividuals error:', error.message);
    throw error;
  }
}

/**
 * Get a specific individual by ID
 * @param {string} id - Individual objid from eTracs
 * @returns {Promise<object>} - Individual details with parent entity
 */
async function getIndividual(id) {
  try {
    const response = await makeEtracsRequest(`/entity-individuals/${id}`);
    return response;
  } catch (error) {
    console.error(`eTracs getIndividual(${id}) error:`, error.message);
    throw error;
  }
}

/**
 * Fetch entity with individual details (convenience function)
 * @param {string} entityId - Entity objid
 * @returns {Promise<object>} - Entity with full details
 */
async function getEntityWithIndividuals(entityId) {
  try {
    const entity = await getEntity(entityId);
    
    // If it has individual info, fetch the full individual record
    if (entity.individual && entity.individual.objid) {
      const individual = await getIndividual(entity.individual.objid);
      return {
        ...entity,
        individual: individual
      };
    }
    
    return entity;
  } catch (error) {
    console.error(`eTracs getEntityWithIndividuals(${entityId}) error:`, error.message);
    throw error;
  }
}

/**
 * Validate connection to eTracs API
 * @returns {Promise<boolean>} - True if connection successful
 */
async function validateConnection() {
  try {
    await makeEtracsRequest('/entities?limit=1');
    return true;
  } catch (error) {
    console.error('eTracs connection validation failed:', error.message);
    return false;
  }
}

module.exports = {
  makeEtracsRequest,
  searchEntities,
  getEntity,
  checkDuplicateEntity,
  getExactEntityMatch,
  searchIndividuals,
  getIndividual,
  getEntityWithIndividuals,
  validateConnection,
  ETRACS_BASE_URL,
};
