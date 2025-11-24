-- Simple fix for Assessment_Rules table
-- Run this if you get errors about missing attribute_id column or unique constraint issues
USE pams_db;

-- Step 1: Check if attribute_id column exists, if not add it
-- (Run this manually if the ALTER fails - it means the column already exists)
ALTER TABLE Assessment_Rules
ADD COLUMN attribute_id INT NULL AFTER permit_type_id;

-- Step 2: Drop old unique constraint if it exists
ALTER TABLE Assessment_Rules
DROP INDEX unique_permit_attribute;

-- Step 3: Add foreign key for attribute_id (skip if already exists)
ALTER TABLE Assessment_Rules
ADD FOREIGN KEY (attribute_id) REFERENCES Attributes(attribute_id) ON DELETE CASCADE;

-- Step 4: Create index
CREATE INDEX idx_assessment_rules_attribute_id ON Assessment_Rules(attribute_id);

-- Step 5: Add new unique constraint
ALTER TABLE Assessment_Rules
ADD UNIQUE KEY unique_permit_attribute_id (permit_type_id, attribute_id);

