-- Link waterworks consumer accounts to PAMS entities (safe to re-run)

-- 1. Add entity_id column if missing
SET @dbname = DATABASE();
SET @preparedStatement = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = 'ww_consumer_accounts'
        AND COLUMN_NAME = 'entity_id'
    ),
    'SELECT ''entity_id column already exists'' AS info',
    'ALTER TABLE ww_consumer_accounts ADD COLUMN entity_id VARCHAR(64) NULL AFTER supply_id'
  )
);
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Add index if missing
SET @preparedStatement = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = 'ww_consumer_accounts'
        AND INDEX_NAME = 'idx_ww_accounts_entity'
    ),
    'SELECT ''idx_ww_accounts_entity already exists'' AS info',
    'ALTER TABLE ww_consumer_accounts ADD INDEX idx_ww_accounts_entity (entity_id)'
  )
);
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add foreign key if missing
SET @preparedStatement = (
  SELECT IF(
    EXISTS(
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = @dbname
        AND TABLE_NAME = 'ww_consumer_accounts'
        AND CONSTRAINT_NAME = 'fk_ww_accounts_entity'
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    ),
    'SELECT ''fk_ww_accounts_entity already exists'' AS info',
    'ALTER TABLE ww_consumer_accounts ADD CONSTRAINT fk_ww_accounts_entity FOREIGN KEY (entity_id) REFERENCES entities(entity_id) ON DELETE SET NULL ON UPDATE CASCADE'
  )
);
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
