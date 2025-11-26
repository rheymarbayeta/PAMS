const pool = require('../config/database');
const { generateId, ID_PREFIXES } = require('./idGenerator');

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
    
    console.log('\n========== AUDIT LOGGER ==========');
    console.log('[AuditLogger] Input Parameters:');
    console.log('  - userId:', userId);
    console.log('  - action:', action);
    console.log('  - details:', details);
    console.log('  - applicationId:', applicationId);
    console.log('[AuditLogger] Generated ID:');
    console.log('  - audit_log_id:', audit_log_id);
    
    console.log('[AuditLogger] Inserting into Audit_Trail:');
    console.log('  - log_id:', audit_log_id);
    console.log('  - user_id:', userId);
    console.log('  - application_id:', applicationId);
    console.log('  - action:', action);
    console.log('  - details:', details);

    await pool.execute(
      'INSERT INTO Audit_Trail (log_id, user_id, application_id, action, details) VALUES (?, ?, ?, ?, ?)',
      [audit_log_id, userId, applicationId, action, details]
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

