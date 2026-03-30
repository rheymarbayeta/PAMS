# eTracs Integration Documentation

## Overview

PAMS has been successfully integrated with the eTracs external API system. This integration enables seamless data exchange between PAMS and eTracs for entity lookups, driver verification, and permit management.

**Integration Date:** March 30, 2026  
**eTracs API URL:** http://192.168.11.17:9050/api  
**API Key:** etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c (Production)

---

## Architecture

### Backend Components

#### 1. **eTracs API Service** (`backend/utils/etracsService.js`)
Core service that handles all communication with the eTracs API. Provides convenience functions for common operations.

**Key Functions:**
- `searchEntities(search, page)` - Search for entities
- `getEntity(id)` - Get entity details
- `checkDuplicateEntity(criteria)` - Check for duplicates
- `getExactEntityMatch(criteria)` - Get 100% match
- `searchIndividuals(search, page)` - Search individuals
- `getIndividual(id)` - Get individual details
- `getEntityWithIndividuals(entityId)` - Get full entity with individuals
- `validateConnection()` - Test connectivity

#### 2. **Entities Route** (`backend/routes/entities.js`)
Integrated endpoints for entity management with eTracs syncing.

**New Endpoints:**
- `GET /api/entities/etracs/search?search=VALUE&page=N` - Search eTracs entities
- `GET /api/entities/etracs/check-duplicate?firstname=&lastname=&...` - Check for duplicates
- `POST /api/entities/etracs/sync` - Sync an eTracs entity to PAMS
- `GET /api/entities/etracs/:etracs_id` - Get eTracs entity details

#### 3. **Citations Route** (`backend/routes/citations.js`)
Integrated citations with eTracs driver verification and linking.

**New Endpoints:**
- `GET /api/citations/etracs/verify-driver?firstname=&lastname=...` - Verify driver with eTracs
- `POST /api/citations/:id/link-etracs-entity` - Link citation to eTracs entity
- `GET /api/citations/:id/etracs-entity` - Get eTracs entity linked to citation
- `GET /api/citations/etracs/search?search=&page=` - Search drivers in eTracs

### Frontend Components

#### 1. **eTracs Service** (`frontend/services/etracsService.ts`)
TypeScript service for frontend API calls to eTracs endpoints.

**Key Methods:**
- `searchEtracsEntities()` - Search for entities
- `checkEtracsDuplicate()` - Check duplicates
- `syncEtracsEntity()` - Sync entity to PAMS
- `getEtracsEntity()` - Get entity details
- `verifyDriverWithEtracs()` - Verify driver info
- `linkCitationToEtracsEntity()` - Link citation
- `getCitationEtracsEntity()` - Get linked entity
- `searchEtracsForDrivers()` - Search for drivers

#### 2. **Citations Page** (`frontend/app/citations/page.tsx`)
Enhanced citations creation form with eTracs integration.

**Features:**
- Driver verification button (🔍 Verify)
- eTracs results modal showing duplicate matches
- Match scoring (0-100%)
- One-click integration of matched data
- Exact match highlighting

### Database Changes

#### Migration 1: `database/migrations/add_etracs_integration.sql`
Adds columns to `entities` table:
- `etracs_objid` - eTracs entity object ID
- `etracs_entityno` - eTracs entity number
- `synced_at` - Sync timestamp

#### Migration 2: `database/migrations/add_etracs_to_citations.sql`
Adds column to `citations` table:
- `etracs_objid` - Link to eTracs entity

**SQL to Apply:**
```sql
-- For entities table
ALTER TABLE `entities` ADD COLUMN `etracs_objid` varchar(255) DEFAULT NULL;
ALTER TABLE `entities` ADD COLUMN `etracs_entityno` varchar(100) DEFAULT NULL;
ALTER TABLE `entities` ADD COLUMN `synced_at` timestamp NULL DEFAULT NULL;
ALTER TABLE `entities` ADD UNIQUE KEY `idx_etracs_objid` (`etracs_objid`);

-- For citations table
ALTER TABLE `citations` ADD COLUMN `etracs_objid` varchar(255) DEFAULT NULL;
ALTER TABLE `citations` ADD KEY `idx_etracs_objid` (`etracs_objid`);
```

---

## Features

### 1. Entities Module

#### Search eTracs
Browse and search for entities in the eTracs system.

**API Call:**
```bash
GET /api/entities/etracs/search?search=john&page=1
```

**Response:**
```json
{
  "source": "eTracs",
  "search": "john",
  "current_page": 1,
  "data": [
    {
      "objid": "IND-10006567:16ab8cb6c90:-7e5b",
      "entityno": "04321-038811I",
      "name": "AMABA, JOHN A.",
      "address_text": "CEBU",
      "type": "INDIVIDUAL"
    }
  ],
  "per_page": 20,
  "total": 1
}
```

#### Sync eTracs Entity
Create a local PAMS entity from an eTracs record.

**API Call:**
```bash
POST /api/entities/etracs/sync
Content-Type: application/json

{
  "etracs_objid": "IND-10006567:16ab8cb6c90:-7e5b",
  "etracs_entityno": "04321-038811I"
}
```

**Response:**
```json
{
  "entity_id": "ENT-20260330-001",
  "entity_name": "AMABA, JOHN A.",
  "contact_person": "JOHN A. AMABA",
  "address": "CEBU",
  "etracs_objid": "IND-10006567:16ab8cb6c90:-7e5b",
  "etracs_entityno": "04321-038811I",
  "source": "eTracs",
  "synced_at": "2026-03-30T10:30:00Z"
}
```

#### Check for Duplicates
Prevent duplicate entity creation by checking eTracs.

**API Call:**
```bash
GET /api/entities/etracs/check-duplicate?firstname=JOHN&lastname=AMABA&birthdate=1975-03-05
```

**Response:**
```json
{
  "source": "eTracs",
  "criteria": {
    "firstname": "JOHN",
    "lastname": "AMABA",
    "middlename": "",
    "birthdate": "1975-03-05"
  },
  "results": [
    {
      "objid": "IND-10006567:16ab8cb6c90:-7e5b",
      "name": "AMABA, JOHN A.",
      "firstname": "JOHN",
      "lastname": "AMABA",
      "birthdate": "1975-03-05",
      "match_score": 100,
      "matched_fields": ["firstname", "lastname", "birthdate"]
    }
  ],
  "exactMatch": {...}
}
```

### 2. Citations Module

#### Verify Driver
Check if a driver exists in eTracs during citation creation.

**Frontend Interaction:**
1. User enters driver name
2. Clicks "🔍 Verify" button
3. Modal displays matching drivers from eTracs
4. User selects best match or proceeds manually

**API Call:**
```bash
GET /api/citations/etracs/verify-driver?firstname=JOHN&lastname=AMABA
```

**Response:**
```json
{
  "criteria": { "firstname": "JOHN", "lastname": "AMABA", ... },
  "all_results": [...],
  "high_match": [
    {
      "objid": "IND-10006567:16ab8cb6c90:-7e5b",
      "name": "AMABA, JOHN A.",
      "match_score": 100,
      "address": { "text": "CEBU", ... }
    }
  ],
  "medium_match": [...],
  "low_match": [...],
  "exact_match": {...}
}
```

#### Link Citation to eTracs Entity
Associate a citation with an eTracs entity for tracking.

**API Call:**
```bash
POST /api/citations/{citationId}/link-etracs-entity
Content-Type: application/json

{
  "etracs_objid": "IND-10006567:16ab8cb6c90:-7e5b"
}
```

**Response:**
```json
{
  "message": "Citation linked to eTracs entity",
  "citation_id": "CIT-20260330-001",
  "etracs_objid": "IND-10006567:16ab8cb6c90:-7e5b",
  "etracs_entity_name": "AMABA, JOHN A."
}
```

---

## Usage Examples

### Example 1: Creating a Citation with Driver Verification

```typescript
import etracsService from '@/services/etracsService';

// Step 1: Verify driver when user enters name
const handleVerifyDriver = async (driverName: string) => {
  const nameParts = driverName.split(' ');
  const results = await etracsService.verifyDriverWithEtracs({
    firstname: nameParts[0],
    lastname: nameParts[nameParts.length - 1]
  });
  
  // results.high_match - show to user
  // results.exact_match - auto-populate if 100% match
};

// Step 2: Use matched data
const selectDriver = (matchedDriver: any) => {
  setFormData({
    driverName: matchedDriver.name,
    driverAddress: matchedDriver.address.text,
    // ... other fields
  });
};
```

### Example 2: Syncing an Entity from eTracs

```typescript
import etracsService from '@/services/etracsService';

// Search and find an entity
const searchResults = await etracsService.searchEtracsEntities('AMABA', 1);

// Select entity and sync
if (searchResults.data.length > 0) {
  const selected = searchResults.data[0];
  const synced = await etracsService.syncEtracsEntity(
    selected.objid,
    selected.entityno
  );
  
  console.log('Entity synced:', synced.entity_id);
}
```

### Example 3: Backend - Checking for Duplicate Drivers

```javascript
const etracsService = require('../utils/etracsService');

// Check if driver exists before creating ticket
const checkDriver = async (firstname, lastname, birthdate) => {
  try {
    const exactMatch = await etracsService.getExactEntityMatch({
      firstname,
      lastname,
      birthdate
    });
    
    if (exactMatch) {
      // Driver found, link automatically
      citation.etracs_objid = exactMatch.objid;
    }
  } catch (error) {
    console.error('eTracs check failed:', error);
    // Proceed with citation creation anyway
  }
};
```

---

## Configuration

### Backend Setup

1. **Ensure eTracs API is accessible:**
   ```bash
   curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
     http://192.168.11.17:9050/api/entities?limit=1
   ```

2. **Verify API key in environment:**
   - The production key is hardcoded in `backend/utils/etracsService.js`
   - To use a different key, add to `.env`:
     ```
     ETRACS_API_KEY=your_api_key_here
     ```

3. **Apply database migrations:**
   ```bash
   mysql -u user -p database < database/migrations/add_etracs_integration.sql
   mysql -u user -p database < database/migrations/add_etracs_to_citations.sql
   ```

### Frontend Setup

1. Ensure `etracsService.ts` is in `frontend/services/`
2. Import and use throughout the application:
   ```typescript
   import etracsService from '@/services/etracsService';
   ```

---

## Error Handling

### Common Errors and Solutions

#### API Connection Error
```
Error: eTracs API request failed: connect ECONNREFUSED
```
**Solution:** Verify eTracs server is running and accessible at `http://192.168.11.17:9050/api`

#### Invalid API Key
```
Error: Invalid API key
```
**Solution:** Check the API key in `backend/utils/etracsService.js` matches production key

#### Entity Not Found
```
Error: No query results for model
```
**Solution:** Entity doesn't exist in eTracs - either sync from eTracs or create new entity in PAMS

#### Timeout
```
Error: eTracs API request timeout
```
**Solution:** Check network connectivity and eTracs server performance

---

## Data Flow Diagram

```
┌─────────────────┐
│  Frontend UI    │
│  (Citations)    │
└────────┬────────┘
         │ 1. User enters driver name
         │ 2. Clicks "Verify"
         ▼
┌─────────────────────────────────────────┐
│    Frontend etracsService.ts            │
│ (HTTP Client - Axios)                   │
└────────┬────────────────────────────────┘
         │ 3. API call to /api/citations/etracs/verify-driver
         ▼
┌─────────────────────────────────────────┐
│  Backend Route: citations.js            │
│  handleVerifyDriver()                   │
└────────┬────────────────────────────────┘
         │ 4. Calls etracsService.checkDuplicateEntity()
         ▼
┌─────────────────────────────────────────┐
│ Backend Service: etracsService.js       │
│ (HTTP Client - Node http/https)         │
└────────┬────────────────────────────────┘
         │ 5. HTTP request to eTracs API
         ▼
┌─────────────────────────────────────────┐
│    External eTracs API                  │
│  http://192.168.11.17:9050/api          │
└────────┬────────────────────────────────┘
         │ 6. Returns duplicate check results
         │    with match scores
         ▼
┌─────────────────────────────────────────┐
│  Backend Response to Frontend           │
└────────┬────────────────────────────────┘
         │ 7. JSON with matches
         ▼
┌─────────────────────────────────────────┐
│  Frontend Modal Display                 │
│  - Exact match (100%)                   │
│  - High matches (80-99%)                │
│  - Medium matches (50-79%)              │
│  - Low matches (<50%)                   │
└─────────────────────────────────────────┘
```

---

## Performance Considerations

### Caching
For frequently accessed entities, consider implementing caching:
```javascript
// Simple in-memory cache
const entityCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedEntity(id) {
  const cached = entityCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const data = await etracsService.getEntity(id);
  entityCache.set(id, { data, timestamp: Date.now() });
  return data;
}
```

### Rate Limiting
eTracs API has no built-in rate limits, but implement client-side throttling:
```typescript
import { debounce } from 'lodash';

const verifyDriver = debounce(async (name) => {
  // Only called once per 500ms
  await etracsService.verifyDriverWithEtracs({...});
}, 500);
```

---

## Maintenance & Monitoring

### Health Checks
```bash
# Test eTracs connectivity
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entities?limit=1

# Check response time
time curl http://192.168.11.17:9050/api/entities?limit=1
```

### Logging
All eTracs operations log to backend console:
```
eTracs searchEntities: Searching for "amaba"
eTracs checkDuplicateEntity: Checking john AMABA
```

### Common Maintenance Tasks

1. **Check synced entities:**
   ```sql
   SELECT COUNT(*) FROM entities WHERE etracs_objid IS NOT NULL;
   ```

2. **Find citations linked to eTracs:**
   ```sql
   SELECT COUNT(*) FROM citations WHERE etracs_objid IS NOT NULL;
   ```

3. **Resync entity if needed:**
   ```sql
   UPDATE entities SET synced_at = NULL WHERE entity_id = 'ENT-123';
   ```

---

## Future Enhancements

1. **Batch Operations** - Sync multiple entities at once
2. **Webhooks** - Real-time notifications from eTracs
3. **Advanced Filtering** - Filter entities by status, type, etc.
4. **Data Sync Service** - Automated periodic sync with eTracs
5. **Custom Fields** - Map eTracs fields to PAMS fields
6. **Audit Trail** - Track all synced data and changes
7. **Conflict Resolution** - Handle data conflicts during sync

---

## Support & Troubleshooting

### Getting Help
1. Check eTracs API logs: `http://192.168.11.17:9050/logs`
2. Review PAMS backend logs
3. Test connectivity: Use curl commands provided above
4. Check database migrations are applied

### Contact Information
- **eTracs Administrator:** [Contact Details]
- **PAMS Development Team:** [Contact Details]

---

## Changelog

### v1.0.0 (2026-03-30)
- Initial eTracs integration
- Entity search, duplicate check, and sync
- Citation driver verification
- Integration of eTracs results in UI
- Database migrations for tracking
