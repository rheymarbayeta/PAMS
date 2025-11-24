-- Update Assessment_Rules to use attribute_id and fee_id
USE pams_db;

-- Drop the old unique constraint if it exists
ALTER TABLE Assessment_Rules
DROP INDEX IF EXISTS unique_permit_attribute;

-- Add attribute_id column to Assessment_Rules (if it doesn't exist)
ALTER TABLE Assessment_Rules
ADD COLUMN IF NOT EXISTS attribute_id INT NULL AFTER permit_type_id;

-- Add foreign key for attribute_id (if it doesn't exist)
-- Note: MySQL doesn't support IF NOT EXISTS for foreign keys, so this may fail if already exists
-- You may need to check manually: SHOW CREATE TABLE Assessment_Rules;
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = 'pams_db' 
  AND TABLE_NAME = 'Assessment_Rules' 
  AND CONSTRAINT_NAME = 'Assessment_Rules_ibfk_2'
  AND REFERENCED_TABLE_NAME = 'Attributes'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE Assessment_Rules ADD FOREIGN KEY (attribute_id) REFERENCES Attributes(attribute_id) ON DELETE CASCADE',
  'SELECT "Foreign key already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create index (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_assessment_rules_attribute_id ON Assessment_Rules(attribute_id);

-- Add new unique constraint on permit_type_id and attribute_id
ALTER TABLE Assessment_Rules
ADD UNIQUE KEY unique_permit_attribute_id (permit_type_id, attribute_id);

-- Update Assessment_Rule_Fees to use fee_id instead of just fee_name
ALTER TABLE Assessment_Rule_Fees
ADD COLUMN fee_id INT NULL AFTER rule_id;

-- Add foreign key for fee_id
ALTER TABLE Assessment_Rule_Fees
ADD FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE RESTRICT;

-- Create index
CREATE INDEX idx_assessment_rule_fees_fee_id ON Assessment_Rule_Fees(fee_id);

-- Note: fee_name column is kept for display purposes, but fee_id is the primary reference

