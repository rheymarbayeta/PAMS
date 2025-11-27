const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const pool = require('./config/database');
const { setSocketIO } = require('./utils/notificationService');

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

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
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

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

