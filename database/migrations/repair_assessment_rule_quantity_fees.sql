-- Repair assessment_rule_quantity_fees after failed refactor migration.
--
-- What went wrong:
-- 1) refactor_quantity_fees_to_link_fees.sql RENAMED the live table to *_old
-- 2) CREATE of the new table failed because FK names fk_quantity_fees_rule /
--    fk_quantity_fees_selected_fee were still attached to *_old (MySQL FK names
--    are unique per schema). The runner treated "Duplicate" as non-fatal and
--    marked the migration complete — leaving Assess with a missing table.

-- Free the FK names so the live table can be recreated
ALTER TABLE `assessment_rule_quantity_fees_old` DROP FOREIGN KEY `fk_quantity_fees_rule`;
ALTER TABLE `assessment_rule_quantity_fees_old` DROP FOREIGN KEY `fk_quantity_fees_selected_fee`;

CREATE TABLE IF NOT EXISTS `assessment_rule_quantity_fees` (
  `quantity_fee_id` VARCHAR(64) NOT NULL,
  `rule_id` VARCHAR(64) NOT NULL,
  `selected_fee_id` VARCHAR(64) NULL DEFAULT NULL,
  `is_enabled` TINYINT(1) NULL DEFAULT 1,
  `quantity_label` VARCHAR(100) NOT NULL,
  `quantity_description` VARCHAR(255) NULL DEFAULT NULL,
  `base_rate` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `base_rate_label` VARCHAR(100) NULL DEFAULT NULL,
  `rate_formula` TEXT NULL,
  `additional_charges` JSON NULL,
  `min_quantity` INT NULL DEFAULT 1,
  `max_quantity` INT NULL DEFAULT 999,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`quantity_fee_id`),
  UNIQUE KEY `unique_rule_quantity_fee` (`rule_id`),
  KEY `idx_rule_id` (`rule_id`),
  KEY `idx_is_enabled` (`is_enabled`),
  KEY `idx_selected_fee_id` (`selected_fee_id`),
  CONSTRAINT `fk_quantity_fees_rule` FOREIGN KEY (`rule_id`) REFERENCES `assessment_rules` (`rule_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_quantity_fees_selected_fee` FOREIGN KEY (`selected_fee_id`) REFERENCES `assessment_rule_fees` (`fee_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restore rows from backup (selected_fee_id only if it still points at assessment_rule_fees)
INSERT IGNORE INTO assessment_rule_quantity_fees
  (quantity_fee_id, rule_id, selected_fee_id, is_enabled, quantity_label, quantity_description,
   base_rate, base_rate_label, rate_formula, additional_charges, min_quantity, max_quantity, created_at, updated_at)
SELECT
  o.quantity_fee_id,
  o.rule_id,
  CASE
    WHEN o.selected_fee_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM assessment_rule_fees arf WHERE arf.fee_id = o.selected_fee_id)
    THEN o.selected_fee_id
    ELSE NULL
  END,
  COALESCE(o.is_enabled, 1),
  o.quantity_label,
  o.quantity_description,
  COALESCE(o.base_rate, 0),
  o.base_rate_label,
  o.rate_formula,
  o.additional_charges,
  COALESCE(o.min_quantity, 1),
  COALESCE(o.max_quantity, 999),
  o.created_at,
  o.updated_at
FROM assessment_rule_quantity_fees_old o;
