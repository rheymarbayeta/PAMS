-- Migration: Add selected_fee_id column to assessment_rule_quantity_fees table
-- Purpose: Link quantity fees to specific assessment rule fees instead of using base_rate

ALTER TABLE `assessment_rule_quantity_fees` 
ADD COLUMN `selected_fee_id` VARCHAR(64) NULL AFTER `rule_id`,
ADD CONSTRAINT `fk_quantity_fees_selected_fee` 
  FOREIGN KEY (`selected_fee_id`) 
  REFERENCES `assessment_rule_fees`(`fee_id`) 
  ON DELETE SET NULL 
  ON UPDATE RESTRICT;

-- Create index on selected_fee_id for query performance
CREATE INDEX `idx_selected_fee_id` ON `assessment_rule_quantity_fees`(`selected_fee_id`);
