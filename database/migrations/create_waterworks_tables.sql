-- Waterworks Module Tables
-- Created: June 2026
-- Description: Water supply systems, consumer accounts, meter readings, billing, and payments

USE pams_db;

-- ============================================
-- WATER SUPPLIES (physical systems)
-- ============================================
CREATE TABLE IF NOT EXISTS `ww_water_supplies` (
  `supply_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `supply_code` VARCHAR(50) NOT NULL,
  `supply_name` VARCHAR(255) NOT NULL,
  `location` VARCHAR(500) DEFAULT NULL,
  `description` TEXT,
  `rate_per_cubic_meter` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `minimum_charge` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active','inactive','maintenance') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_supply_code` (`supply_code`),
  INDEX `idx_supply_status` (`status`),
  INDEX `idx_supply_name` (`supply_name`(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ============================================
-- CONSUMER ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS `ww_consumer_accounts` (
  `account_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `account_number` VARCHAR(50) NOT NULL,
  `supply_id` VARCHAR(64) NOT NULL,
  `consumer_name` VARCHAR(255) NOT NULL,
  `address` VARCHAR(500) DEFAULT NULL,
  `contact_number` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(100) DEFAULT NULL,
  `meter_number` VARCHAR(50) DEFAULT NULL,
  `connection_date` DATE DEFAULT NULL,
  `status` ENUM('active','disconnected','suspended') NOT NULL DEFAULT 'active',
  `previous_reading` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `last_reading` DECIMAL(12,2) DEFAULT NULL,
  `last_reading_date` DATE DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_account_number` (`account_number`),
  INDEX `idx_supply_id` (`supply_id`),
  INDEX `idx_meter_number` (`meter_number`),
  INDEX `idx_consumer_name` (`consumer_name`(100)),
  INDEX `idx_account_status` (`status`),
  CONSTRAINT `fk_ww_account_supply` FOREIGN KEY (`supply_id`) REFERENCES `ww_water_supplies` (`supply_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ============================================
-- METER READINGS
-- ============================================
CREATE TABLE IF NOT EXISTS `ww_meter_readings` (
  `reading_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `account_id` VARCHAR(64) NOT NULL,
  `reading_date` DATE NOT NULL,
  `previous_reading` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_reading` DECIMAL(12,2) NOT NULL,
  `consumption` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `reading_period_month` TINYINT NOT NULL,
  `reading_period_year` SMALLINT NOT NULL,
  `recorded_by` VARCHAR(64) NOT NULL,
  `status` ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  `verified_by` VARCHAR(64) DEFAULT NULL,
  `verified_at` TIMESTAMP NULL DEFAULT NULL,
  `rejection_reason` TEXT,
  `notes` TEXT,
  `photo_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_reading_account` (`account_id`),
  INDEX `idx_reading_status` (`status`),
  INDEX `idx_reading_period` (`reading_period_year`, `reading_period_month`),
  UNIQUE KEY `uk_reading_account_period` (`account_id`, `reading_period_month`, `reading_period_year`),
  CONSTRAINT `fk_ww_reading_account` FOREIGN KEY (`account_id`) REFERENCES `ww_consumer_accounts` (`account_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ============================================
-- BILLS
-- ============================================
CREATE TABLE IF NOT EXISTS `ww_bills` (
  `bill_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `account_id` VARCHAR(64) NOT NULL,
  `reading_id` VARCHAR(64) DEFAULT NULL,
  `billing_month` TINYINT NOT NULL,
  `billing_year` SMALLINT NOT NULL,
  `previous_reading` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_reading` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `consumption` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `rate_applied` DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
  `amount_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `previous_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `surcharge_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_due` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
  `generated_by` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_bill_account` (`account_id`),
  INDEX `idx_bill_period` (`billing_year`, `billing_month`),
  INDEX `idx_bill_status` (`status`),
  UNIQUE KEY `uk_bill_account_period` (`account_id`, `billing_month`, `billing_year`),
  CONSTRAINT `fk_ww_bill_account` FOREIGN KEY (`account_id`) REFERENCES `ww_consumer_accounts` (`account_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ww_bill_reading` FOREIGN KEY (`reading_id`) REFERENCES `ww_meter_readings` (`reading_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `ww_payments` (
  `payment_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `account_id` VARCHAR(64) NOT NULL,
  `bill_id` VARCHAR(64) DEFAULT NULL,
  `payment_date` DATE NOT NULL,
  `amount_paid` DECIMAL(12,2) NOT NULL,
  `or_number` VARCHAR(100) DEFAULT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'cash',
  `recorded_by` VARCHAR(64) NOT NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_payment_account` (`account_id`),
  INDEX `idx_payment_bill` (`bill_id`),
  INDEX `idx_payment_date` (`payment_date`),
  CONSTRAINT `fk_ww_payment_account` FOREIGN KEY (`account_id`) REFERENCES `ww_consumer_accounts` (`account_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ww_payment_bill` FOREIGN KEY (`bill_id`) REFERENCES `ww_bills` (`bill_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- ============================================
-- SUPPLY READER ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `ww_supply_readers` (
  `assignment_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `supply_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_supply_user` (`supply_id`, `user_id`),
  INDEX `idx_reader_user` (`user_id`),
  CONSTRAINT `fk_ww_reader_supply` FOREIGN KEY (`supply_id`) REFERENCES `ww_water_supplies` (`supply_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
