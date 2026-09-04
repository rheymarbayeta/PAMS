-- Migration: Add calculation_mode to quantity fee configs
-- Modes:
--   quantity — assessed = fee_amount × quantity_entered
--   percent  — assessed = base_amount × (fee_amount / 100)
--              where quantity_entered stores the assessor-entered base amount

ALTER TABLE `assessment_rule_quantity_fees`
  ADD COLUMN `calculation_mode` VARCHAR(20) NOT NULL DEFAULT 'quantity'
    COMMENT 'quantity | percent'
    AFTER `selected_fee_id`;
