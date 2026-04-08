-- Create Quantity-Based Fees Configuration Table (Linked to Fee Charges)
-- This links quantity-based assessment to actual fees from the rule

CREATE TABLE IF NOT EXISTS `assessment_rule_quantity_fees` (
  `quantity_fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `selected_fee_id` VARCHAR(64) NOT NULL,
  `is_enabled` TINYINT(1) DEFAULT '1',
  `quantity_label` VARCHAR(100) NOT NULL,
  `quantity_description` VARCHAR(255),
  `min_quantity` INT DEFAULT '1',
  `max_quantity` INT DEFAULT '999',
  `additional_charges` LONGTEXT,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_rule_quantity_fee (rule_id),
  INDEX idx_rule_id (rule_id),
  INDEX idx_selected_fee_id (selected_fee_id),
  INDEX idx_is_enabled (is_enabled),
  CONSTRAINT fk_quantity_fees_rule FOREIGN KEY (rule_id) REFERENCES assessment_rules(rule_id) ON DELETE CASCADE,
  CONSTRAINT fk_quantity_fees_selected_fee FOREIGN KEY (selected_fee_id) REFERENCES fees_charges(fee_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
