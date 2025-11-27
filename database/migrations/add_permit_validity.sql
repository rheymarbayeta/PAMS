-- Migration: Add validity date to permit types
-- This allows each permit type to have a specific validity date (e.g., December 31, 2025)

-- If you already added validity_months, drop it first:
-- ALTER TABLE permit_types DROP COLUMN validity_months;

-- Add validity_date column to permit_types table
ALTER TABLE permit_types 
ADD COLUMN validity_date DATE DEFAULT NULL 
COMMENT 'Specific validity/expiration date for permits of this type (e.g., 2025-12-31)' 
AFTER is_active;

-- Update existing permit types with default end of current year
UPDATE permit_types SET validity_date = CONCAT(YEAR(CURDATE()), '-12-31') WHERE validity_date IS NULL;

-- Verify the column was added
SELECT permit_type_id, permit_type_name, validity_date FROM permit_types;
