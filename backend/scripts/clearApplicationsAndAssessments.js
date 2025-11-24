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
    console.log('1. Deleting Assessment_Record_Fees...');
    await connection.execute('DELETE FROM Assessment_Record_Fees');
    const [feesResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${feesResult[0].count || 0} assessment record fees`);

    console.log('2. Deleting Assessment_Records...');
    await connection.execute('DELETE FROM Assessment_Records');
    const [recordsResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${recordsResult[0].count || 0} assessment records`);

    console.log('3. Deleting Assessed_Fees...');
    await connection.execute('DELETE FROM Assessed_Fees');
    const [assessedResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${assessedResult[0].count || 0} assessed fees`);

    console.log('4. Deleting Application_Parameters...');
    await connection.execute('DELETE FROM Application_Parameters');
    const [paramsResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${paramsResult[0].count || 0} application parameters`);

    console.log('5. Clearing application references from Audit_Trail...');
    const [auditResult] = await connection.execute(
      'UPDATE Audit_Trail SET application_id = NULL WHERE application_id IS NOT NULL'
    );
    console.log(`   Updated ${auditResult.affectedRows || 0} audit trail entries`);

    console.log('6. Clearing application references from Messages...');
    const [messagesResult] = await connection.execute(
      'UPDATE Messages SET application_context_id = NULL WHERE application_context_id IS NOT NULL'
    );
    console.log(`   Updated ${messagesResult.affectedRows || 0} messages`);

    console.log('7. Deleting Applications...');
    await connection.execute('DELETE FROM Applications');
    const [appsResult] = await connection.execute('SELECT ROW_COUNT() as count');
    console.log(`   Deleted ${appsResult[0].count || 0} applications`);

    // Reset AUTO_INCREMENT counters
    console.log('\n8. Resetting AUTO_INCREMENT counters...');
    await connection.execute('ALTER TABLE Assessment_Record_Fees AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE Assessment_Records AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE Assessed_Fees AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE Application_Parameters AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE Applications AUTO_INCREMENT = 1');

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

