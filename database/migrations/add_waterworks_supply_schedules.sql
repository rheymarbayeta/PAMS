-- Per-supply meter reading and billing day-of-month schedules

USE pams_db;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_water_supplies'
  AND COLUMN_NAME = 'reading_day_from';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_water_supplies
       ADD COLUMN reading_day_from TINYINT UNSIGNED NULL AFTER description,
       ADD COLUMN reading_day_to TINYINT UNSIGNED NULL AFTER reading_day_from,
       ADD COLUMN billing_day TINYINT UNSIGNED NULL AFTER reading_day_to',
    'SELECT ''Supply schedule columns already exist'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
