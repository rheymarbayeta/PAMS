-- Opening / carried unpaid dues on consumer accounts

USE pams_db;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_consumer_accounts'
  AND COLUMN_NAME = 'unpaid_dues';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_consumer_accounts ADD COLUMN unpaid_dues DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER previous_reading',
    'SELECT ''Column unpaid_dues already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_consumer_accounts'
  AND COLUMN_NAME = 'unpaid_dues_notes';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_consumer_accounts ADD COLUMN unpaid_dues_notes VARCHAR(500) NULL AFTER unpaid_dues',
    'SELECT ''Column unpaid_dues_notes already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
