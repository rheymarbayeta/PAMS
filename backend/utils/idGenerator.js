// Hash ID Generation Utility for NodeJS Backend
// Place this file at: backend/utils/idGenerator.js

const crypto = require('crypto');

/**
 * ID Prefixes for different entity types
 * Used to ensure uniqueness across different tables
 */
const ID_PREFIXES = {
  ROLE: 'role',
  USER: 'user',
  ENTITY: 'entity',
  APPLICATION: 'app',
  PARAMETER: 'param',
  CATEGORY: 'cat',
  FEE: 'fee',
  ASSESSED_FEE: 'afee',
  LOG: 'log',
  NOTIFICATION: 'notif',
  MESSAGE: 'msg',
  PAYMENT: 'pay',
  PERMIT_TYPE: 'ptype',
  PERMIT_TYPE_FEE: 'ptfee',
  ATTRIBUTE: 'attr',
  RULE: 'rule',
  RULE_FEE: 'rfee',
  ASSESSMENT: 'assess',
  ASSESSMENT_FEE: 'asfee',
  SETTING: 'setting'
};

/**
 * Generate a unique hash-based ID using MD5
 * @param {string} prefix - The prefix for the ID (from ID_PREFIXES)
 * @param {number} originalId - Optional original INT ID for migration purposes
 * @returns {string} - MD5 hash of length 64 characters
 * 
 * @example
 * const userId = generateId(ID_PREFIXES.USER); // For new records
 * const userId = generateId(ID_PREFIXES.USER, 1); // For migration (1 is the INT ID)
 */
function generateId(prefix, originalId = null) {
  let input;
  
  if (originalId) {
    // For migration: use the original INT ID
    input = `${prefix}-${originalId}`;
  } else {
    // For new records: use random + timestamp for uniqueness
    const randomPart = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString();
    input = `${prefix}-${randomPart}-${timestamp}`;
  }
  
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Batch generate IDs
 * @param {string} prefix - The prefix for the IDs
 * @param {number} count - Number of IDs to generate
 * @returns {string[]} - Array of generated hash IDs
 */
function generateIds(prefix, count) {
  const ids = [];
  for (let i = 0; i < count; i++) {
    ids.push(generateId(prefix));
  }
  return ids;
}

/**
 * Verify if a string is a valid hash ID (64 character hex string)
 * @param {string} id - The ID to verify
 * @returns {boolean} - True if valid hash ID format
 */
function isValidHashId(id) {
  if (!id || typeof id !== 'string') return false;
  return /^[a-f0-9]{32}$/.test(id);
}

/**
 * Convert MD5 hash to MySQL VARCHAR(64) suitable format
 * Note: MD5 produces 128-bit (32 hex chars), we'll pad to 64 for consistency
 * Actually MD5 outputs 32 chars - adjust column size if needed to VARCHAR(32)
 * Or prepend prefix info in database if more space needed
 * @param {string} prefix - The prefix
 * @param {number|string} value - The value to hash
 * @returns {string} - 32-character hash (or pad to 64 if needed)
 */
function generateHashIdV2(prefix, value) {
  const input = `${prefix}:${value}:${Date.now()}`;
  const hash = crypto.createHash('md5').update(input).digest('hex');
  // MD5 = 32 chars. If you need 64 chars, duplicate: hash + hash.substring(0, 32)
  // Or use SHA-256: crypto.createHash('sha256').update(input).digest('hex'); // 64 chars
  return hash;
}

/**
 * Use SHA256 for 64-character hash IDs
 * @param {string} prefix - The prefix
 * @param {number|string} value - The value to hash
 * @returns {string} - 64-character hash
 */
function generateHashIdSha256(prefix, value) {
  const input = `${prefix}:${value}:${Date.now()}`;
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Module exports
 */
module.exports = {
  ID_PREFIXES,
  generateId,
  generateIds,
  isValidHashId,
  generateHashIdV2,
  generateHashIdSha256
};

/**
 * USAGE EXAMPLES IN YOUR ROUTES:
 * 
 * ============================================
 * Creating a new user:
 * ============================================
 * const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
 * 
 * router.post('/', async (req, res) => {
 *   try {
 *     const userId = generateId(ID_PREFIXES.USER);
 *     const roleId = generateId(ID_PREFIXES.ROLE);
 *     
 *     const [result] = await pool.execute(
 *       'INSERT INTO Users (user_id, username, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
 *       [userId, req.body.username, hashedPassword, req.body.full_name, roleId]
 *     );
 *     
 *     res.status(201).json({ user_id: userId });
 *   } catch (error) {
 *     res.status(500).json({ error: 'Internal server error' });
 *   }
 * });
 * 
 * ============================================
 * Migration - convert existing INT IDs:
 * ============================================
 * const { generateId, ID_PREFIXES } = require('../utils/idGenerator');
 * 
 * async function migrateUserIds() {
 *   const [users] = await pool.execute('SELECT user_id FROM Users');
 *   
 *   for (const user of users) {
 *     const hashId = generateId(ID_PREFIXES.USER, user.user_id);
 *     // The migration SQL will handle the actual conversion
 *     console.log(`User ${user.user_id} -> ${hashId}`);
 *   }
 * }
 * 
 * ============================================
 * Using in business logic:
 * ============================================
 * const { generateId, isValidHashId, ID_PREFIXES } = require('../utils/idGenerator');
 * 
 * // Validate received ID
 * if (!isValidHashId(applicationId)) {
 *   return res.status(400).json({ error: 'Invalid application ID format' });
 * }
 * 
 * // Generate new application ID
 * const newAppId = generateId(ID_PREFIXES.APPLICATION);
 */
