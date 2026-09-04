-- Migration: Store fixed percent rate separately from fee base amount
-- Fee amount (from assessment_rule_fees) remains the base rate and can change.
-- percent_rate is the fixed configured percentage applied to that base rate.
-- Formula (percent mode): base_fee_amount × (percent_rate / 100)

ALTER TABLE `assessment_rule_quantity_fees`
  ADD COLUMN `percent_rate` DECIMAL(10,4) NULL DEFAULT NULL
    COMMENT 'Fixed percent rate for percent calculation_mode'
    AFTER `calculation_mode`;
