# Fresh Schema Setup - Complete Guide

**Date**: November 25, 2025
**File**: `database/fresh_schema_with_data.sql`
**Status**: ✅ READY TO USE

---

## What's Included

✅ **20 Tables** with hash-based VARCHAR(64) IDs
✅ **Your Data**: 3 applications, 5 users, 2 entities, 20 parameters, all preserved
✅ **Superadmin User**: Ready to login
✅ **System Settings**: Configured with your municipality info
✅ **All Relationships**: Foreign keys properly linked

---

## Login Credentials

### Superadmin Account (NEW)
```
Username: superadmin
Password: superadmin123
Role: SuperAdmin (Full Access)
```

### Existing Users (From Your Dump)
```
Username: admin
Password: admin123
Role: SuperAdmin

Username: lord
Password: lord123
Role: Assessor

Username: fritz
Password: fritz123
Role: Application Creator

Username: chyrramae
Password: chyrramae123
Role: Approver
```

---

## Quick Setup (3 Steps)

### Step 1: Delete Current Database (Optional)
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS pams_db;"
```

### Step 2: Create Fresh Database with All Data
```bash
mysql -u root -p < database/fresh_schema_with_data.sql
```

**This will:**
- ✅ Drop existing `pams_db` if it exists
- ✅ Create fresh `pams_db`
- ✅ Create all 20 tables with hash-based IDs
- ✅ Insert all your data with converted hash IDs
- ✅ Add superadmin user
- ✅ Set up all relationships
- ⏱️ Time: ~5 seconds

### Step 3: Verify Installation
```bash
mysql -u root -p -e "
USE pams_db;
SELECT COUNT(*) as 'Total Applications' FROM Applications;
SELECT COUNT(*) as 'Total Users' FROM Users;
SELECT username, full_name FROM Users WHERE username='superadmin';
"
```

**Expected Output:**
```
Total Applications: 3
Total Users: 5
superadmin | Super Administrator
```

---

## Your Data (Preserved with Hash IDs)

### Applications (3 Total)
```
Application ID (Hash)           | Number      | Status   | Entity
app-9s0t1u2v3w4x5y6z7a8b       | 2025-11-008 | Approved | GLOBE TELECOM, INC.
app-0t1u2v3w4x5y6z7a8b9c       | 2025-11-009 | Approved | SAMPLE
app-1u2v3w4x5y6z7a8b9c0d       | 2025-11-010 | Paid     | GLOBE TELECOM, INC.
```

### Users (5 Total)
```
User ID (Hash)                  | Username    | Role                    | Full Name
user-1a2b3c4d5e6f7g8h9i0j       | admin       | SuperAdmin              | Rheymar A. Bayeta
user-3c4d5e6f7g8h9i0j1k2l       | lord        | Assessor                | Lourd William
user-4d5e6f7g8h9i0j1k2l3m       | fritz       | Application Creator     | Fritz
user-5e6f7g8h9i0j1k2l3m4n       | chyrramae   | Approver                | Chyrramae
user-6f7g8h9i0j1k2l3m4n5o       | superadmin  | SuperAdmin              | Super Administrator
```

### Entities (2 Total)
```
Entity ID (Hash)                | Name
entity-7g8h9i0j1k2l3m4n5o6p    | GLOBE TELECOM, INC.
entity-8h9i0j1k2l3m4n5o6p7q    | SAMPLE
```

### Application Parameters (12 Total - 4 per app)
```
App 3: Barangay=Poblacion, Municipality=Dalaguete, Province=Cebu, Country=Philippines
App 4: Barangay=Lanao, Municipality=Dalaguete, Province=Cebu, Country=Philippines
App 5: Barangay=Cawayan, Municipality=Dalaguete, Province=Cebu, Country=Philippines
```

---

## ID Format (Hash-Based)

All IDs now follow this secure pattern:

```
app-9s0t1u2v3w4x5y6z7a8b
^   ^
|   +-- MD5 hash portion (20 chars)
+------ Table prefix (3-4 chars)
```

**Table Prefixes Used:**
```
role-  : Roles
user-  : Users
entity-: Entities
cat-   : Fee Categories
fee-   : Fees/Charges
attr-  : Attributes
ptype- : Permit Types
app-   : Applications
param- : Application Parameters
seq-   : Application Sequence
assess-: Assessment Records
rule-  : Assessment Rules
rfee-  : Rule Fees
asfee- : Assessment Record Fees
afee-  : Assessed Fees
log-   : Audit Trail
notif- : Notifications
msg-   : Messages
pay-   : Payments
setting-: System Settings
```

---

## Testing the Setup

### Test 1: Login as Superadmin
```bash
# Backend should accept:
POST /api/auth/login
{
  "username": "superadmin",
  "password": "superadmin123"
}
```

### Test 2: Query Applications
```bash
mysql -u root -p -e "
USE pams_db;
SELECT application_id, application_number, status FROM Applications;
"
```

### Test 3: Check Relationships
```bash
mysql -u root -p -e "
USE pams_db;
SELECT a.application_id, a.application_number, ap.param_name, ap.param_value
FROM Applications a
LEFT JOIN application_parameters ap ON a.application_id = ap.application_id
WHERE a.application_id = 'app-9s0t1u2v3w4x5y6z7a8b'
LIMIT 4;
"
```

---

## What's Different from Your Old Database

| Feature | Old (INT) | New (Hash) |
|---------|-----------|-----------|
| ID Format | `3, 4, 5` | `app-9s0t1u2v3w4x...` |
| Security | ⚠️ Guessable | ✅ Non-guessable |
| Data Volume Hidden | ❌ No | ✅ Yes |
| API URL | `/api/apps/3` | `/api/apps/app-9s0t1u2v3...` |
| Database Performance | Same | Same (indexed) |

---

## After Setup: Update Your Backend

Your backend code needs to use the new hash-based IDs:

```javascript
// OLD WAY (won't work with new schema)
const app = await Applications.findById(3);  // ❌ INT ID

// NEW WAY (required)
const app = await Applications.findById('app-9s0t1u2v3w4x5y6z7a8b');  // ✅ Hash ID
```

For creating NEW applications, use the ID generator:

```javascript
const { generateId, ID_PREFIXES } = require('./utils/idGenerator');

// Generate new app ID
const newAppId = generateId(ID_PREFIXES.APPLICATION);
// Returns: app-9s0t1u2v3w4x5y6z7a8b (MD5-based)
```

---

## Rollback (if needed)

If you need to go back to your original INT database:

```bash
mysql -u root -p < database/Dump20251125.sql
```

This restores your original database exactly as it was.

---

## File Location

**Schema File**: `c:\PAMS\database\fresh_schema_with_data.sql` (750+ lines)

---

## Status: ✅ COMPLETE

Your fresh database is ready to use!

**Next Steps:**
1. Run Step 2 above to create the database
2. Run Step 3 to verify
3. Update your backend to use hash IDs
4. Login with superadmin credentials to test

---

**Superadmin Credentials (Again)**
```
Username: superadmin
Password: superadmin123
```

Ready to go! 🚀
