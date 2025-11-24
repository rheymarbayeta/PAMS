# Database Setup Instructions

## Prerequisites
- MySQL 8.0 or higher
- MySQL user with CREATE DATABASE privileges

## Setup Steps

1. **Create the database and tables:**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. **Run migrations (if any):**
   ```bash
   mysql -u root -p < database/migrations/add_application_number.sql
   ```

3. **Seed initial data:**
   ```bash
   mysql -u root -p < database/seed.sql
   ```

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`

**Note:** Change the default admin password immediately after first login in production!

## Database Configuration
Update the following environment variables in your backend `.env` file:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pams_db
```

## Application Number Format
Applications are automatically assigned a unique number in the format: `YYYY-MM-NNN`
- YYYY: Year (e.g., 2024)
- MM: Month (e.g., 01 for January)
- NNN: Sequential number for that month (e.g., 001, 002, 003...)

Example: `2024-01-001` (First application in January 2024)
