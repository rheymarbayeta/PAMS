const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const pool = require('./config/database');
const { setSocketIO } = require('./utils/notificationService');
const { runMigrations } = require('./utils/migrationRunner');

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
console.log('✅ All routes registered');

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'PAMS API is running' });
});

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map();

// Make onlineUsers available to routes
app.set('onlineUsers', onlineUsers);

// Socket.io connection handling
io.use((socket, next) => {
  // Simple authentication - in production, verify JWT token
  const token = socket.handshake.auth.token;
  if (token) {
    // Verify token and attach user info
    // For now, we'll trust the client sends valid user_id
    next();
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  const userId = socket.handshake.auth.userId;

  if (userId) {
    // Join user's personal room
    socket.join(`user_${userId}`);
    
    // Track user as online
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);
    console.log(`User ${userId} is now online (${onlineUsers.get(userId).size} connections)`);
    
    // Broadcast online users update to all connected clients
    io.emit('online_users_updated', Array.from(onlineUsers.keys()));
  }

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    if (userId && onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);
      
      // If no more connections for this user, remove them from online list
      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        console.log(`User ${userId} is now offline`);
      }
      
      // Broadcast online users update to all connected clients
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
  try {
    console.log('🔄 Checking and running pending migrations...');
    // Only run new migrations - skip problematic legacy ones
    try {
      await runMigrations();
      console.log('✅ Migrations completed');
    } catch (migrationError) {
      console.warn('⚠️  Migration warning:', migrationError.message);
      console.log('⏭️  Continuing with server startup despite migration issues');
    }
    
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

