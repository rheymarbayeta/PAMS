const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    // Create migrations table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        migration_id VARCHAR(255) PRIMARY KEY,
        migration_file VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Migrations table ensured');

    // Read the rights_rentals migration file
    let migrationPath = '/app/database/migrations/create_rights_rentals_tables.sql';
    if (!fs.existsSync(migrationPath)) {
      migrationPath = path.join(__dirname, 'database/migrations/create_rights_rentals_tables.sql');
    }
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error('Migration file not found: ' + migrationPath);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Parse and execute statements
    let cleanedSql = sql
      .split('\n')
      .map(line => {
        const commentIndex = line.indexOf('--');
        return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
      })
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.toUpperCase().startsWith('USE '));

    console.log(`Found ${statements.length} SQL statements to execute`);
    let executed = 0;
    let skipped = 0;

    for (const stmt of statements) {
      try {
        await connection.query(stmt);
        executed++;
        console.log(`  ✓ Executed statement ${executed}`);
      } catch(e) {
        if (e.message.includes('already exists') || e.message.includes('Duplicate')) {
          skipped++;
          console.log(`  ⚠ Skipped (already exists): ${e.message.split('\n')[0]}`);
        } else {
          throw e;
        }
      }
    }

    // Mark migration as complete
    await connection.execute(
      'INSERT IGNORE INTO migrations (migration_id, migration_file) VALUES (?, ?)',
      ['create-rights-rentals-tables', 'create_rights_rentals_tables.sql']
    );
    
    console.log(`\n✅ Migration completed: ${executed} executed, ${skipped} skipped`);
    
    // Verify tables exist
    const [tables] = await connection.execute('SHOW TABLES LIKE "payment_history%"');
    console.log('✅ Payment history tables:', tables.map(t => Object.values(t)[0]).join(', '));
    
    const [rightsTables] = await connection.execute('DESCRIBE payment_history_rights');
    console.log('✅ payment_history_rights columns:', rightsTables.map(c => c.Field).join(', '));
    
  } finally {
    await connection.end();
  }
}

runMigration().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
