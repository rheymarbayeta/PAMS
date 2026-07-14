-- Waterworks full-cost-recovery rate computation worksheet (per supply)

USE pams_db;

CREATE TABLE IF NOT EXISTS `ww_rate_worksheets` (
  `worksheet_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `supply_id` VARCHAR(64) NOT NULL,
  `household_count` INT NOT NULL DEFAULT 0,
  `avg_household_size` DECIMAL(8,2) NOT NULL DEFAULT 5.00,
  `liters_per_person_day` DECIMAL(10,2) NOT NULL DEFAULT 60.00,
  `days_per_month` INT NOT NULL DEFAULT 30,
  `inflation_rate_percent` DECIMAL(8,4) NOT NULL DEFAULT 10.0000,
  `amortization_monthly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `min_volume_m3` DECIMAL(10,2) NOT NULL DEFAULT 3.00,
  `excess_block_size_m3` DECIMAL(10,2) NOT NULL DEFAULT 5.00,
  `escalation_percent` DECIMAL(8,4) NOT NULL DEFAULT 10.0000,
  `markup_tapstand_percent` DECIMAL(8,4) NOT NULL DEFAULT 0.0000,
  `markup_residential_percent` DECIMAL(8,4) NOT NULL DEFAULT 10.0000,
  `markup_commercial_percent` DECIMAL(8,4) NOT NULL DEFAULT 20.0000,
  `notes` VARCHAR(500) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_ww_rate_worksheet_supply` (`supply_id`),
  CONSTRAINT `fk_ww_rate_worksheet_supply` FOREIGN KEY (`supply_id`)
    REFERENCES `ww_water_supplies` (`supply_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `ww_rate_worksheet_staff` (
  `staff_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `worksheet_id` VARCHAR(64) NOT NULL,
  `role_name` VARCHAR(100) NOT NULL,
  `headcount` INT NOT NULL DEFAULT 0,
  `monthly_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ww_rc_staff_ws` (`worksheet_id`),
  CONSTRAINT `fk_ww_rc_staff_ws` FOREIGN KEY (`worksheet_id`)
    REFERENCES `ww_rate_worksheets` (`worksheet_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `ww_rate_worksheet_opex` (
  `opex_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `worksheet_id` VARCHAR(64) NOT NULL,
  `category_name` VARCHAR(150) NOT NULL,
  `amount_monthly` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ww_rc_opex_ws` (`worksheet_id`),
  CONSTRAINT `fk_ww_rc_opex_ws` FOREIGN KEY (`worksheet_id`)
    REFERENCES `ww_rate_worksheets` (`worksheet_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

CREATE TABLE IF NOT EXISTS `ww_rate_worksheet_assets` (
  `asset_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `worksheet_id` VARCHAR(64) NOT NULL,
  `component_name` VARCHAR(150) NOT NULL,
  `cost` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `service_life_years` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
  `depreciable_percent` DECIMAL(8,4) NOT NULL DEFAULT 100.0000,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ww_rc_asset_ws` (`worksheet_id`),
  CONSTRAINT `fk_ww_rc_asset_ws` FOREIGN KEY (`worksheet_id`)
    REFERENCES `ww_rate_worksheets` (`worksheet_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
