# Backend Dockerfile
FROM node:20-alpine

# Install Chromium and system fonts required by Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto

# Tell Puppeteer to skip downloading bundled Chromium and use the system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY backend/ .

# Copy database migrations
COPY database/migrations/ ./database/migrations/

# Create uploads directory
RUN mkdir -p uploads/templates

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]
