-- Fix Assessment_Rules unique constraint to use attribute_id instead of attribute
USE pams_db;

-- Drop the old unique constraint that uses the 'attribute' column
ALTER TABLE Assessment_Rules
DROP INDEX IF EXISTS unique_permit_attribute;

-- Add new unique constraint on permit_type_id and attribute_id
-- This will fail if the constraint already exists, which is fine
ALTER TABLE Assessment_Rules
ADD UNIQUE KEY unique_permit_attribute_id (permit_type_id, attribute_id);

