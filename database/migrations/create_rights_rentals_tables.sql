-- Rights & Rentals Module Tables
-- Created: April 28, 2026
-- Description: Tables for managing lessees, properties, and lease contracts

USE pams_db;

-- ============================================
-- LESSEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `lessees` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `contact_number` VARCHAR(50),
  `email` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROPERTIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `properties` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `location` VARCHAR(255) NOT NULL,
  `stall_number` VARCHAR(50),
  `floor_level` VARCHAR(50),
  `area_sqm` DECIMAL(10,2),
  `address` VARCHAR(500),
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_location (location),
  INDEX idx_stall_number (stall_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- LEASE CONTRACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `lease_contracts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lessee_id` INT NOT NULL,
  `property_id` INT NOT NULL,
  `contract_effective_date` DATE NOT NULL,
  `contract_termination_date` DATE NOT NULL,
  `principal_amount` DECIMAL(12,2),
  `monthly_rights_amount` DECIMAL(12,2),
  `monthly_rental_amount` DECIMAL(12,2),
  `downpayment` DECIMAL(12,2),
  `status` VARCHAR(50) DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lessee_id) REFERENCES lessees(id) ON DELETE CASCADE,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_lessee_id (lessee_id),
  INDEX idx_property_id (property_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROPERTY UNITS TABLE (for multi-unit properties)
-- ============================================
CREATE TABLE IF NOT EXISTS `property_units` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `property_id` INT NOT NULL,
  `unit_number` VARCHAR(50) NOT NULL,
  `unit_type` VARCHAR(100),
  `area_sqm` DECIMAL(10,2),
  `status` ENUM('available', 'occupied', 'maintenance', 'reserved') DEFAULT 'available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  INDEX idx_property_id (property_id),
  INDEX idx_status (status),
  UNIQUE KEY unique_property_unit (property_id, unit_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT HISTORY - RIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `payment_history_rights` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lease_contract_id` INT NOT NULL,
  `payment_date` DATE NOT NULL,
  `amount_paid` DECIMAL(12,2) NOT NULL,
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `reference_no` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lease_contract_id) REFERENCES lease_contracts(id) ON DELETE CASCADE,
  INDEX idx_lease_contract_id (lease_contract_id),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PAYMENT HISTORY - RENTAL TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `payment_history_rental` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lease_contract_id` INT NOT NULL,
  `payment_date` DATE NOT NULL,
  `amount_paid` DECIMAL(12,2) NOT NULL,
  `balance` DECIMAL(12,2) DEFAULT 0.00,
  `reference_no` VARCHAR(100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lease_contract_id) REFERENCES lease_contracts(id) ON DELETE CASCADE,
  INDEX idx_lease_contract_id (lease_contract_id),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACCOUNT BALANCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `account_balances` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lease_contract_id` INT NOT NULL UNIQUE,
  `principal_balance` DECIMAL(12,2) DEFAULT 0.00,
  `rights_balance` DECIMAL(12,2) DEFAULT 0.00,
  `rental_balance` DECIMAL(12,2) DEFAULT 0.00,
  `total_balance` DECIMAL(12,2) DEFAULT 0.00,
  `last_updated` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lease_contract_id) REFERENCES lease_contracts(id) ON DELETE CASCADE,
  INDEX idx_lease_contract_id (lease_contract_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACCOUNT STATEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `account_statements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lease_contract_id` INT NOT NULL,
  `statement_date` DATE NOT NULL,
  `statement_period_start` DATE NOT NULL,
  `statement_period_end` DATE NOT NULL,
  `principal_amount_due` DECIMAL(12,2) DEFAULT 0.00,
  `rights_amount_due` DECIMAL(12,2) DEFAULT 0.00,
  `rental_amount_due` DECIMAL(12,2) DEFAULT 0.00,
  `total_amount_due` DECIMAL(12,2) DEFAULT 0.00,
  `status` VARCHAR(50) DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (lease_contract_id) REFERENCES lease_contracts(id) ON DELETE CASCADE,
  INDEX idx_lease_contract_id (lease_contract_id),
  INDEX idx_statement_date (statement_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
