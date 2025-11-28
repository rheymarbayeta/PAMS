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
      'SELECT user_id, username, full_name, role_id FROM users WHERE user_id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      console.log('[Auth] User not found in database');
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = users[0];
    
    // Get all roles for the user
    const [userRoles] = await pool.execute(
      `SELECT r.role_id, r.role_name 
       FROM user_roles ur 
       INNER JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = ?`,
      [decoded.userId]
    );
    
    // If user has roles in the junction table, use those
    // Otherwise fall back to the single role_id for backward compatibility
    if (userRoles.length > 0) {
      req.user.roles = userRoles.map(r => r.role_name);
      req.user.role_ids = userRoles.map(r => r.role_id);
    } else {
      // Fallback to single role
      const [roles] = await pool.execute(
        'SELECT role_name FROM roles WHERE role_id = ?',
        [req.user.role_id]
      );
      req.user.roles = roles.length > 0 ? [roles[0].role_name] : [];
      req.user.role_ids = [req.user.role_id];
    }
    
    console.log('[Auth] Authentication successful for user:', req.user.username, 'roles:', req.user.roles);
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

    const userRoles = req.user.roles || [];
    console.log('[Auth] User roles:', userRoles);

    // SuperAdmin has access to everything
    if (userRoles.includes('SuperAdmin')) {
      console.log('[Auth] Authorization granted (SuperAdmin)');
      return next();
    }

    // Check if user has any of the allowed roles
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));
    
    if (hasAllowedRole) {
      console.log('[Auth] Authorization granted');
      return next();
    }

    console.log('[Auth] Authorization denied');
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

module.exports = { authenticate, authorize };

