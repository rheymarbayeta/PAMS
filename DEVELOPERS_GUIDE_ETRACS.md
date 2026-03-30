# eTracs Integration - Developer's Guide

## Introduction

This guide is for developers who need to maintain, extend, or troubleshoot the eTracs integration in PAMS.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                 PAMS Frontend                       │
│              (Next.js/React/TypeScript)             │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│              etracsService.ts                       │
│           (Frontend API Wrapper)                    │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
    (HTTP)                    (HTTP)
        │                         │
┌───────┴──────────────────────────┴──────────┐
│         Express Backend API                 │
│    (routes/entities.js,                     │
│     routes/citations.js)                    │
└───────┬──────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│      etracsService.js                   │
│   (Backend eTracs API Client)           │
└───────┬─────────────────────────────────┘
        │
        │ (HTTP with X-API-Key)
        ▼
┌─────────────────────────────────────────┐
│      eTracs External API                │
│  http://192.168.11.17:9050/api          │
└─────────────────────────────────────────┘
```

---

## Core Components

### 1. Backend eTracs Service

**File:** `backend/utils/etracsService.js`

**Key Responsibilities:**
- Single HTTP request handler for all eTracs calls
- Error handling and timeout management
- API key authentication
- Response parsing and error mapping

**Essential Functions:**

```javascript
// Low-level request handler
async function makeEtracsRequest(endpoint, method = 'GET', data = null)

// High-level convenience functions
async function searchEntities(search = '', page = 1)
async function getEntity(id)
async function checkDuplicateEntity(criteria)
async function getExactEntityMatch(criteria)
```

**Configuration:**
```javascript
const ETRACS_BASE_URL = 'http://192.168.11.17:9050/api';
const ETRACS_API_KEY = process.env.ETRACS_API_KEY || 
  'etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c';
```

### 2. Backend Routes

**Entities:** `backend/routes/entities.js`
```javascript
router.get('/etracs/search', ...)
router.get('/etracs/check-duplicate', ...)
router.post('/etracs/sync', ...)
router.get('/etracs/:etracs_id', ...)
```

**Citations:** `backend/routes/citations.js`
```javascript
router.get('/etracs/verify-driver', ...)
router.post('/:id/link-etracs-entity', ...)
router.get('/:id/etracs-entity', ...)
router.get('/etracs/search', ...)
```

### 3. Frontend Service

**File:** `frontend/services/etracsService.ts`

**Pattern:**
```typescript
export const methodology = async (params) => {
  try {
    const response = await api.get('/api/path', { params });
    return response.data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
```

### 4. Frontend UI

**File:** `frontend/app/citations/page.tsx`

**Key Features:**
- `handleVerifyDriver()` - Button handler
- eTracs state variables
- Results modal component
- Match score rendering

---

## Extension Guide

### Adding A New Module Integration

#### Example: Extending to Applications (Permits)

**Step 1: Add Backend Endpoint**

File: `backend/routes/applications.js`

```javascript
const etracsService = require('../utils/etracsService');

// Search entities for applicant pre-selection
router.get('/etracs/search', authenticate, async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;
    const etracsResult = await etracsService.searchEntities(search, page);
    
    res.json({
      source: 'eTracs',
      search,
      ...etracsResult
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Link application to eTracs entity
router.post('/:id/link-etracs-entity', authenticate, async (req, res) => {
  try {
    const { etracs_objid } = req.body;
    const applicationId = req.params.id;
    
    // Get eTracs entity for validation
    const entity = await etracsService.getEntity(etracs_objid);
    
    // Link in database
    await pool.execute(
      'UPDATE applications SET etracs_objid = ? WHERE application_id = ?',
      [etracs_objid, applicationId]
    );
    
    res.json({
      message: 'Application linked',
      application_id: applicationId,
      etracs_objid,
      entity_name: entity.name
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Step 2: Add Frontend Service Method**

File: `frontend/services/etracsService.ts`

```typescript
export const getApplicationEtracsEntity = async (applicationId: string) => {
  try {
    const response = await api.get(
      `/api/applications/${applicationId}/etracs-entity`
    );
    return response.data;
  } catch (error) {
    console.error('getApplicationEtracsEntity error:', error);
    throw error;
  }
};
```

**Step 3: Update Application Form**

File: `frontend/app/applications/page.tsx` or similar

```typescript
import etracsService from '@/services/etracsService';

// In component
const [etracsResults, setEtracsResults] = useState([]);
const [showEtracsModal, setShowEtracsModal] = useState(false);

const handleVerifyApplicant = async (applicantName: string) => {
  const results = await etracsService.verifyDriverWithEtracs({
    firstname: applicantName.split(' ')[0],
    lastname: applicantName.split(' ')[1]
  });
  setEtracsResults(results.all_results);
  setShowEtracsModal(true);
};

// In JSX
<button onClick={() => handleVerifyApplicant(applicantName)}>
  🔍 Search Applicant
</button>
```

**Step 4: Update Database**

File: `database/migrations/add_etracs_to_applications.sql`

```sql
ALTER TABLE `applications` ADD COLUMN `etracs_objid` varchar(255);
ALTER TABLE `applications` ADD KEY `idx_etracs_objid` (`etracs_objid`);
```

---

## Common Development Tasks

### Task 1: Add New eTracs Service Function

```javascript
// backend/utils/etracsService.js

async function getEntityWithPermits(entityId) {
  try {
    const entity = await getEntity(entityId);
    const individual = await getIndividual(entity.individual.objid);
    
    // Additional data enrichment
    return {
      ...entity,
      individual,
      enriched: true
    };
  } catch (error) {
    console.error('getEntityWithPermits error:', error);
    throw error;
  }
}

module.exports = {
  // ... existing exports
  getEntityWithPermits,
};
```

### Task 2: Add Endpoint Error Handling

```javascript
// backend/routes/entities.js

router.get('/etracs/check-duplicate', authenticate, async (req, res) => {
  try {
    const { firstname, lastname, middlename, birthdate } = req.query;
    
    // Validation
    if (!firstname && !lastname && !middlename && !birthdate) {
      return res.status(400).json({
        error: 'At least one field required'
      });
    }
    
    // Call service with error handling
    const results = await etracsService.checkDuplicateEntity({
      firstname, lastname, middlename, birthdate
    });
    
    res.json({
      source: 'eTracs',
      results,
      exactMatch: results.find(r => r.match_score === 100) || null
    });
    
  } catch (error) {
    // Handle specific errors
    if (error.status === 404) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    if (error.message.includes('timeout')) {
      return res.status(504).json({ error: 'eTracs service timeout' });
    }
    
    // Generic error
    console.error('eTracs check-duplicate error:', error);
    res.status(500).json({ 
      error: 'Failed to check duplicates',
      message: error.message
    });
  }
});
```

### Task 3: Implement Caching

```javascript
// backend/utils/etracsCache.js

const NodeCache = require('node-cache');

// 5-minute cache
const cache = new NodeCache({ stdTTL: 300 });

async function getCachedEntity(entityId) {
  // Check cache first
  let entity = cache.get(entityId);
  if (entity) {
    console.log(`Cache hit for entity ${entityId}`);
    return entity;
  }
  
  // Get from eTracs
  entity = await etracsService.getEntity(entityId);
  
  // Store in cache
  cache.set(entityId, entity);
  
  return entity;
}

module.exports = {
  getCachedEntity,
  clearCache: () => cache.flushAll()
};
```

### Task 4: Add Logging and Monitoring

```javascript
// backend/utils/etracsLogging.js

function logEtracsCall(functionName, params, duration, success = true) {
  const log = {
    timestamp: new Date().toISOString(),
    function: functionName,
    params,
    duration: `${duration}ms`,
    success,
    level: success ? 'INFO' : 'ERROR'
  };
  
  console.log(`[eTracs] ${JSON.stringify(log)}`);
  
  // Could also write to file or database
  // fs.appendFileSync('logs/etracs.log', JSON.stringify(log) + '\n');
}

// Usage
async function trackedEtracsCall() {
  const start = Date.now();
  try {
    const result = await etracsService.searchEntities();
    logEtracsCall('searchEntities', {}, Date.now() - start, true);
    return result;
  } catch (error) {
    logEtracsCall('searchEntities', {}, Date.now() - start, false);
    throw error;
  }
}
```

---

## Debugging Guide

### Debug: API Connection Issues

```bash
# Test eTracs directly
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entities?limit=1

# Add detailed logging
NODE_DEBUG=http node backend/server.js

# Test from backend container
docker exec -it pams_backend curl http://192.168.11.17:9050/api/entities

# Check firewall
telnet 192.168.11.17 9050
```

### Debug: Frontend Issues

```typescript
// Add logging to etracsService.ts
export const verifyDriverWithEtracs = async (criteria) => {
  console.log('[eTracs] Verifying driver:', criteria);
  try {
    const response = await api.get('/api/citations/etracs/verify-driver', {
      params: criteria
    });
    console.log('[eTracs] Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[eTracs] Error:', error);
    throw error;
  }
};
```

### Debug: Modal Not Appearing

```typescript
// Check if state is updating
console.log('etracsResults:', etracsResults);
console.log('showEtracsModal:', showEtracsModal);
console.log('etracsExactMatch:', etracsExactMatch);

// Check if handleVerifyDriver is called
const handleVerifyDriver = async () => {
  console.log('handleVerifyDriver called');
  // ... rest of function
};
```

---

## Testing

### Unit Testing Pattern

```javascript
// backend/routes/__tests__/entities.etracs.test.js

const request = require('supertest');
const app = require('../../server');

describe('eTracs Entities Integration', () => {
  
  let token;
  
  beforeAll(async () => {
    // Get auth token
    token = 'test-token';
  });
  
  test('GET /api/entities/etracs/search should return entities', async () => {
    const response = await request(app)
      .get('/api/entities/etracs/search')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: 'test', page: 1 });
    
    expect(response.status).toBe(200);
    expect(response.body.source).toBe('eTracs');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
  
  test('POST /api/entities/etracs/sync should sync entity', async () => {
    const response = await request(app)
      .post('/api/entities/etracs/sync')
      .set('Authorization', `Bearer ${token}`)
      .send({
        etracs_objid: 'IND-test',
        etracs_entityno: 'TEST-123'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.etracs_objid).toBe('IND-test');
  });
});
```

### Integration Testing

```bash
# Test full flow
1. Create citation form
2. Enter driver name
3. Click verify
4. Select result
5. Check form population
6. Create citation
7. Verify in database
```

---

## Performance Optimization

### Implement Request Pooling

```javascript
// backend/utils/etracsService.js

const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const requestQueue = [];

async function makeEtracsRequest(endpoint, method = 'GET', data = null) {
  // Wait if too many concurrent requests
  while (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    await new Promise(resolve => requestQueue.push(resolve));
  }
  
  activeRequests++;
  
  try {
    // Existing request logic
    return await doRequest();
  } finally {
    activeRequests--;
    const resolve = requestQueue.shift();
    if (resolve) resolve();
  }
}
```

### Add Response Compression

```javascript
// backend/server.js

const compression = require('compression');
app.use(compression());
```

---

## Troubleshooting Checklist

- [ ] eTracs API is accessible
- [ ] API key is correct and not expired
- [ ] Database columns exist
- [ ] Migrations were applied
- [ ] Backend service imported correctly
- [ ] Frontend service imported correctly
- [ ] No JavaScript errors in console
- [ ] Network requests show correct status
- [ ] Response data structure matches expectations
- [ ] Error messages are descriptive
- [ ] Timeout is reasonable (10s)
- [ ] No infinite loops in state updates

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Modal doesn't appear | Check state updates in handleVerifyDriver |
| No results from eTracs | Verify API key and connectivity |
| Form doesn't populate | Check if selected result has address property |
| Timeout errors | Increase timeout or check eTracs load |
| CORS errors | Check backend CORS configuration |
| Auth errors | Verify token is valid and not expired |

---

## Version Compatibility

- **Node.js:** 14+
- **Express:** 4.18+
- **Next.js:** 13+
- **MySQL:** 5.7+
- **eTracs API:** v1.0.0

---

## Additional Resources

- [eTracs API Documentation](../API.md)
- [Implementation Summary](./ETRACS_IMPLEMENTATION_SUMMARY.md)
- [Quick Start Guide](./ETRACS_QUICK_START.md)

---

**Last Updated:** March 30, 2026  
**Version:** 1.0.0
