const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const pool = require('./config/database');
const { setSocketIO } = require('./utils/notificationService');
const { runMigrations } = require('./utils/migrationRunner');
const { verifyToken, loadUserWithRoles, authenticate, requirePermission } = require('./middleware/auth');
const logger = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const feeRoutes = require('./routes/fees');
const entityRoutes = require('./routes/entities');
const attributeRoutes = require('./routes/attributes');
const permitTypeRoutes = require('./routes/permitTypes');
const assessmentRuleRoutes = require('./routes/assessmentRules');
const applicationRoutes = require('./routes/applications');
const notificationRoutes = require('./routes/notifications');
const dashboardRoutes = require('./routes/dashboard');
const messageRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');
const addressRoutes = require('./routes/addresses');
const reportRoutes = require('./routes/reports');
const reportTemplateRoutes = require('./routes/reportTemplates');
const citationRoutes = require('./routes/citations');
const enforcerRoutes = require('./routes/enforcers');
const quantityFeeRoutes = require('./routes/quantityFees');
const rightsAndRentalsRoutes = require('./routes/rightsAndRentals');
const priceMonitoringRoutes = require('./routes/priceMonitoring');
const waterworksRoutes = require('./routes/waterworks');
const tasksRoutes = require('./routes/tasks');
const jobsRoutes = require('./routes/jobs');
const auditRoutes = require('./routes/audit');
const paymentsLedgerRoutes = require('./routes/paymentsLedger');
const orgUnitsRoutes = require('./routes/orgUnits');
const approvalChainsRoutes = require('./routes/approvalChains');
const attachmentsRoutes = require('./routes/attachments');
const scheduledReportsRoutes = require('./routes/scheduledReports');
const portalRoutes = require('./routes/portal');
const integrationsRoutes = require('./routes/integrations');
const anomaliesRoutes = require('./routes/anomalies');
const portalPaymentsRoutes = require('./routes/portalPayments');
const { getDetailedHealth } = require('./utils/healthCheck');
const { startScheduler } = require('./utils/reportScheduler');
const { recoverDurableJobs } = require('./utils/jobQueue');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Socket.IO CORS configuration
const socketCorsOptions = {
  origin: ['http://localhost:6070', 'http://127.0.0.1:6070', 'http://192.168.11.17:6070', process.env.FRONTEND_URL || 'http://localhost:3000'],
  methods: ['GET', 'POST']
};

const io = new Server(server, {
  cors: socketCorsOptions
});

// Middleware
// CORS configuration - allow multiple origins for development/production flexibility
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:6070',
      'http://127.0.0.1:6070',
      'http://192.168.11.17:6070',
      // Expo dev server (web + Metro)
      'http://localhost:8081',
      'http://localhost:8082',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:8082',
      'http://192.168.11.17:8081',
      'http://192.168.11.17:8082',
    ];

    if (process.env.CORS_ALLOWED_ORIGINS) {
      allowedOrigins.push(
        ...process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
      );
    }

    const expoDevOrigin =
      /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):(8081|8082|19006)$/;

    if (
      allowedOrigins.includes(origin) ||
      expoDevOrigin.test(origin) ||
      process.env.NODE_ENV === 'development'
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
console.log('📋 Registering API routes...');
app.use('/api/auth', authRoutes);
console.log('  ✓ /api/auth');
app.use('/api/users', userRoutes);
console.log('  ✓ /api/users');
app.use('/api/roles', roleRoutes);
console.log('  ✓ /api/roles');
app.use('/api/fees', feeRoutes);
console.log('  ✓ /api/fees');
app.use('/api/entities', entityRoutes);
console.log('  ✓ /api/entities');
app.use('/api/attributes', attributeRoutes);
console.log('  ✓ /api/attributes');
app.use('/api/permit-types', permitTypeRoutes);
console.log('  ✓ /api/permit-types');
app.use('/api/assessment-rules', assessmentRuleRoutes);
console.log('  ✓ /api/assessment-rules');
app.use('/api/applications', applicationRoutes);
console.log('  ✓ /api/applications');
app.use('/api/notifications', notificationRoutes);
console.log('  ✓ /api/notifications');
app.use('/api/dashboard', dashboardRoutes);
console.log('  ✓ /api/dashboard');
app.use('/api/messages', messageRoutes);
console.log('  ✓ /api/messages');
app.use('/api/settings', settingsRoutes);
console.log('  ✓ /api/settings');
app.use('/api/addresses', addressRoutes);
console.log('  ✓ /api/addresses');
app.use('/api/reports', reportRoutes);
console.log('  ✓ /api/reports');
app.use('/api/report-templates', reportTemplateRoutes);
console.log('  ✓ /api/report-templates');
app.use('/api/citations', citationRoutes);
console.log('  ✓ /api/citations');
app.use('/api/enforcers', enforcerRoutes);
console.log('  ✓ /api/enforcers');
app.use('/api/quantity-fees', quantityFeeRoutes);
console.log('  ✓ /api/quantity-fees');
app.use('/api/rights-and-rentals', rightsAndRentalsRoutes);
console.log('  ✓ /api/rights-and-rentals');
app.use('/api/price-monitoring', priceMonitoringRoutes);
console.log('  ✓ /api/price-monitoring');
app.use('/api/waterworks', waterworksRoutes);
console.log('  ✓ /api/waterworks');
app.use('/api/tasks', tasksRoutes);
console.log('  ✓ /api/tasks');
app.use('/api/jobs', jobsRoutes);
console.log('  ✓ /api/jobs');
app.use('/api/audit', auditRoutes);
console.log('  ✓ /api/audit');
app.use('/api/payments-ledger', paymentsLedgerRoutes);
console.log('  ✓ /api/payments-ledger');
app.use('/api/org-units', orgUnitsRoutes);
console.log('  ✓ /api/org-units');
app.use('/api/approval-chains', approvalChainsRoutes);
console.log('  ✓ /api/approval-chains');
app.use('/api/attachments', attachmentsRoutes);
console.log('  ✓ /api/attachments');
app.use('/api/scheduled-reports', scheduledReportsRoutes);
console.log('  ✓ /api/scheduled-reports');
app.use('/api/portal', portalRoutes);
console.log('  ✓ /api/portal');
app.use('/api/integrations', integrationsRoutes);
console.log('  ✓ /api/integrations');
app.use('/api/anomalies', anomaliesRoutes);
console.log('  ✓ /api/anomalies');
app.use('/api/portal-payments', portalPaymentsRoutes);
console.log('  ✓ /api/portal-payments');
console.log('✅ All routes registered');

// API v1 aliases (same handlers — Phase 1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/tasks', tasksRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/payments-ledger', paymentsLedgerRoutes);
app.use('/api/v1/portal', portalRoutes);
app.use('/api/v1/org-units', orgUnitsRoutes);

app.get('/api/v1/openapi.yaml', (req, res) => {
  try {
    res.type('text/yaml').send(fs.readFileSync(path.join(__dirname, 'openapi-v1.yaml'), 'utf8'));
  } catch (err) {
    res.status(404).json({ error: 'OpenAPI spec not found' });
  }
});

// Health check (liveness) + detailed (auth optional for ops)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PAMS API is running' });
});

app.get(
  '/api/health/detailed',
  authenticate,
  requirePermission('settings'),
  async (req, res) => {
    try {
      const detailed = await getDetailedHealth();
      const code = detailed.status === 'error' ? 503 : 200;
      res.status(code).json(detailed);
    } catch (err) {
      res.status(503).json({ status: 'error', error: err.message });
    }
  }
);

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map();

// Make onlineUsers available to routes
app.set('onlineUsers', onlineUsers);

// Socket.io: verify JWT and derive userId from token (never trust client userId)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token);
    const user = await loadUserWithRoles(decoded.userId);
    if (!user) {
      return next(new Error('Authentication error'));
    }

    socket.data.userId = user.user_id;
    socket.data.user = user;
    next();
  } catch (err) {
    logger.debug('Socket auth failed', { error: err.message });
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  logger.debug('Socket connected', { socketId: socket.id, userId });

  if (userId) {
    socket.join(`user_${userId}`);

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    io.emit('online_users_updated', Array.from(onlineUsers.keys()));
  }

  socket.on('disconnect', () => {
    logger.debug('Socket disconnected', { socketId: socket.id, userId });

    if (userId && onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);

      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
      }

      io.emit('online_users_updated', Array.from(onlineUsers.keys()));
    }
  });
});

// Helper function to emit notifications
const emitNotification = (userId, notification) => {
  io.to(`user_${userId}`).emit('notification', notification);
};

app.set('emitNotification', emitNotification);
setSocketIO(io, emitNotification);

// Make io available to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;

// Start server with migrations
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    logger.info('Running pending migrations...');
    try {
      await runMigrations();
      logger.info('Migrations completed');
    } catch (migrationError) {
      if (isProduction) {
        logger.error('Migration failed — refusing to start in production', migrationError);
        process.exit(1);
      }
      logger.warn('Migration warning (continuing in non-production)', {
        error: migrationError.message,
      });
    }

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is not set — refusing to start');
      process.exit(1);
    }

    if (
      process.env.JWT_SECRET.includes('change_in_production') ||
      process.env.JWT_SECRET.length < 32
    ) {
      logger.warn(
        'JWT_SECRET is weak or still using a placeholder. Generate a strong secret (32+ chars) and update .env / compose.'
      );
    }

    server.listen(PORT, () => {
      logger.info('Server started', {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
      });
      if (process.env.DISABLE_SCHEDULER !== 'true') {
        startScheduler(Number(process.env.SCHEDULER_INTERVAL_MS) || 5 * 60 * 1000);
      }
      recoverDurableJobs().catch(() => {});
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();

