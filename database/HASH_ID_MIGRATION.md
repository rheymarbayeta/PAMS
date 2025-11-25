# PAMS Database ID Migration to Hash-Based System

## Overview

This migration converts all database table IDs from sequential `INT AUTO_INCREMENT` to hash-based `VARCHAR(64)` format. This approach provides:

- **Security**: Sequential IDs expose data volume and patterns
- **Scalability**: Hash-based IDs work better in distributed systems
- **API Safety**: Prevents ID enumeration attacks
- **Privacy**: Obfuscates internal data relationships

## Hash ID Format

All IDs are generated using MD5 hashing with the following pattern:
```
MD5(CONCAT('prefix-', original_id))
```

**Examples:**
- `role_id`: `MD5(CONCAT('role-', 1))` → `d4d6d3d4d6d3...` (64 chars)
- `user_id`: `MD5(CONCAT('user-', 1))`
- `application_id`: `MD5(CONCAT('app-', 1))`

Each table type has a unique prefix to prevent ID collisions across tables.

## Affected Tables

The following tables have been converted to use hash-based IDs:

### Core Tables
1. **Roles** - role_id
2. **Users** - user_id (with role_id foreign key)
3. **Entities** - entity_id
4. **Applications** - application_id (with entity_id, creator_id, assessor_id, approver_id foreign keys)

### Parameter & Dynamic Data
5. **Application_Parameters** - parameter_id (with application_id foreign key)

### Fees & Charges
6. **Fees_Categories** - category_id
7. **Fees_Charges** - fee_id (with category_id foreign key)
8. **Assessed_Fees** - assessed_fee_id (with application_id, fee_id, assessed_by_user_id foreign keys)

### Audit & Communication
9. **Audit_Trail** - log_id (with user_id, application_id foreign keys)
10. **Notifications** - notification_id (with user_id foreign key)
11. **Messages** - message_id (with sender_id, recipient_id, application_context_id foreign keys)

### Payments
12. **Payments** - payment_id (with application_id, recorded_by_user_id foreign keys)

### Permit Management
13. **Permit_Types** - permit_type_id (with attribute_id foreign key)
14. **Permit_Type_Fees** - permit_type_fee_id (with permit_type_id, fee_id foreign keys)
15. **Attributes** - attribute_id

### Assessment & Rules
16. **Assessment_Rules** - rule_id (with permit_type_id, attribute_id foreign keys)
17. **Assessment_Rule_Fees** - rule_fee_id (with rule_id, fee_id foreign keys)
18. **Assessment_Records** - assessment_id (with application_id, prepared_by_user_id, approved_by_user_id foreign keys)
19. **Assessment_Record_Fees** - record_fee_id (with assessment_id, fee_id foreign keys)

### System Configuration
20. **System_Settings** - setting_id

## Migration Process

### For Existing Databases

To migrate an existing database with INT IDs to hash-based IDs:

1. **Backup your database** (CRITICAL)
   ```bash
   mysqldump -u root -p pams_db > pams_db_backup.sql
   ```

2. **Run the migration script**
   ```bash
   mysql -u root -p pams_db < database/migrations/convert_ids_to_hash.sql
   ```

3. **Verify the migration**
   - Check that all tables have the new VARCHAR(64) primary keys
   - Verify foreign key constraints are properly maintained
   - Test that application functionality works correctly

### For New Installations

Use the updated `database/schema.sql` which already includes hash-based IDs:

```bash
mysql -u root -p < database/schema.sql
```

Then run other migrations normally (they've been updated to use hash IDs):

```bash
mysql -u root -p pams_db < database/migrations/add_permit_types.sql
mysql -u root -p pams_db < database/migrations/add_assessment_records.sql
mysql -u root -p pams_db < database/migrations/create_attributes_table.sql
# ... etc
```

## Hash ID Prefixes Reference

| Table | Prefix | Example |
|-------|--------|---------|
| Roles | `role-` | `role-1` |
| Users | `user-` | `user-1` |
| Entities | `entity-` | `entity-1` |
| Applications | `app-` | `app-1` |
| Application_Parameters | `param-` | `param-1` |
| Fees_Categories | `cat-` | `cat-1` |
| Fees_Charges | `fee-` | `fee-1` |
| Assessed_Fees | `afee-` | `afee-1` |
| Audit_Trail | `log-` | `log-1` |
| Notifications | `notif-` | `notif-1` |
| Messages | `msg-` | `msg-1` |
| Payments | `pay-` | `pay-1` |
| Permit_Types | `ptype-` | `ptype-1` |
| Permit_Type_Fees | `ptfee-` | `ptfee-1` |
| Attributes | `attr-` | `attr-1` |
| Assessment_Rules | `rule-` | `rule-1` |
| Assessment_Rule_Fees | `rfee-` | `rfee-1` |
| Assessment_Records | `assess-` | `assess-1` |
| Assessment_Record_Fees | `rfee-` | `rfee-1` |
| System_Settings | `setting-` | `setting-1` |

## Backend Implementation

### NodeJS Integration

Update your backend code to generate hash IDs when creating new records:

```javascript
const crypto = require('crypto');

function generateHashId(prefix) {
  const randomPart = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
  return crypto.createHash('md5').update(`${prefix}-${randomPart}-${Date.now()}`).digest('hex');
}

// Usage
const userId = generateHashId('user');
const applicationId = generateHashId('app');
```

Or use UUID v5 with namespaces for deterministic hashes:

```javascript
const { v5: uuidv5 } = require('uuid');
const NAMESPACE_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function generateHashId(prefix) {
  return uuidv5(`${prefix}-${Date.now()}-${Math.random()}`, NAMESPACE_UUID);
}
```

### Database Query Examples

```sql
-- Insert with new hash ID
INSERT INTO Users (user_id, username, password_hash, full_name, role_id)
VALUES (MD5(CONCAT('user-', RAND(), '-', NOW())), 'john_doe', '...', 'John Doe', role_hash_id);

-- Select by hash ID
SELECT * FROM Users WHERE user_id = 'd41d8cd98f00b204e9800998ecf8427e';

-- Join operations work the same way
SELECT a.application_id, u.user_name
FROM Applications a
JOIN Users u ON a.creator_id = u.user_id
WHERE a.entity_id = 'entity_hash_id';
```

## Frontend Changes

No significant frontend changes needed. API endpoints will continue to work with hash IDs:

```javascript
// Same API calls, just with hash IDs now
const response = await fetch(`/api/applications/${applicationHashId}`);
```

## Performance Considerations

1. **Index Performance**: VARCHAR(64) indexes are slightly larger than INT indexes but perform similarly for most queries
2. **Storage**: Approximately 4x larger per ID (64 bytes vs 16 bytes), but acceptable for most applications
3. **Query Performance**: No significant performance degradation; indexes remain effective

## Rollback Procedure

If you need to rollback to INT IDs:

1. Restore from backup:
   ```bash
   mysql -u root -p pams_db < pams_db_backup.sql
   ```

2. Or create a reverse migration (contact development team)

## Testing Checklist

After migration, verify:

- [ ] All tables use VARCHAR(64) primary keys
- [ ] All foreign key relationships are intact
- [ ] Indexes are properly created
- [ ] New record creation works with hash IDs
- [ ] API endpoints return correct hash IDs
- [ ] Dashboard and reports display correctly
- [ ] Searches and filters work as expected
- [ ] Exports (PDF, CSV) generate properly
- [ ] User authentication works correctly
- [ ] Audit trails record operations properly

## Migration Files

- **Migration Script**: `database/migrations/convert_ids_to_hash.sql` - For existing databases
- **Updated Schema**: `database/schema.sql` - For new installations
- **Updated Migrations**: All migration files in `database/migrations/` - Updated for hash IDs

## Support

For questions or issues with the migration, please refer to:
1. The migration script comments
2. The hash ID generation examples
3. Database logs for any constraint violations

---

**Last Updated**: November 25, 2025
**Status**: Ready for deployment
