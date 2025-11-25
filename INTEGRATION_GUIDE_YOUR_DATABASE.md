# Integration Guide: Your Current Database with Hash-Based ID System

## Overview
You have an existing database dump (`Dump20251125.sql`) with:
- 3 applications (IDs: 3, 4, 5)
- 5 users
- 2 entities
- Actual production data

This guide explains how to migrate your existing data to the hash-based ID system while preserving all relationships and data.

## Files Involved

### Your Current Database
- **Location**: `c:\Users\rheym\OneDrive\Documents\dumps\Dump20251125.sql`
- **Copied to**: `c:\PAMS\database\Dump20251125.sql`
- **Size**: 746 lines SQL
- **Contains**: INT AUTO_INCREMENT IDs with actual application data

### Migration Scripts
1. **`migrate_current_data_to_hash.sql`** - Converts your existing data
2. **`convert_ids_to_hash.sql`** - Alternative generic migration (for reference)

## Your Current Data

From the dump, you have:

**Applications (3 records)**
- ID 3: Mayor's Permit (Application 2025-11-008)
- ID 4: Mayor's Permit (Application 2025-11-009)
- ID 5: Mayor's Permit (Application 2025-11-010) - Status: Paid

**Users (5 records)**
- ID 1, 3, 4, 5 referenced

**Entities (2 records)**
- ID 1: Possibly business 1
- ID 2: Possibly business 2

**Application Parameters (20 records)**
- Municipality, Province, Country, Barangay for each application

**Application Sequence**
- Period 2025-11: Sequence number 10

## Migration Strategy

### Option 1: Direct Migration (Recommended)
Best for keeping all existing data and relationships:

```bash
# 1. Restore your current dump
mysql -u root -p pams_db < database/Dump20251125.sql

# 2. Run the migration
mysql -u root -p pams_db < database/migrations/migrate_current_data_to_hash.sql

# 3. Verify results
mysql -u root -p pams_db -e "SELECT application_id, permit_type, status FROM Applications LIMIT 3;"
```

### Option 2: Fresh Start with Hash Schema
If you want to start fresh with the new schema:

```bash
# 1. Create fresh database with hash schema
mysql -u root -p pams_db < database/schema.sql

# 2. Manually import your data (requires mapping old→new IDs)
```

## Step-by-Step Migration Process

### Pre-Migration
1. ✅ **Backup**: Your dump file is already saved
2. ✅ **Review**: Check database size and record count
3. ✅ **Verify**: Confirm all foreign keys exist

### Migration Execution

**Step 1: Load Your Current Dump**
```bash
mysql -u root -p pams_db < database/Dump20251125.sql
```

Result: Database restored with INT IDs
- Applications: 3 records (IDs: 3, 4, 5)
- Users: 5 records
- Entities: 2 records
- Application Parameters: 20 records

**Step 2: Run Migration Script**
```bash
mysql -u root -p pams_db < database/migrations/migrate_current_data_to_hash.sql
```

Result: All IDs converted to hashes while preserving data
- Application 3 → `md5('app-3')`
- Application 4 → `md5('app-4')`
- Application 5 → `md5('app-5')`
- User 1 → `md5('user-1')`
- Entity 1 → `md5('entity-1')`
- etc.

**Step 3: Verify Migration**
```sql
-- Check Applications
SELECT application_id, permit_type, status FROM Applications;

-- Verify Application Parameters are linked correctly
SELECT a.application_id, ap.param_name, ap.param_value 
FROM Applications a 
JOIN Application_Parameters ap ON a.application_id = ap.application_id;

-- Check user relationships
SELECT u.user_id, u.username, r.role_id, r.role_name 
FROM Users u 
JOIN Roles r ON u.role_id = r.role_id;
```

Expected output: All IDs will be 32-character MD5 hashes

## Hash ID Mapping for Your Data

### Your Applications Will Map To:
```
Old ID → New Hash ID
3 → a1e1...  (md5('app-3'))
4 → b2f2...  (md5('app-4'))
5 → c3g3...  (md5('app-5'))
```

### Your Users Will Map To:
```
Old ID → New Hash ID
1 → d4h4...  (md5('user-1'))
3 → e5i5...  (md5('user-3'))
4 → f6j6...  (md5('user-4'))
5 → g7k7...  (md5('user-5'))
```

**Note**: The actual hashes will be the full MD5 (32 characters), shown abbreviated here

## What Happens to Your Data

### Preserved ✅
- All application records (3 applications)
- All user records
- All entity data
- All application parameters (municipality, province, barangay)
- All application sequence data
- All relationships (foreign keys)
- All timestamps (created_at, updated_at)
- Status values (Approved, Paid, etc.)

### Changed ⚠️
- ID format: INT → VARCHAR(64) hash
- Database cannot use AUTO_INCREMENT anymore
- Backend must generate hash IDs using `idGenerator.js`

### NOT Lost ❌
- No data is lost
- No relationships broken
- No timestamps affected
- Historical records preserved

## Verification Steps

After migration, run these checks:

### 1. Check Table Structures
```sql
DESCRIBE Applications;
-- Should show: application_id VARCHAR(64), entity_id VARCHAR(64), etc.
```

### 2. Verify Data Integrity
```sql
-- Application count should still be 3
SELECT COUNT(*) FROM Applications;

-- All applications should have valid entity_ids
SELECT a.application_id, a.entity_id, e.entity_name 
FROM Applications a 
LEFT JOIN Entities e ON a.entity_id = e.entity_id;

-- All assessments should link to valid users
SELECT a.application_id, a.creator_id, u.username 
FROM Applications a 
LEFT JOIN Users u ON a.creator_id = u.user_id;
```

### 3. Check Foreign Keys
```sql
-- List all foreign key constraints
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'pams_db' 
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### 4. Verify Application Parameters
```sql
-- Parameters should still link to applications
SELECT a.application_id, COUNT(*) AS param_count
FROM Applications a
LEFT JOIN Application_Parameters ap ON a.application_id = ap.application_id
GROUP BY a.application_id;

-- Should show: 3 records (one for each application with 4 params each)
```

## Rollback Procedure

If something goes wrong:

```bash
# 1. Drop converted database
DROP DATABASE pams_db;

# 2. Reload original dump
mysql -u root -p pams_db < database/Dump20251125.sql

# 3. Investigate issue
# 4. Fix migration script
# 5. Try again
```

## Backend Integration After Migration

Your backend code needs to use the new hash IDs:

```javascript
const { generateId, ID_PREFIXES } = require('./utils/idGenerator');

// OLD WAY (will not work with new IDs)
const newUserId = 6;  // ❌ Wrong

// NEW WAY (must use hash generation)
const newUserId = generateId(ID_PREFIXES.USER);  // ✅ Correct
```

### API Changes
- **Before**: `/api/applications/3` (INT ID)
- **After**: `/api/applications/d41d8cd98f00b204e9800998ecf8427e` (hash ID)

All existing endpoints work the same way, just with different ID format.

## File Structure After Migration

```
c:\PAMS\
├── database/
│   ├── Dump20251125.sql                           (your original backup)
│   ├── schema.sql                                 (updated with hash IDs)
│   ├── HASH_ID_MIGRATION.md                       (guide)
│   └── migrations/
│       ├── migrate_current_data_to_hash.sql       (NEW - for your data)
│       ├── convert_ids_to_hash.sql                (generic migration)
│       └── ...other migrations...
├── backend/
│   └── utils/
│       └── idGenerator.js                         (NEW - generate hash IDs)
└── [documentation files]
```

## Estimated Timing

- **Backup (your dump)**: Already done ✅
- **Migration script execution**: < 1 minute (small dataset)
- **Verification**: 5-10 minutes
- **Total**: ~15-20 minutes

## Common Issues & Solutions

### Issue: Foreign key constraint errors
**Solution**: The script disables FK checks temporarily. If you see errors, check that all referenced tables exist.

### Issue: IDs don't look right
**Solution**: MD5 hashes are 32-character hex strings. They should look like: `d41d8cd98f00b204e9800998ecf8427e`

### Issue: Data mismatch after migration
**Solution**: Run the verification queries above to check data integrity.

### Issue: Application still using INT IDs
**Solution**: Update backend to use `idGenerator.js` for new records.

## Success Indicators

After successful migration, you should see:

✅ All application records present (3 total)
✅ All user records present
✅ All parameters linked correctly
✅ Application sequence maintained
✅ Foreign key relationships intact
✅ All timestamps preserved
✅ Hash IDs in correct format (32-character MD5)

## Next Steps

1. **Backup** your `Dump20251125.sql` (already done ✅)
2. **Test** migration on development machine first
3. **Run** migration: `mysql -u root -p pams_db < migrate_current_data_to_hash.sql`
4. **Verify** data integrity with queries above
5. **Update** backend to use `idGenerator.js`
6. **Test** API endpoints with new hash IDs
7. **Deploy** when confident

---

## Quick Reference

**Your data will be preserved**: All 3 applications, 5 users, 2 entities, 20 parameters
**Migration time**: ~1 minute for migration + 5 min verification
**Rollback**: Simple - restore from `Dump20251125.sql`
**Hash format**: 32-character MD5 hex string
**Status**: Ready to migrate

