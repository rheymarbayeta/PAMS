-- Carried-forward rental balance from prior periods or other sources (shown on billing statements)
-- Note: MySQL does not support ADD COLUMN IF NOT EXISTS — uses information_schema checks instead.

USE pams_db;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lease_contracts'
  AND COLUMN_NAME = 'outstanding_rental_balance';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lease_contracts ADD COLUMN outstanding_rental_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER downpayment',
    'SELECT ''Column outstanding_rental_balance already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'lease_contracts'
  AND COLUMN_NAME = 'outstanding_balance_notes';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE lease_contracts ADD COLUMN outstanding_balance_notes VARCHAR(500) NULL AFTER outstanding_rental_balance',
    'SELECT ''Column outstanding_balance_notes already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
