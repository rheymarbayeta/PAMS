-- Waterworks progressive / tiered billing rates

USE pams_db;

CREATE TABLE IF NOT EXISTS `ww_rate_tiers` (
  `tier_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `supply_id` VARCHAR(64) DEFAULT NULL,
  `tier_order` TINYINT NOT NULL,
  `from_m3` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `to_m3` DECIMAL(10,2) DEFAULT NULL,
  `charge_type` ENUM('minimum','per_cubic') NOT NULL DEFAULT 'per_cubic',
  `rate_amount` DECIMAL(12,4) NOT NULL,
  `description` VARCHAR(150) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_tier_supply` (`supply_id`),
  INDEX `idx_tier_order` (`tier_order`),
  CONSTRAINT `fk_ww_tier_supply` FOREIGN KEY (`supply_id`) REFERENCES `ww_water_supplies` (`supply_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'ww_bills'
  AND COLUMN_NAME = 'tier_breakdown';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ww_bills ADD COLUMN tier_breakdown JSON DEFAULT NULL AFTER amount_due',
    'SELECT ''Column tier_breakdown already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Municipal default tiers
INSERT INTO `ww_rate_tiers` (`tier_id`, `supply_id`, `tier_order`, `from_m3`, `to_m3`, `charge_type`, `rate_amount`, `description`) VALUES
(MD5('wwtier-default-1'), NULL, 1, 0.00, 10.00, 'minimum', 100.6000, 'Minimum charge (up to 10 m³)'),
(MD5('wwtier-default-2'), NULL, 2, 11.00, 20.00, 'per_cubic', 11.2500, '11 – 20 m³'),
(MD5('wwtier-default-3'), NULL, 3, 21.00, 30.00, 'per_cubic', 12.4000, '21 – 30 m³'),
(MD5('wwtier-default-4'), NULL, 4, 31.00, 40.00, 'per_cubic', 14.6500, '31 – 40 m³'),
(MD5('wwtier-default-5'), NULL, 5, 41.00, NULL, 'per_cubic', 16.7500, '41 m³ and above')
ON DUPLICATE KEY UPDATE
  `rate_amount` = VALUES(`rate_amount`),
  `description` = VALUES(`description`);

-- Align legacy supply columns with minimum tier for display / fallback
UPDATE `ww_water_supplies`
SET `minimum_charge` = 100.60, `rate_per_cubic_meter` = 0
WHERE `minimum_charge` = 0 OR `minimum_charge` IS NULL;
