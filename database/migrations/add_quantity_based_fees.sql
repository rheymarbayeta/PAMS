-- Add Quantity-Based Fee Configuration Table
-- This allows assessment rules to have flexible, formula-based fee calculations based on quantity

CREATE TABLE IF NOT EXISTS `assessment_rule_quantity_fees` (
  `quantity_fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `is_enabled` TINYINT(1) DEFAULT '1',
  `quantity_label` VARCHAR(100) NOT NULL COMMENT 'e.g., "Days", "Units", "Machines"',
  `quantity_description` VARCHAR(255) COMMENT 'Description shown to assessor during assessment',
  `base_rate` DECIMAL(12,2) NOT NULL COMMENT 'Rate per unit of quantity (e.g., 500 per day)',
  `base_rate_label` VARCHAR(100) COMMENT 'e.g., "per day", "per unit"',
  `rate_formula` TEXT COMMENT 'Optional: Custom formula for complex calculations. Use {qty} as placeholder',
  `additional_charges` JSON COMMENT 'Fixed additional charges: [{"charge_name": "Computer Fee", "amount": 50}]',
  `min_quantity` INT DEFAULT '1',
  `max_quantity` INT DEFAULT '999',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rule_quantity_fee (rule_id),
  INDEX idx_rule_id (rule_id),
  INDEX idx_is_enabled (is_enabled),
  CONSTRAINT fk_quantity_fees_rule FOREIGN KEY (rule_id) REFERENCES assessment_rules(rule_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add quantity column to assessment_records to track entered quantity
ALTER TABLE `assessment_records` ADD COLUMN `quantity_entered` INT DEFAULT NULL;
ALTER TABLE `assessment_records` ADD COLUMN `quantity_unit` VARCHAR(100) DEFAULT NULL;
ALTER TABLE `assessment_records` ADD INDEX idx_quantity (quantity_entered);

-- Add column to track if fees were auto-calculated from quantity
ALTER TABLE `assessment_records` ADD COLUMN `fees_calculated_from_quantity` TINYINT(1) DEFAULT '0';
