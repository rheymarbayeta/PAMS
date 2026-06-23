-- Flexible water billing models: progressive, bracket flat, per-unit with deduction

USE pams_db;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_water_supplies'
  AND COLUMN_NAME = 'billing_model';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_water_supplies ADD COLUMN billing_model ENUM(''progressive'',''bracket_flat'',''per_unit_deduction'') NOT NULL DEFAULT ''progressive'' AFTER minimum_charge',
    'SELECT ''Column billing_model already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Extend charge_type enum for bracket-flat and deduction tiers
ALTER TABLE ww_rate_tiers
  MODIFY COLUMN charge_type ENUM('minimum','per_cubic','flat_bracket','deduction') NOT NULL DEFAULT 'per_cubic';
