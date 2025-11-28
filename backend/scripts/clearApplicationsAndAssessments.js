const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function clearApplicationsAndAssessments() {
  const connection = await pool.getConnection();
  
  try {
    console.log('⚠️  WARNING: This will delete ALL applications and assessments!');
    console.log('Starting cleanup...\n');

    await connection.beginTransaction();

    // Disable foreign key checks temporarily
    await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Delete in order to respect foreign key constraints
    console.log('1. Deleting assessment_record_fees...');
    await connection.execute('DELETE FROM assessment_record_fees');
    const [feesResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${feesResult[0].count || 0} assessment record fees`);

    console.log('2. Deleting assessment_records...');
    await connection.execute('DELETE FROM assessment_records');
    const [recordsResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${recordsResult[0].count || 0} assessment records`);

    console.log('3. Deleting assessed_fees...');
    await connection.execute('DELETE FROM assessed_fees');
    const [assessedResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${assessedResult[0].count || 0} assessed fees`);

    console.log('4. Deleting application_parameters...');
    await connection.execute('DELETE FROM application_parameters');
    const [paramsResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${paramsResult[0].count || 0} application parameters`);

    console.log('5. Clearing application references from audit_trail...');
    const [auditResult] = await connection.execute(
      'UPDATE audit_trail SET application_id = NULL WHERE application_id IS NOT NULL'
    );
    console.log(`   Updated ${auditResult.affectedRows || 0} audit trail entries`);

    console.log('6. Clearing application references from messages...');
    const [messagesResult] = await connection.execute(
      'UPDATE messages SET application_context_id = NULL WHERE application_context_id IS NOT NULL'
    );
    console.log(`   Updated ${messagesResult.affectedRows || 0} messages`);

    console.log('7. Deleting applications...');
    await connection.execute('DELETE FROM applications');
    const [appsResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${appsResult[0].count || 0} applications`);

    // Reset AUTO_INCREMENT counters
    console.log('\n8. Resetting AUTO_INCREMENT counters...');
    await connection.execute('ALTER TABLE assessment_record_fees AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE assessment_records AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE assessed_fees AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE application_parameters AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE applications AUTO_INCREMENT = 1');

    // Re-enable foreign key checks
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

    await connection.commit();
    
    console.log('\n✅ All applications and assessments have been cleared successfully!');
    console.log('   All related data (fees, parameters, assessments) has been removed.');
    console.log('   AUTO_INCREMENT counters have been reset.');
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error clearing applications and assessments:', error);
    process.exit(1);
  } finally {
    connection.release();
    process.exit(0);
  }
}

// Run the script
clearApplicationsAndAssessments();

