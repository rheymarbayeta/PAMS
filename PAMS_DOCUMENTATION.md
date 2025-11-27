# PAMS - Permit Assessment & Management System

## Complete Documentation & Implementation Guide

**Version:** 1.0  
**Last Updated:** November 27, 2025  
**Status:** ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Quick Start](#quick-start)
5. [Database Setup](#database-setup)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [Login Credentials](#login-credentials)
9. [Project Structure](#project-structure)
10. [API Endpoints](#api-endpoints)
11. [Role Permissions](#role-permissions)
12. [Hash ID System](#hash-id-system)
13. [Database Schema](#database-schema)
14. [Logo Setup](#logo-setup)
15. [Production Deployment](#production-deployment)
16. [Troubleshooting](#troubleshooting)

---

## Overview

PAMS (Permit Assessment & Management System) is a comprehensive web application for managing permit applications, assessments, approvals, and renewals with role-based access control. The system uses secure hash-based IDs (VARCHAR(64)) for all database records.

---

## Features

- **User Management**: Role-based access control (SuperAdmin, Admin, Assessor, Approver, Application Creator, Viewer)
- **Application Workflow**: Create → Assess → Approve/Reject → Pay → Issue → Release workflow
- **Fee Management**: Dynamic fee categories and charges with assessment capabilities
- **Entity Management**: Manage permit applicants (businesses/entities)
- **Permit Types**: Configurable permit types with attributes and validity periods
- **Assessment Rules**: Define fee structures per permit type and attribute
- **Real-time Notifications**: Socket.io-based real-time notifications
- **Internal Chat**: Real-time messaging between users
- **Document Generation**: Generate permits using DOCX templates (docxtemplater)
- **Application Renewal**: Clone and renew existing applications
- **Payment Recording**: Track payments with receipt numbers
- **Audit Trail**: Complete audit logging for all actions
- **Dashboard**: Statistics and overview of applications
- **System Settings**: Configurable signatory names, default addresses, etc.

---

## Technology Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: MySQL 8.0+
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **Document Generation**: docxtemplater for DOCX templates
- **ID Generation**: Secure hash-based IDs (MD5)

### Frontend
- **Framework**: Next.js 14 with TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client

---

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- Git

### 3-Step Setup

```bash
# Step 1: Setup Database
mysql -u root -p < database/schema_empty.sql

# Step 2: Start Backend
cd backend
npm install
# Create .env file (see Backend Setup section)
npm run dev

# Step 3: Start Frontend
cd frontend
npm install
# Create .env.local file
npm run dev
```

---

## Database Setup

### Option 1: Fresh Empty Database (Recommended for New Installations)

```bash
mysql -u root -p < database/schema_empty.sql
```

This creates:
- ✅ All 21 tables with hash-based VARCHAR(64) IDs
- ✅ Default roles (SuperAdmin, Admin, Assessor, Approver, Application Creator, Viewer)
- ✅ Default admin user (username: admin, password: admin123)
- ❌ No sample data

### Option 2: Import Existing Dump

```bash
mysql -u root -p < database/Dump20251127.sql
```

---

## Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=pams_db
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   JWT_EXPIRES_IN=24h
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the server:
   ```bash
   npm run dev    # Development (with nodemon)
   npm start      # Production
   ```

   The backend runs on `http://localhost:5000`

---

## Frontend Setup

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```

4. Start the development server:
   ```bash
   npm run dev    # Development
   npm run build  # Production build
   npm start      # Production server
   ```

   The frontend runs on `http://localhost:3000`

---

## Login Credentials

### Default Admin Account
| Field | Value |
|-------|-------|
| Username | admin |
| Password | admin123 |
| Role | SuperAdmin |

### Additional Default Users (if using full dump)
| Username | Password | Role |
|----------|----------|------|
| superadmin | superadmin123 | SuperAdmin |
| lord | lord123 | Assessor |
| fritz | fritz123 | Application Creator |
| chyrramae | chyrramae123 | Approver |

**⚠️ Security Note**: Change all default passwords immediately in production!

---

## Project Structure

```
PAMS/
├── backend/
│   ├── config/
│   │   └── database.js          # MySQL connection pool
│   ├── middleware/
│   │   ├── auth.js              # JWT authentication & RBAC
│   │   └── upload.js            # File upload handling
│   ├── routes/
│   │   ├── addresses.js         # Address lookup endpoints
│   │   ├── applications.js      # Application CRUD & workflow
│   │   ├── assessmentRules.js   # Assessment rule management
│   │   ├── attributes.js        # Permit attributes
│   │   ├── auth.js              # Login/register
│   │   ├── dashboard.js         # Statistics
│   │   ├── entities.js          # Business entities
│   │   ├── fees.js              # Fee categories & charges
│   │   ├── messages.js          # Internal chat
│   │   ├── notifications.js     # User notifications
│   │   ├── permitTypes.js       # Permit type management
│   │   ├── roles.js             # Role management
│   │   ├── settings.js          # System settings
│   │   ├── templates.js         # Document templates
│   │   └── users.js             # User management
│   ├── scripts/
│   │   ├── clearApplicationsAndAssessments.js
│   │   └── resetAdminPassword.js
│   ├── uploads/
│   │   └── templates/           # DOCX template storage
│   ├── utils/
│   │   ├── applicationNumberGenerator.js
│   │   ├── auditLogger.js       # Audit trail logging
│   │   ├── documentGenerator.js # DOCX generation
│   │   ├── idGenerator.js       # Hash ID generation
│   │   ├── notificationService.js
│   │   └── pdfGenerator.js
│   └── server.js                # Express server entry point
├── frontend/
│   ├── app/                     # Next.js App Router pages
│   ├── components/              # React components
│   ├── contexts/                # React contexts (Auth)
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # API service layer
│   └── utils/                   # Utility functions
├── database/
│   ├── schema_empty.sql         # Empty schema (recommended)
│   ├── Dump20251127.sql         # Full dump with data
│   └── migrations/              # SQL migration scripts
└── PAMS_DOCUMENTATION.md        # This file
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/register` | Register new user (admin only) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List applications |
| GET | `/api/applications/:id` | Get application details |
| POST | `/api/applications` | Create application |
| PUT | `/api/applications/:id/assess` | Submit assessment |
| PUT | `/api/applications/:id/approve` | Approve application |
| PUT | `/api/applications/:id/reject` | Reject application |
| POST | `/api/applications/:id/payment` | Record payment |
| POST | `/api/applications/:id/issue` | Issue permit |
| POST | `/api/applications/:id/release` | Release permit |
| POST | `/api/applications/:id/renew` | Renew application |
| DELETE | `/api/applications/:id` | Delete application |

### Fees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fees/categories` | List fee categories |
| POST | `/api/fees/categories` | Create category |
| GET | `/api/fees/charges` | List fees |
| POST | `/api/fees/charges` | Create fee |
| PUT | `/api/fees/charges/:id` | Update fee |
| DELETE | `/api/fees/charges/:id` | Delete fee |

### Entities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/entities` | List entities |
| POST | `/api/entities` | Create entity |
| PUT | `/api/entities/:id` | Update entity |
| DELETE | `/api/entities/:id` | Delete entity |

### Permit Types
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/permit-types` | List permit types |
| POST | `/api/permit-types` | Create permit type |
| PUT | `/api/permit-types/:id` | Update permit type |
| DELETE | `/api/permit-types/:id` | Delete permit type |

### Notifications & Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/:id/read` | Mark as read |
| GET | `/api/messages` | Get conversation history |
| POST | `/api/messages` | Send message |

### Dashboard & Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get dashboard statistics |
| GET | `/api/settings` | Get system settings |
| PUT | `/api/settings` | Update system settings |

---

## Role Permissions

| Feature | SuperAdmin | Admin | Assessor | Approver | App Creator | Viewer |
|---------|:----------:|:-----:|:--------:|:--------:|:-----------:|:------:|
| User Management | ✓ | ✓ | - | - | - | - |
| Manage Fees | ✓ | ✓ | Read | Read | Read | Read |
| Create Application | ✓ | ✓ | - | - | ✓ | - |
| View Applications | All | All | Assigned | Assigned | Own | All |
| Assess Fees | ✓ | - | ✓ | - | - | - |
| Approve/Reject | ✓ | - | - | ✓ | - | - |
| Record Payment | ✓ | ✓ | ✓ | ✓ | - | - |
| Issue Permit | ✓ | ✓ | - | - | - | - |
| Release Permit | ✓ | ✓ | - | - | - | - |
| Generate Documents | ✓ | ✓ | ✓ | ✓ | Own | ✓ |
| Internal Chat | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| System Settings | ✓ | ✓ | - | - | - | - |

---

## Hash ID System

All database records use secure hash-based IDs (VARCHAR(64)) instead of auto-increment integers.

### Benefits
- **Security**: Non-sequential, non-guessable IDs
- **Privacy**: Hides data volume and relationships
- **Scalability**: Ready for distributed systems
- **API Safety**: IDs obfuscated in URLs

### ID Format
```
64-character hexadecimal hash

Examples:
user-1a2b3c4d5e6f7g8h9i0j
cab877a6d1dae46cfa2ec26ec9467d5f
2a26825567df00e0bac462f17b961a0a
```

### Generation
```javascript
const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
const newId = generateId(ID_PREFIXES.USER);
```

---

## Database Schema

### Tables (21 Total)

#### Core Infrastructure
| Table | Primary Key | Description |
|-------|-------------|-------------|
| roles | role_id | User roles |
| users | user_id | System users |
| entities | entity_id | Businesses/applicants |

#### Permit Configuration
| Table | Primary Key | Description |
|-------|-------------|-------------|
| attributes | attribute_id | Permit attributes (e.g., Cell Site, Perya) |
| permit_types | permit_type_id | Types of permits |
| permit_type_fees | permit_type_fee_id | Default fees per permit type |

#### Fee Management
| Table | Primary Key | Description |
|-------|-------------|-------------|
| fees_categories | category_id | Fee categories |
| fees_charges | fee_id | Individual fees |

#### Assessment Rules
| Table | Primary Key | Description |
|-------|-------------|-------------|
| assessment_rules | rule_id | Assessment rules per permit/attribute |
| assessment_rule_fees | rule_fee_id | Fees included in rules |

#### Application Lifecycle
| Table | Primary Key | Description |
|-------|-------------|-------------|
| applications | application_id | Permit applications |
| application_parameters | parameter_id | Application metadata |
| application_sequence | sequence_id | Application number generation |
| assessed_fees | assessed_fee_id | Fees assessed to applications |
| assessment_records | assessment_id | Assessment summaries |
| assessment_record_fees | record_fee_id | Fees in assessment records |
| payments | payment_id | Payment records |

#### System Features
| Table | Primary Key | Description |
|-------|-------------|-------------|
| notifications | notification_id | User notifications |
| messages | message_id | Internal chat messages |
| audit_trail | log_id | Audit logs |
| system_settings | setting_id | System configuration |
| report_templates | template_id | DOCX templates |

---

## Logo Setup

### Frontend Logo
Place your logo in:
```
frontend/public/dalaguete-logo.png
```

### Backend Logo (for document generation)
Place your logo in:
```
backend/assets/dalaguete-logo.png
```

### Requirements
- **Format**: PNG (recommended) or JPG
- **Size**: 200x200 pixels or larger (square format)
- **File name**: Must be exactly `dalaguete-logo.png`

---

## Production Deployment

### Security Checklist
- [ ] Change all default passwords
- [ ] Use strong JWT_SECRET (32+ random characters)
- [ ] Set NODE_ENV=production
- [ ] Configure proper CORS settings
- [ ] Use HTTPS
- [ ] Implement rate limiting
- [ ] Use environment variables for all secrets
- [ ] Set up database backups

### Environment Variables

**Backend (.env)**
```env
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-strong-password
DB_NAME=pams_db
JWT_SECRET=your-very-long-random-secret-key-at-least-32-chars
JWT_EXPIRES_IN=8h
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

---

## Troubleshooting

### Common Issues

#### "Field doesn't have a default value" Error
All INSERT operations must include hash IDs. This is handled automatically by the backend using `generateId()`.

#### Database Connection Failed
1. Verify MySQL is running
2. Check credentials in `.env`
3. Ensure database exists: `CREATE DATABASE pams_db;`

#### CORS Errors
Update `FRONTEND_URL` in backend `.env` to match your frontend URL.

#### JWT Token Expired
Default expiration is 24h. Adjust `JWT_EXPIRES_IN` in `.env` if needed.

### Reset Admin Password
```bash
cd backend
node scripts/resetAdminPassword.js
```

### Clear All Applications
```bash
cd backend
node scripts/clearApplicationsAndAssessments.js
```

### Database Verification
```sql
-- Check table counts
SELECT 'users' as tbl, COUNT(*) as cnt FROM users
UNION SELECT 'roles', COUNT(*) FROM roles
UNION SELECT 'applications', COUNT(*) FROM applications
UNION SELECT 'entities', COUNT(*) FROM entities;

-- Verify hash IDs
SELECT user_id, username FROM users LIMIT 5;
```

---

## Support

For issues or questions:
1. Check this documentation
2. Review the audit trail for error context
3. Check backend console logs
4. Verify database connections

---

*This documentation consolidates all PAMS implementation guides and references.*
