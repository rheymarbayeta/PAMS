const pool = require('../config/database');

/**
 * Log an action to the audit trail
 * @param {number} userId - User ID performing the action
 * @param {string} action - Action type (e.g., 'CREATE_APP', 'APPROVE_APP')
 * @param {string} details - Detailed description of the action
 * @param {number|null} applicationId - Optional application ID if action is related to an application
 */
const logAction = async (userId, action, details, applicationId = null) => {
  try {
    await pool.execute(
      'INSERT INTO Audit_Trail (user_id, application_id, action, details) VALUES (?, ?, ?, ?)',
      [userId, applicationId, action, details]
    );
  } catch (error) {
    console.error('Error logging audit trail:', error);
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = { logAction };

