-- Simple fix for Assessment_Rules table (MySQL compatible)
-- Run this step by step, ignoring errors if something already exists
USE pams_db;

-- Step 1: Make the old 'attribute' column nullable
-- Run this first - it will fail if column doesn't exist, which is fine
ALTER TABLE Assessment_Rules 
MODIFY COLUMN attribute VARCHAR(100) NULL;

-- Step 2: Add attribute_id column (if it doesn't exist)
-- This will fail if column already exists, which is fine
ALTER TABLE Assessment_Rules 
ADD COLUMN attribute_id INT NULL AFTER permit_type_id;

-- Step 3: Drop old unique constraint
-- This will fail if index doesn't exist, which is fine
ALTER TABLE Assessment_Rules 
DROP INDEX unique_permit_attribute;

-- Step 4: Add foreign key for attribute_id
-- This will fail if foreign key already exists, which is fine
ALTER TABLE Assessment_Rules 
ADD FOREIGN KEY (attribute_id) REFERENCES Attributes(attribute_id) ON DELETE CASCADE;

-- Step 5: Create index on attribute_id
-- This will fail if index already exists, which is fine
CREATE INDEX idx_assessment_rules_attribute_id ON Assessment_Rules(attribute_id);

-- Step 6: Add new unique constraint
-- This will fail if constraint already exists, which is fine
ALTER TABLE Assessment_Rules 
ADD UNIQUE KEY unique_permit_attribute_id (permit_type_id, attribute_id);

