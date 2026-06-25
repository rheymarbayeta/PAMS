-- Opening balances for legacy / pre-system lease accounts
-- Encoders can record total paid and outstanding without individual payment rows.

USE pams_db;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lease_contracts'
  AND COLUMN_NAME = 'is_legacy_account';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lease_contracts ADD COLUMN is_legacy_account TINYINT(1) NOT NULL DEFAULT 0 AFTER status',
    'SELECT ''Column is_legacy_account already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lease_contracts'
  AND COLUMN_NAME = 'opening_rights_paid';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lease_contracts ADD COLUMN opening_rights_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER outstanding_balance_notes',
    'SELECT ''Column opening_rights_paid already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lease_contracts'
  AND COLUMN_NAME = 'opening_rights_balance';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lease_contracts ADD COLUMN opening_rights_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER opening_rights_paid',
    'SELECT ''Column opening_rights_balance already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lease_contracts'
  AND COLUMN_NAME = 'opening_rental_paid';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lease_contracts ADD COLUMN opening_rental_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER opening_rights_balance',
    'SELECT ''Column opening_rental_paid already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lease_contracts'
  AND COLUMN_NAME = 'opening_balance_notes';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lease_contracts ADD COLUMN opening_balance_notes VARCHAR(500) NULL AFTER opening_rental_paid',
    'SELECT ''Column opening_balance_notes already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
