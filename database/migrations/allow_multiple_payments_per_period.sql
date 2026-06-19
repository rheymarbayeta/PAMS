-- Allow multiple rights/rental payments for the same billing period on a lease contract.
-- Drop unique_period after ensuring lease_contract_id has its own index for the FK.

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_history_rights'
  AND INDEX_NAME = 'idx_lease_contract_id';

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE payment_history_rights ADD INDEX idx_lease_contract_id (lease_contract_id)',
    'SELECT ''idx_lease_contract_id already exists on payment_history_rights'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_history_rights'
  AND INDEX_NAME = 'unique_period';

SET @sql = IF(@idx_exists > 0,
    'ALTER TABLE payment_history_rights DROP INDEX unique_period',
    'SELECT ''unique_period already dropped on payment_history_rights'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_history_rights'
  AND INDEX_NAME = 'idx_contract_period';

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE payment_history_rights ADD INDEX idx_contract_period (lease_contract_id, period_year, period_month)',
    'SELECT ''idx_contract_period already exists on payment_history_rights'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_history_rental'
  AND INDEX_NAME = 'idx_lease_contract_id';

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE payment_history_rental ADD INDEX idx_lease_contract_id (lease_contract_id)',
    'SELECT ''idx_lease_contract_id already exists on payment_history_rental'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_history_rental'
  AND INDEX_NAME = 'unique_period';

SET @sql = IF(@idx_exists > 0,
    'ALTER TABLE payment_history_rental DROP INDEX unique_period',
    'SELECT ''unique_period already dropped on payment_history_rental'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'payment_history_rental'
  AND INDEX_NAME = 'idx_contract_period';

SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE payment_history_rental ADD INDEX idx_contract_period (lease_contract_id, period_year, period_month)',
    'SELECT ''idx_contract_period already exists on payment_history_rental'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
