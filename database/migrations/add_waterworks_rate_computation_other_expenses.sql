-- Optional Rempark expense items 2.5–2.8 under full cost recovery worksheet

USE pams_db;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_rate_worksheets'
  AND COLUMN_NAME = 'expense_benefits';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_rate_worksheets ADD COLUMN expense_benefits DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER amortization_monthly',
    'SELECT ''Column expense_benefits already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_rate_worksheets'
  AND COLUMN_NAME = 'expense_watershed_management';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_rate_worksheets ADD COLUMN expense_watershed_management DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER expense_benefits',
    'SELECT ''Column expense_watershed_management already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_rate_worksheets'
  AND COLUMN_NAME = 'expense_climate_change';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_rate_worksheets ADD COLUMN expense_climate_change DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER expense_watershed_management',
    'SELECT ''Column expense_climate_change already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_rate_worksheets'
  AND COLUMN_NAME = 'expense_capability_building';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_rate_worksheets ADD COLUMN expense_capability_building DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER expense_climate_change',
    'SELECT ''Column expense_capability_building already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
