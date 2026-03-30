# eTracs Integration - Quick Start Guide

## Prerequisites
- PAMS Backend and Frontend running
- Access to MySQL database
- eTracs API accessible at `http://192.168.11.17:9050/api`

---

## Step 1: Apply Database Migrations

### From MySQL Command Line
```bash
# Connect to your database
mysql -u your_username -p your_database

# Run the migration files
SOURCE database/migrations/add_etracs_integration.sql;
SOURCE database/migrations/add_etracs_to_citations.sql;

# Verify columns were added
DESCRIBE entities;
DESCRIBE citations;
```

### From Terminal
```bash
# Apply migrations
mysql -u your_username -p your_database < database/migrations/add_etracs_integration.sql
mysql -u your_username -p your_database < database/migrations/add_etracs_to_citations.sql
```

### Manual SQL Execution
If using PhpMyAdmin or another tool, execute these queries:

```sql
-- Entities table
ALTER TABLE `entities` ADD COLUMN `etracs_objid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'eTracs entity object ID';
ALTER TABLE `entities` ADD COLUMN `etracs_entityno` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'eTracs entity number';
ALTER TABLE `entities` ADD COLUMN `synced_at` timestamp NULL DEFAULT NULL COMMENT 'When entity was synced from eTracs';
ALTER TABLE `entities` ADD UNIQUE KEY `idx_etracs_objid` (`etracs_objid`);

-- Citations table
ALTER TABLE `citations` ADD COLUMN `etracs_objid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'eTracs entity object ID';
ALTER TABLE `citations` ADD KEY `idx_etracs_objid` (`etracs_objid`);
```

---

## Step 2: Verify eTracs API Connection

Test if the backend can reach eTracs:

```bash
# Direct test to eTracs
curl -H "X-API-Key: etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c" \
  http://192.168.11.17:9050/api/entities?limit=1

# Test through PAMS backend (create dummy endpoint or use existing search)
curl -H "Authorization: Bearer your_token" \
  http://localhost:5000/api/entities/etracs/search?search=test
```

**Expected Response:**
```json
{
  "source": "eTracs",
  "search": "test",
  "current_page": 1,
  "data": [...],
  "per_page": 20,
  "total": X
}
```

---

## Step 3: Test Entity Integration

### Via API (using curl or Postman)

1. **Search for entities in eTracs:**
   ```bash
   curl -H "Authorization: Bearer your_token" \
     "http://localhost:5000/api/entities/etracs/search?search=amaba&page=1"
   ```

2. **Check for duplicates:**
   ```bash
   curl -H "Authorization: Bearer your_token" \
     "http://localhost:5000/api/entities/etracs/check-duplicate?firstname=JOHN&lastname=AMABA"
   ```

3. **Sync an entity to PAMS:**
   ```bash
   curl -X POST -H "Authorization: Bearer your_token" \
     -H "Content-Type: application/json" \
     -d '{
       "etracs_objid": "IND-10006567:16ab8cb6c90:-7e5b",
       "etracs_entityno": "04321-038811I"
     }' \
     http://localhost:5000/api/entities/etracs/sync
   ```

### Via Frontend

1. Go to **Entities** module
2. Create a new entity
3. Instead of typing, click on eTracs search option (if available)
4. Search for entities
5. Select and sync

---

## Step 4: Test Citations Integration

### Verify Driver Feature

1. Navigate to **Citations → Create Citation**
2. Enter a driver name (e.g., "JOHN AMABA")
3. Click the **🔍 Verify** button
4. Modal appears showing matches from eTracs
5. Click on a match to auto-populate fields

### Link Citation to Entity

After creating a citation:

```bash
curl -X POST -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{
    "etracs_objid": "IND-10006567:16ab8cb6c90:-7e5b"
  }' \
  http://localhost:5000/api/citations/CITATION_ID/link-etracs-entity
```

---

## Step 5: Verify Frontend Integration

Check that these files exist and are properly imported:

```bash
# Backend service
ls -la backend/utils/etracsService.js

# Frontend service
ls -la frontend/services/etracsService.ts

# Citations page with integration
grep "etracsService" frontend/app/citations/page.tsx
```

### Test Frontend Components

1. Open **Citations** page
2. Try to create a new citation
3. Verify the "🔍 Verify" button appears next to driver name
4. Click it and ensure modal loads
5. Select a driver and verify form fields update

---

## Troubleshooting

### Issue: "API connection failed"
```
Error: eTracs API request failed
```
**Solution:**
- Check if eTracs is running: `ping 192.168.11.17`
- Verify firewall allows port 9050
- Test directly: `curl http://192.168.11.17:9050/api/entities`

### Issue: "Invalid API key"
```
Error: {"message": "Invalid API key."}
```
**Solution:**
- Verify production key: `etracs_live_4f8d9c2a1e6b3f7a9d2c5e8b1a4f7d9c`
- Check `backend/utils/etracsService.js` for correct key
- Ensure API key header is being sent: `X-API-Key: <key>`

### Issue: "Database columns not found"
```
Error: Unknown column 'etracs_objid'
```
**Solution:**
- Run migrations again:
  ```sql
  ALTER TABLE entities ADD COLUMN etracs_objid varchar(255);
  ALTER TABLE citations ADD COLUMN etracs_objid varchar(255);
  ```
- Verify columns: `DESCRIBE entities;`

### Issue: "No results from eTracs"
**Solution:**
- Ensure data exists in eTracs
- Try broader search terms
- Check eTracs has data for your region

### Issue: "Frontend modal not appearing"
**Solution:**
- Verify `etracsService.ts` is in `frontend/services/`
- Check browser console for JavaScript errors
- Ensure citations form is on the `/citations` route
- Verify button `onClick={handleVerifyDriver}` is functional

---

## Testing Checklist

- [ ] Database migrations applied successfully
- [ ] eTracs API is accessible and responding
- [ ] Backend endpoints return data (test with curl)
- [ ] Frontend services file exists
- [ ] Citations page shows verify button
- [ ] Clicking verify button shows results
- [ ] Selecting result populates form
- [ ] New citations can be linked to entities
- [ ] Synced entities appear in PAMS

---

## Next Steps

1. **Train Users:** Show team how to verify drivers
2. **Monitor Integration:** Watch for API errors in logs
3. **Optimize:** Cache frequently accessed entities
4. **Extend:** Add more eTracs integrations (permits, payments)
5. **Document:** Update user manual with new features

---

## File Manifest

**Backend:**
- `backend/utils/etracsService.js` - Core eTracs API client
- `backend/routes/entities.js` - Updated with eTracs endpoints
- `backend/routes/citations.js` - Updated with driver verification
- `database/migrations/add_etracs_integration.sql` - Entities table migration
- `database/migrations/add_etracs_to_citations.sql` - Citations table migration

**Frontend:**
- `frontend/services/etracsService.ts` - API client for frontend
- `frontend/app/citations/page.tsx` - Updated with verification UI

**Documentation:**
- `ETRACS_INTEGRATION.md` - Full technical documentation
- `ETRACS_QUICK_START.md` - This file

---

## Support

For issues or questions:
1. Check the [full documentation](./ETRACS_INTEGRATION.md)
2. Review browser console and backend logs
3. Test connectivity to eTracs API
4. Verify all files are in place
5. Contact system administrator

---

**Version:** 1.0.0  
**Date:** March 30, 2026  
**Status:** Ready for Production
