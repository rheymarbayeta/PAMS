-- Consumer account type and auto-numbering support

USE pams_db;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_consumer_accounts'
  AND COLUMN_NAME = 'account_type';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_consumer_accounts ADD COLUMN account_type ENUM(''residential'',''commercial'',''institutional'',''others'') NOT NULL DEFAULT ''residential'' AFTER account_number',
    'SELECT ''Column account_type already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
