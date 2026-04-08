-- Refactor Quantity-Based Fees to Link to Actual Fee Charges
-- This migration changes the structure to reference actual fees instead of manual base_rate

-- Step 1: Backup existing data (if any) by renaming old table
RENAME TABLE `assessment_rule_quantity_fees` TO `assessment_rule_quantity_fees_old`;

-- Step 2: Create new table with fee_id reference
CREATE TABLE IF NOT EXISTS `assessment_rule_quantity_fees` (
  `quantity_fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `selected_fee_id` VARCHAR(64) NOT NULL COMMENT 'FK to fees_charges - the fee to be quantity-based',
  `is_enabled` TINYINT(1) DEFAULT '1',
  `quantity_label` VARCHAR(100) NOT NULL COMMENT 'e.g., "Days", "Units", "Machines"',
  `quantity_description` VARCHAR(255) COMMENT 'Description shown to assessor during assessment',
  `min_quantity` INT DEFAULT '1',
  `max_quantity` INT DEFAULT '999',
  `additional_charges` JSON COMMENT 'Additional fixed fees: [{"fee_id": "fee-123", "charge_name": "Computer Fee"}]',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rule_quantity_fee (rule_id),
  INDEX idx_rule_id (rule_id),
  INDEX idx_selected_fee_id (selected_fee_id),
  INDEX idx_is_enabled (is_enabled),
  CONSTRAINT fk_quantity_fees_rule FOREIGN KEY (rule_id) REFERENCES assessment_rules(rule_id) ON DELETE CASCADE,
  CONSTRAINT fk_quantity_fees_selected_fee FOREIGN KEY (selected_fee_id) REFERENCES fees_charges(fee_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Keep the quantity and quantity_unit columns in assessment_records (already added)
-- These are used to track what quantity was entered during assessment

-- Drop old table (only after backup is confirmed to work)
-- DROP TABLE `assessment_rule_quantity_fees_old`;
