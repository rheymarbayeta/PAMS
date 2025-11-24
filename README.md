# PAMS - Permit Assessment & Management System

A comprehensive web application for managing permit applications, assessments, approvals, and renewals with role-based access control.

## Features

- **User Management**: Role-based access control (SuperAdmin, Admin, Assessor, Approver, Application Creator, Viewer)
- **Application Workflow**: Create → Assess → Approve/Reject workflow
- **Fee Management**: Dynamic fee categories and charges with assessment capabilities
- **Entity Management**: Manage permit applicants (entities)
- **Real-time Notifications**: Socket.io-based real-time notifications
- **Internal Chat**: Real-time messaging between users
- **PDF Generation**: Generate permit PDFs for approved applications
- **Application Renewal**: Clone and renew existing applications
- **Audit Trail**: Complete audit logging for all actions
- **Dashboard**: Statistics and overview of applications

## Technology Stack

### Backend
- Node.js with Express.js
- MySQL database
- JWT authentication
- Socket.io for real-time features
- PDFKit for PDF generation

### Frontend
- Next.js 14 with TypeScript
- React 18
- Tailwind CSS
- Axios for API calls
- Socket.io-client for real-time features

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- MySQL 8.0+
- Git

### Database Setup

1. Create the database and tables:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. Seed initial data:
   ```bash
   mysql -u root -p < database/seed.sql
   ```

3. Default admin credentials:
   - Username: `admin`
   - Password: `admin123`

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file (copy from `.env.example`):
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
   npm run dev
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

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
   npm run dev
   ```

   The frontend will run on `http://localhost:3000`

## Project Structure

```
PAMS/
├── backend/
│   ├── config/          # Database configuration
│   ├── middleware/      # Auth and RBAC middleware
│   ├── routes/          # API route handlers
│   ├── utils/           # Utility functions (audit, notifications, PDF)
│   └── server.js        # Main server file
├── frontend/
│   ├── app/             # Next.js app directory (pages)
│   ├── components/      # React components
│   ├── contexts/        # React contexts (Auth)
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API service layer
│   └── package.json
├── database/
│   ├── schema.sql       # Database schema
│   └── seed.sql         # Seed data
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register (admin only)

### Users
- `GET /api/users` - List users (admin)
- `POST /api/users` - Create user (admin)
- `PUT /api/users/:id` - Update user (admin)
- `DELETE /api/users/:id` - Delete user (admin)

### Applications
- `GET /api/applications` - List applications
- `GET /api/applications/:id` - Get application details
- `POST /api/applications` - Create application
- `PUT /api/applications/:id/assess` - Submit assessment
- `PUT /api/applications/:id/approve` - Approve application
- `PUT /api/applications/:id/reject` - Reject application
- `GET /api/applications/:id/print` - Generate PDF permit
- `POST /api/applications/:id/renew` - Renew application

### Fees
- `GET /api/fees/categories` - List categories
- `POST /api/fees/categories` - Create category (admin)
- `GET /api/fees/charges` - List fees
- `POST /api/fees/charges` - Create fee (admin)

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Messages
- `GET /api/messages` - Get conversation history
- `POST /api/messages` - Send message

## Role Permissions

| Feature | SuperAdmin | Admin | Assessor | Approver | App Creator | Viewer |
|---------|-----------|-------|----------|---------|-------------|--------|
| User Management | ✓ | ✓ | - | - | - | - |
| Manage Fees | ✓ | ✓ | Read | Read | Read | Read |
| Create Application | ✓ | ✓ | - | - | ✓ | - |
| View Applications | All | All | Own/Pending | Own/Pending | Own | All |
| Assess Fees | - | - | ✓ | - | - | - |
| Approve/Reject | - | - | - | ✓ | - | - |
| Print Permit | ✓ | ✓ | ✓ | ✓ | Own | ✓ |
| Internal Chat | ✓ | ✓ | ✓ | ✓ | ✓ | - |

## Development

### Running in Development Mode

Backend:
```bash
cd backend
npm run dev  # Uses nodemon for auto-reload
```

Frontend:
```bash
cd frontend
npm run dev  # Next.js development server
```

### Building for Production

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm run build
npm start
```

## Security Notes

- Change the default admin password immediately
- Use strong JWT_SECRET in production
- Configure proper CORS settings for production
- Use environment variables for sensitive data
- Implement rate limiting in production
- Use HTTPS in production

## License

This project is proprietary software.

