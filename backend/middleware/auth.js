const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    console.log(`[Auth] Authenticating request: ${req.method} ${req.path}`);
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      console.log('[Auth] No token provided');
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('[Auth] Token found, verifying...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[Auth] Token decoded, userId:', decoded.userId);
    
    // Verify user still exists
    const [users] = await pool.execute(
      'SELECT user_id, username, full_name, role_id FROM Users WHERE user_id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      console.log('[Auth] User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = users[0];
    console.log('[Auth] Authentication successful for user:', req.user.username);
    next();
  } catch (error) {
    console.error('[Auth] Authentication error:', error.name, error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access control middleware
const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    console.log(`[Auth] Authorizing: ${req.method} ${req.path}, allowed roles:`, allowedRoles);
    if (!req.user) {
      console.log('[Auth] No user in request');
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get role name
    const [roles] = await pool.execute(
      'SELECT role_name FROM Roles WHERE role_id = ?',
      [req.user.role_id]
    );

    if (roles.length === 0) {
      console.log('[Auth] Role not found for user');
      return res.status(403).json({ error: 'Role not found' });
    }

    const userRole = roles[0].role_name;
    console.log('[Auth] User role:', userRole);

    // SuperAdmin has access to everything
    if (userRole === 'SuperAdmin' || allowedRoles.includes(userRole)) {
      console.log('[Auth] Authorization granted');
      return next();
    }

    console.log('[Auth] Authorization denied');
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

module.exports = { authenticate, authorize };

