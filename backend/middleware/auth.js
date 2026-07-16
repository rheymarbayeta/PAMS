const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const logger = require('../utils/logger');
const {
  resolvePermissionsForRoles,
  userHasPermission,
} = require('../config/permissions');

const { attachOrgUnitsToUser } = require('../utils/orgScope');

/**
 * Verify a JWT string and return decoded payload.
 * Throws on invalid/expired tokens.
 */
function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Load user + roles + effective permissions for a verified userId.
 */
async function loadUserWithRoles(userId) {
  const [users] = await pool.execute(
    'SELECT user_id, username, full_name, role_id FROM users WHERE user_id = ?',
    [userId]
  );

  if (users.length === 0) {
    return null;
  }

  const user = users[0];

  let [userRoles] = await pool.execute(
    `SELECT r.role_id, r.role_name, r.permissions
     FROM user_roles ur
     INNER JOIN roles r ON ur.role_id = r.role_id
     WHERE ur.user_id = ?`,
    [userId]
  );

  if (userRoles.length === 0) {
    const [roles] = await pool.execute(
      'SELECT role_id, role_name, permissions FROM roles WHERE role_id = ?',
      [user.role_id]
    );
    userRoles = roles;
  }

  user.roles = userRoles.map((r) => r.role_name);
  user.role_ids = userRoles.map((r) => r.role_id);
  user.role_name = user.roles[0] || null;
  user.permissions = resolvePermissionsForRoles(userRoles);
  await attachOrgUnitsToUser(user);

  return user;
}

// Verify JWT token (Express middleware)
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    const user = await loadUserWithRoles(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    logger.debug('Authenticated request', {
      method: req.method,
      path: req.path,
      userId: user.user_id,
    });
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    logger.debug('Authentication failed', { error: error.message });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-based access control.
 * Accepts role names as separate args or a single array.
 */
const authorize = (...allowedRoles) => {
  const roles = allowedRoles.flat();

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = req.user.roles || [];

    if (userRoles.includes('SuperAdmin')) {
      return next();
    }

    const hasAllowedRole = userRoles.some((role) => roles.includes(role));

    if (hasAllowedRole) {
      return next();
    }

    logger.debug('Authorization denied', {
      path: req.path,
      userRoles,
      allowed: roles,
    });
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

/**
 * Permission-based access control (Phase 1 RBAC).
 * User must have at least one of the listed permissions (or 'all' / SuperAdmin).
 */
const requirePermission = (...required) => {
  const needed = required.flat();

  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (userHasPermission(req.user, needed)) {
      return next();
    }

    logger.debug('Permission denied', {
      path: req.path,
      permissions: req.user.permissions,
      required: needed,
    });
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  verifyToken,
  loadUserWithRoles,
  userHasPermission,
};
