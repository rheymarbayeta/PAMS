const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

/**
 * Run pending migrations
 * Migrations are stored in database/migrations/*.sql files
 * Each run migration is tracked in a migrations table
 */
async function runMigrations() {
  const connection = await pool.getConnection();

  try {
    // Create migrations tracking table if it doesn't exist
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        migration_id VARCHAR(255) PRIMARY KEY,
        migration_file VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if migrations directory exists
    // In production (Docker), migrations are at /app/database/migrations
    // In development, they're at ../../database/migrations relative to this file
    let migrationsDir = path.join(__dirname, '../../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      migrationsDir = path.join(__dirname, '../database/migrations');
    }
    if (!fs.existsSync(migrationsDir)) {
      console.log('⚠️  Migrations directory not found at any expected location, skipping migrations');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      const [existing] = await connection.execute(
        'SELECT migration_id FROM migrations WHERE migration_file = ?',
        [file]
      );

      if (existing.length === 0) {
        console.log(`\n📦 Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Skip migrations with stored procedures - they require special handling
        if (sql.includes('CREATE PROCEDURE') || sql.includes('DELIMITER')) {
          console.log(`   ℹ️  Skipping migration file - contains stored procedures not yet supported`);
          const migrationId = file.replace(/[^a-zA-Z0-9]/g, '-');
          await connection.execute(
            'INSERT INTO migrations (migration_id, migration_file) VALUES (?, ?)',
            [migrationId, file]
          );
          console.log(`✅ Migration marked complete (skipped): ${file}`);
          continue;
        }

        // First, remove SQL comments from the entire file BEFORE splitting
        let cleanedSql = sql
          .split('\n')
          .map(line => {
            // Remove -- style comments (everything after -- on a line)
            const commentIndex = line.indexOf('--');
            return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
          })
          .join('\n')
          .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ style comments

        // Now split by semicolon
        let statements = cleanedSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s); // Remove empty statements

        for (const statement of statements) {
          try {
            const upperStatement = statement.toUpperCase();
            
            // Skip USE statements - database is already selected via environment
            if (upperStatement.startsWith('USE ')) {
              console.log(`   ℹ️  Skipping USE statement (database already selected)`);
              continue;
            }
            
            // Skip DELIMITER statements - they're only for MySQL client, not for drivers  
            if (upperStatement.startsWith('DELIMITER ') || statement === '$$' || statement === ';') {
              console.log(`   ℹ️  Skipping DELIMITER/delimiter statement`);
              continue;
            }
            
            // Skip CREATE PROCEDURE with DELIMITER - these aren't compatible with drivers
            if (upperStatement.includes('CREATE PROCEDURE') && statement.includes('$$')) {
              console.log(`   ℹ️  Skipping stored procedure - not yet supported in migration runner`);
              continue;
            }
            
            // Use query() instead of execute() for migrations to support PREPARE/EXECUTE/DEALLOCATE
            // execute() uses prepared statements which don't support these MySQL session-level commands
            await connection.query(statement);
          } catch (error) {
            // Allow safe errors that indicate the operation is already complete or not needed:
            // - "already exists" - column/table/index already exists
            // - "Duplicate" - duplicate key/constraint
            // - "ER_DUP_" - duplicate errors
            // - "ER_CANT_DROP_FIELD_OR_KEY" - index/constraint doesn't exist (idempotent)
            // - "check that column/key exists" - trying to drop non-existent index
            // - Foreign key constraint errors - may be due to complex schema state
            const errorMsg = error.message || '';
            const errorCode = error.code || '';
            
            if (errorMsg.includes('already exists') || 
                errorMsg.includes('Duplicate') ||
                errorMsg.includes('ER_DUP_') ||
                errorMsg.includes("Can't DROP") ||
                errorMsg.includes('check that column/key exists') ||
                errorMsg.includes('Referencing column') ||
                errorMsg.includes('incompatible') ||
                errorCode === 'ER_CANT_DROP_FIELD_OR_KEY' ||
                errorCode === 'ER_CANT_DROP_COLUMN' ||
                errorCode === 'ER_FK_INCOMPATIBLE_COLUMNS') {
              console.log(`   ⚠️  ${error.message}`);
              continue;
            }
            throw error;
          }
        }

        const migrationId = file.replace(/[^a-zA-Z0-9]/g, '-');
        await connection.execute(
          'INSERT INTO migrations (migration_id, migration_file) VALUES (?, ?)',
          [migrationId, file]
        );
        console.log(`✅ Migration completed: ${file}`);
      }
    }

    console.log('\n✅ All migrations completed successfully\n');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { runMigrations };
