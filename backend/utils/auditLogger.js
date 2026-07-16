const logger = require('./logger');
const pool = require('../config/database');
const { generateId, ID_PREFIXES } = require('./idGenerator');

/**
 * Check if an ID is a valid application ID by querying the DB
 * @param {string|null} id
 * @returns {Promise<boolean>}
 */
async function isApplicationId(id) {
  if (!id) return false;
  try {
    const [rows] = await pool.execute(
      'SELECT 1 FROM applications WHERE application_id = ? LIMIT 1',
      [id]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Log an action to the audit trail
 * @param {string} userId - User ID performing the action (hash ID)
 * @param {string} action - Action type (e.g., 'CREATE_APP', 'APPROVE_APP')
 * @param {string} details - Detailed description of the action
 * @param {string|null} applicationId - Optional application ID if action is related to an application (hash ID)
 */
const logAction = async (userId, action, details, applicationId = null) => {
  try {
    const audit_log_id = generateId(ID_PREFIXES.AUDIT_LOG);

    // Determine where to store the resource ID:
    // application_id has a FK to applications — only store valid app IDs there.
    // Everything else (citations, etc.) goes to resource_id.
    const isApp = await isApplicationId(applicationId);
    const appIdForLogging = isApp ? applicationId : null;
    const resourceIdForLogging = isApp ? null : applicationId;

    await pool.execute(
      'INSERT INTO audit_trail (log_id, user_id, application_id, resource_id, action, details) VALUES (?, ?, ?, ?, ?, ?)',
      [audit_log_id, userId, appIdForLogging, resourceIdForLogging, action, details]
    );

    logger.debug('Audit logged', { action, userId, resourceId: applicationId });
  } catch (error) {
    logger.warn('Audit log failed (non-fatal)', {
      action,
      message: error.message,
      code: error.code,
    });
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = { logAction };
