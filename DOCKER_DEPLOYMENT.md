# PAMS Docker Deployment Guide

This guide explains how to deploy PAMS (Permit Assessment & Management System) using Docker.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of available RAM
- At least 5GB of available disk space

## Quick Start

### 1. Clone and Configure

```bash
# Navigate to project directory
cd PAMS

# Copy environment template and configure
cp .env.example .env
```

### 2. Edit Environment Variables

Open `.env` and update the following:

```env
# Database - Use strong passwords in production!
MYSQL_ROOT_PASSWORD=your_secure_root_password
DB_NAME=pams_db
DB_USER=pams_user
DB_PASSWORD=your_secure_db_password

# JWT Secret - Use a long random string (32+ characters)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=24h

# Environment
NODE_ENV=production

# URLs (update for your domain in production)
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 3. Build and Run

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Default Login**: username: `admin`, password: `admin123`

## Docker Services

| Service | Container Name | Port | Description |
|---------|----------------|------|-------------|
| mysql | pams-mysql | 3306 | MySQL 8.0 Database |
| backend | pams-backend | 5000 | Node.js API Server |
| frontend | pams-frontend | 3000 | Next.js Web Application |

## Common Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### Rebuild Services
```bash
docker-compose up -d --build
```

### Access Container Shell
```bash
# Backend
docker exec -it pams-backend sh

# MySQL
docker exec -it pams-mysql mysql -u root -p
```

### Reset Database
```bash
# Stop services and remove volumes
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## Development Mode

For development with hot-reloading:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

This mounts local source code into containers for live updates.

## Production Deployment

### Security Checklist

- [ ] Change all default passwords in `.env`
- [ ] Use a strong JWT_SECRET (32+ random characters)
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper domain URLs
- [ ] Set up SSL/HTTPS (use a reverse proxy like Nginx or Traefik)
- [ ] Restrict database port exposure (remove port mapping in production)
- [ ] Set up regular database backups
- [ ] Configure firewall rules

### Production Environment Variables

```env
MYSQL_ROOT_PASSWORD=very_strong_random_password_here
DB_NAME=pams_db
DB_USER=pams_user
DB_PASSWORD=another_strong_random_password

JWT_SECRET=generate_a_64_character_random_string_for_production
JWT_EXPIRES_IN=8h
NODE_ENV=production

FRONTEND_URL=https://pams.yourdomain.com
NEXT_PUBLIC_API_URL=https://api.pams.yourdomain.com
```

### Generating Secure Secrets

```bash
# Generate a secure JWT secret
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Using with Reverse Proxy (Nginx Example)

Create an `nginx.conf` for SSL termination:

```nginx
server {
    listen 80;
    server_name pams.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pams.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.pams.yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location / {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Data Persistence

Data is persisted using Docker volumes:

| Volume | Purpose |
|--------|---------|
| `mysql_data` | MySQL database files |
| `backend_uploads` | Uploaded files and templates |

### Backup Database

```bash
# Create backup
docker exec pams-mysql mysqldump -u root -p pams_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i pams-mysql mysql -u root -p pams_db < backup_20251128.sql
```

## Troubleshooting

### Container Won't Start

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs --tail=100 backend
```

### Database Connection Error

1. Ensure MySQL container is healthy:
   ```bash
   docker-compose ps mysql
   ```

2. Wait for MySQL to fully initialize (first run takes 30-60 seconds)

3. Check database credentials in `.env`

### Frontend Can't Connect to Backend

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Check if backend is running:
   ```bash
   curl http://localhost:5000/api/health
   ```

### Port Already in Use

Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # Use port 8080 instead of 3000
```

### Clear Everything and Start Fresh

```bash
# Stop and remove containers, networks, and volumes
docker-compose down -v --rmi all

# Rebuild from scratch
docker-compose up -d --build
```

## Health Checks

The application includes health checks for all services:

- **Backend**: `GET http://localhost:5000/api/health`
- **MySQL**: `mysqladmin ping`
- **Frontend**: `GET http://localhost:3000`

View health status:
```bash
docker-compose ps
```

## Architecture Diagram

```
                    ┌─────────────────┐
                    │   Browser       │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Frontend       │
                    │  (Next.js)      │
                    │  Port: 3000     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  Backend        │
                    │  (Express.js)   │
                    │  Port: 5000     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  MySQL          │
                    │  Database       │
                    │  Port: 3306     │
                    └─────────────────┘
```

## Support

For issues:
1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Review environment variables in `.env`
4. Check the main `PAMS_DOCUMENTATION.md` for application-specific issues
