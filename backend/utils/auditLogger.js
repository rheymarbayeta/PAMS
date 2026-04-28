const pool = require('../config/database');
const { generateId, ID_PREFIXES } = require('./idGenerator');

/**
 * Check if an ID is an application ID by checking its prefix
 * @param {string|null} id - The ID to check
 * @returns {boolean} - True if the ID is an application ID
 */
function isApplicationId(id) {
  if (!id) return false;
  // Application IDs start with 'app' prefix
  return id.startsWith('app');
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
    
    // Only use the application_id if it's actually an application ID
    // Otherwise, pass NULL to avoid foreign key constraint violations
    const appIdForLogging = isApplicationId(applicationId) ? applicationId : null;
    
    console.log('\n========== AUDIT LOGGER ==========');
    console.log('[AuditLogger] Input Parameters:');
    console.log('  - userId:', userId);
    console.log('  - action:', action);
    console.log('  - details:', details);
    console.log('  - resourceId:', applicationId);
    console.log('[AuditLogger] Generated ID:');
    console.log('  - audit_log_id:', audit_log_id);
    
    console.log('[AuditLogger] Inserting into Audit_Trail:');
    console.log('  - log_id:', audit_log_id);
    console.log('  - user_id:', userId);
    console.log('  - application_id:', appIdForLogging);
    console.log('  - action:', action);
    console.log('  - details:', details);

    await pool.execute(
      'INSERT INTO audit_trail (log_id, user_id, application_id, action, details) VALUES (?, ?, ?, ?, ?)',
      [audit_log_id, userId, appIdForLogging, action, details]
    );

    console.log('[AuditLogger] ✅ Action logged successfully');
    console.log('==================================\n');
  } catch (error) {
    console.log('\n========== AUDIT LOGGER ERROR ==========');
    console.error('[AuditLogger] ❌ Error logging audit trail:', error);
    console.error('[AuditLogger] Error code:', error.code);
    console.error('[AuditLogger] Error message:', error.message);
    console.log('========================================\n');
    // Don't throw - audit logging should not break the main flow
  }
};

module.exports = { logAction };

