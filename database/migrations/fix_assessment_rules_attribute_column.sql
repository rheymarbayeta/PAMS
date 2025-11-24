-- Fix Assessment_Rules table: Remove old 'attribute' column and use 'attribute_id' instead
USE pams_db;

-- Step 1: Drop the old unique constraint that uses 'attribute' column
-- Note: This will fail if the index doesn't exist, which is fine - just ignore the error
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'pams_db' 
  AND TABLE_NAME = 'Assessment_Rules' 
  AND INDEX_NAME = 'unique_permit_attribute'
);

SET @sql = IF(@index_exists > 0,
  'ALTER TABLE Assessment_Rules DROP INDEX unique_permit_attribute',
  'SELECT "Index does not exist, skipping" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Make the old 'attribute' column nullable (if it exists and is NOT NULL)
-- This allows us to insert without providing a value
-- Note: This will fail if the column doesn't exist, which is fine
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'pams_db' 
  AND TABLE_NAME = 'Assessment_Rules' 
  AND COLUMN_NAME = 'attribute'
);

SET @sql = IF(@column_exists > 0,
  'ALTER TABLE Assessment_Rules MODIFY COLUMN attribute VARCHAR(100) NULL',
  'SELECT "Column does not exist, skipping" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Ensure attribute_id column exists
SET @column_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = 'pams_db' 
  AND TABLE_NAME = 'Assessment_Rules' 
  AND COLUMN_NAME = 'attribute_id'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE Assessment_Rules ADD COLUMN attribute_id INT NULL AFTER permit_type_id',
  'SELECT "Column already exists, skipping" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Add foreign key for attribute_id (if not exists)
SET @fk_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = 'pams_db' 
  AND TABLE_NAME = 'Assessment_Rules' 
  AND COLUMN_NAME = 'attribute_id'
  AND REFERENCED_TABLE_NAME = 'Attributes'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE Assessment_Rules ADD CONSTRAINT fk_assessment_rules_attribute_id FOREIGN KEY (attribute_id) REFERENCES Attributes(attribute_id) ON DELETE CASCADE',
  'SELECT "Foreign key already exists, skipping" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Create index on attribute_id (if not exists)
SET @index_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'pams_db' 
  AND TABLE_NAME = 'Assessment_Rules' 
  AND INDEX_NAME = 'idx_assessment_rules_attribute_id'
);

SET @sql = IF(@index_exists = 0,
  'CREATE INDEX idx_assessment_rules_attribute_id ON Assessment_Rules(attribute_id)',
  'SELECT "Index already exists, skipping" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Add new unique constraint on permit_type_id and attribute_id
-- Note: This will fail if the constraint already exists, which is fine
SET @constraint_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = 'pams_db' 
  AND TABLE_NAME = 'Assessment_Rules' 
  AND INDEX_NAME = 'unique_permit_attribute_id'
);

SET @sql = IF(@constraint_exists = 0,
  'ALTER TABLE Assessment_Rules ADD UNIQUE KEY unique_permit_attribute_id (permit_type_id, attribute_id)',
  'SELECT "Unique constraint already exists, skipping" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: (Optional) After verifying everything works, you can drop the old 'attribute' column:
-- ALTER TABLE Assessment_Rules DROP COLUMN attribute;

