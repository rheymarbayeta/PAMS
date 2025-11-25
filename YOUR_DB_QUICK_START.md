# Your Database Migration - Quick Start

## What You Have
- ✅ Current database dump: `Dump20251125.sql` (746 lines)
- ✅ 3 live applications (IDs: 3, 4, 5)
- ✅ 5 users, 2 entities
- ✅ 20 application parameters
- ✅ All production data preserved

## What You Need
1. Migration script: `migrate_current_data_to_hash.sql` ✅ CREATED
2. Backend utility: `idGenerator.js` ✅ CREATED
3. Documentation: CREATED ✅

## 3-Step Migration

### Step 1: Restore Your Dump
```bash
mysql -u root -p pams_db < database/Dump20251125.sql
```
**Time**: ~10 seconds
**Result**: Database restored with INT IDs

### Step 2: Run Migration
```bash
mysql -u root -p pams_db < database/migrations/migrate_current_data_to_hash.sql
```
**Time**: ~1 minute
**Result**: All IDs converted to hashes

### Step 3: Verify
```bash
mysql -u root -p -e "SELECT COUNT(*) FROM pams_db.Applications;"
```
**Expected**: 3 records
**Format**: `application_id` = 32-char hash

## Your Data After Migration

| Table | Before | After | Status |
|-------|--------|-------|--------|
| Applications | 3 records (IDs: 3,4,5) | 3 records (hash IDs) | ✅ Preserved |
| Users | 5 records (IDs: 1,3,4,5) | 5 records (hash IDs) | ✅ Preserved |
| Entities | 2 records | 2 records | ✅ Preserved |
| Parameters | 20 records | 20 records | ✅ Preserved |

## Hash ID Examples

Your IDs will convert as:
```
Application 3  → d9b08da0c58e...  (md5('app-3'))
Application 4  → 77153a8db76b...  (md5('app-4'))
Application 5  → ca5f4e90ba...    (md5('app-5'))
User 1         → cee282d6a76e...  (md5('user-1'))
Entity 1       → e94e5c10847...   (md5('entity-1'))
```

## Key Files

| File | Purpose | Location |
|------|---------|----------|
| Original Dump | Your current DB backup | `Dump20251125.sql` |
| Migration | Convert your data | `migrations/migrate_current_data_to_hash.sql` |
| ID Generator | Generate hash IDs in backend | `backend/utils/idGenerator.js` |
| Integration Guide | Full details | `INTEGRATION_GUIDE_YOUR_DATABASE.md` |

## Backend After Migration

**Update backend to use:**
```javascript
const { generateId, ID_PREFIXES } = require('./utils/idGenerator');

// For new applications
const appId = generateId(ID_PREFIXES.APPLICATION);

// For new users  
const userId = generateId(ID_PREFIXES.USER);
```

## Verification Checklist

After migration:
- [ ] All 3 applications present
- [ ] All 5 users linked correctly
- [ ] All parameters still connected
- [ ] Hash IDs are 32-character strings
- [ ] No data lost
- [ ] Foreign keys intact

## Rollback (If Needed)

```bash
mysql -u root -p -e "DROP DATABASE pams_db;"
mysql -u root -p pams_db < database/Dump20251125.sql
```

## Timeline

| Step | Time | Status |
|------|------|--------|
| Restore dump | 10 sec | Quick |
| Run migration | 1 min | Fast |
| Verify data | 5 min | Easy |
| Update backend | 10 min | Simple |
| **Total** | **~20 min** | **DONE** |

## Status

✅ **Ready to migrate your current database**

All files prepared:
- Migration script: ✅ Complete
- Documentation: ✅ Comprehensive
- Backend utilities: ✅ Ready

**Next action**: Run the 3-step migration above

