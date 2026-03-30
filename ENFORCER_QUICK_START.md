# Enforcer Management - Quick Start Guide

## 5-Minute Setup

### Step 1: Apply Database Migration (1 minute)
```bash
# Connect to MySQL and run the migration
mysql -u your_username -p your_database < database/migrations/create_enforcers_table.sql

# Verify the table was created
mysql -u your_username -p your_database -e "SHOW TABLES LIKE 'enforcers';"
mysql -u your_username -p your_database -e "DESCRIBE enforcers;"
```

### Step 2: Verify Backend Routes (1 minute)
The routes are already registered in `backend/server.js`. Just restart your backend:
```bash
# Restart Node.js backend
npm restart
# or
node server.js
```

### Step 3: Access the Frontend (1 minute)
1. Open browser: `http://localhost:3000/admin/enforcers`
2. Login with Admin or SuperAdmin account
3. You should see the Enforcer Management dashboard

### Step 4: Create Your First Enforcer (2 minutes)
1. Click "Add Enforcer" button
2. Fill in required fields:
   - Badge Number: e.g., "ENF001"
   - Full Name: e.g., "John Doe"
3. Optional: Add email, phone, department, station, etc.
4. Click "Create Enforcer"
5. Enforcer appears in the table

## Features Overview

### Dashboard Stats
- **Total Enforcers**: Count of all enforcers
- **Active**: Currently working enforcers
- **Suspended**: Temporarily off duty
- **Citations**: Total citations issued by all
- **Fines**: Total fine amounts collected

### Filtering & Search
- **Search Box**: Find by name or badge number
- **Status Filter**: Active, Inactive, Suspended, On Leave
- **Department Filter**: Organization structure
- **Station Filter**: Geographic location
- **Reset Button**: Clear all filters

### Table Actions
- **View Details** (👁️): See full enforcer profile + statistics
- **Edit** (✏️): Update enforcer information
- **Delete** (🗑️): Remove enforcer (SuperAdmin only)

## Common Tasks

### Task: Add a New Enforcer
1. Click "Add Enforcer"
2. Enter badge number (must be unique)
3. Enter full name
4. Optional: email, phone, position, department, station
5. Set status (default: Active)
6. Click "Create Enforcer"

### Task: Update Enforcer Information
1. Find enforcer in table
2. Click "Edit" button
3. Update desired fields
4. Click "Update Enforcer"

### Task: View Enforcer Performance
1. Click enforcer name or "View Details"
2. See detail panel with:
   - Basic info (position, department, station)
   - Contact info (email, phone, hire date)
   - Performance metrics (citations, fines, average)

### Task: Filter by Department
1. Select department from "Department" dropdown
2. Table updates automatically
3. Stats recalculate for filtered set
4. Click "Reset Filters" to see all

### Task: Search for Specific Enforcer
1. Type name or badge number in search box
2. Table filters in real-time
3. Results update as you type

## API Testing (Optional)

### Test List Endpoint
```bash
curl -X GET "http://localhost:5000/api/enforcers" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Create Endpoint
```bash
curl -X POST "http://localhost:5000/api/enforcers" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "badge_number": "ENF001",
    "full_name": "John Doe",
    "position": "Officer",
    "department": "Traffic"
  }'
```

### Test Statistics Endpoint
```bash
curl -X GET "http://localhost:5000/api/enforcers/stats/summary" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Pagination

- **Default**: 10 items per page
- **Maximum**: 100 items per page
- **Navigation**: Previous/Next buttons + page numbers
- **Display**: Shows current range (e.g., "Showing 1 to 10 of 150")

## Status Lifecycle

**Active** → Most common status, enforcer is working
↓
**On Leave** → Temporary absence
↓
**Inactive** → Not currently working
↓
**Suspended** → Disciplinary action

## Role-Based Access

| Action | SuperAdmin | Admin | Others |
|--------|-----------|-------|--------|
| View Enforcers | ✅ | ✅ | ✅ |
| View Details | ✅ | ✅ | ✅ |
| Create | ✅ | ✅ | ❌ |
| Edit | ✅ | ✅ | ❌ |
| Delete | ✅ | ❌ | ❌ |

## Data Fields Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Badge Number | String | Yes | Unique identifier (e.g., ENF001) |
| Full Name | String | Yes | Officer's full name |
| Email | Email | No | Contact email |
| Phone | Tel | No | Contact phone |
| Position | String | No | Job title (Officer, Supervisor, etc.) |
| Department | String | No | Organizational unit (Traffic, Enforcement) |
| Station | String | No | Work location (Downtown, Airport) |
| Status | Enum | Auto | Active/Inactive/Suspended/On Leave |
| Date Hired | Date | No | Employment start date |

## Troubleshooting

### Problem: "Cannot find enforcers page"
- **Solution**: Make sure you're logged in as Admin or SuperAdmin
- **Check**: Browser console (F12) for error messages

### Problem: "Enforcer list is empty"
- **Solution**: Click "Add Enforcer" to create first record
- **Check**: Database migration was applied

### Problem: "Cannot delete enforcer"
- **Solution**: Enforcer may have active citations
- **Action**: Need to be SuperAdmin to delete

### Problem: "Badge number error"
- **Solution**: Badge number must be unique
- **Action**: Use different badge number

### Problem: "Filter not working"
- **Solution**: Clear browser cache (Ctrl+Shift+Delete)
- **Verify**: All data is in database

## Next Steps

1. **Create Initial Enforcers**: Add your team members
2. **Link to Citations**: Run migration to auto-link table
3. **Monitor Dashboard**: Check statistics
4. **Test Filtering**: Verify department/station filters work
5. **Integrate with Citations**: Link citations to enforcers

## Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Check backend logs (terminal output)
3. Verify database table exists: `SHOW TABLES LIKE 'enforcers';`
4. Test API endpoint directly with curl
5. Check database migration output for errors

## Performance Notes

- Pagination limit: 20 items default
- Search is real-time on frontend
- Stats load once on page load
- Filtering is instant (no backend delay)
- Scales to 10,000+ enforcers with pagination

---

**Ready to go!** Your Enforcer Management System is now operational.
