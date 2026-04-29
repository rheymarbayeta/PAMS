const pool = require('./config/database');

async function createPropertyUnitsTable() {
  const connection = await pool.getConnection();
  try {
    console.log('Creating property_units table...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`property_units\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`property_id\` INT NOT NULL,
        \`unit_number\` VARCHAR(50) NOT NULL,
        \`unit_type\` VARCHAR(100),
        \`area_sqm\` DECIMAL(10,2),
        \`status\` ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
        INDEX idx_property_id (property_id),
        INDEX idx_status (status),
        UNIQUE KEY unique_property_unit (property_id, unit_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Property units table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  } finally {
    connection.release();
  }
}

createPropertyUnitsTable();
