const pool = require('../config/database');

async function migrate() {
  const [rows] = await pool.execute(
    `SELECT log_id, action, details FROM audit_trail 
     WHERE application_id IS NULL AND resource_id IS NULL 
     AND action NOT IN ('CREATE_CITATION','UPDATE_CITATION','DELETE_CITATION','RECORD_CITATION_PAYMENT')`
  );
  console.log('Orphaned app audit rows:', rows.length);

  const [appNums] = await pool.execute('SELECT application_id, application_number FROM applications');
  const byNumber = {};
  appNums.forEach(a => { if (a.application_number) byNumber[a.application_number] = a.application_id; });

  let updated = 0;
  let skipped = 0;
  for (const row of rows) {
    const match = row.details && row.details.match(/#(\d{4}-\d{2}-\d+)/);
    if (!match) { skipped++; continue; }
    const appId = byNumber[match[1]];
    if (!appId) { skipped++; continue; }
    await pool.execute('UPDATE audit_trail SET application_id = ? WHERE log_id = ?', [appId, row.log_id]);
    updated++;
  }
  console.log('Migrated:', updated, '| Skipped (no match):', skipped);
  process.exit(0);
}

migrate().catch(e => { console.error(e.message); process.exit(1); });
