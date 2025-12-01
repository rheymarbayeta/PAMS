-- Migration: Add validity_type column to permit_types table
-- This allows permit types to have either a fixed validity date or custom validity (from application parameters)
-- Created: December 1, 2025

-- Add validity_type column to permit_types table
-- 'fixed' = uses the validity_date column
-- 'custom' = validity date is derived from application "Date" parameter (N/A on UI)
ALTER TABLE permit_types 
ADD COLUMN validity_type ENUM('fixed', 'custom') DEFAULT 'fixed' 
COMMENT 'fixed = uses validity_date, custom = uses Date parameter from application'
AFTER validity_date;

-- Update existing permit types to 'fixed' (they already have validity_date)
UPDATE permit_types SET validity_type = 'fixed' WHERE validity_type IS NULL;

-- Verify the column was added
SELECT permit_type_id, permit_type_name, validity_date, validity_type FROM permit_types;
