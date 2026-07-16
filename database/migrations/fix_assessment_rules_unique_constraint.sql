-- Fix Assessment_Rules unique constraint to use attribute_id instead of attribute
USE pams_db;

-- Drop the old unique constraint that uses the 'attribute' column
-- (Runner treats missing index as a soft/idempotent error on MySQL)
ALTER TABLE Assessment_Rules
DROP INDEX unique_permit_attribute;

-- Add new unique constraint on permit_type_id and attribute_id
ALTER TABLE Assessment_Rules
ADD UNIQUE KEY unique_permit_attribute_id (permit_type_id, attribute_id);
