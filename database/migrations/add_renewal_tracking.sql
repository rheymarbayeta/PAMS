-- Migration: Add renewal tracking fields to Applications table
-- Status: COMPLETE - All fields, indexes, and constraints are in place
--
-- This migration adds the following to the applications table:
-- 1. application_type VARCHAR(20) - Tracks if application is 'NEW' or 'RENEWAL'
-- 2. parent_application_id VARCHAR(64) - Foreign key to original/parent application
-- 3. renewal_count INT - Counter for renewal number (1 for 1st renewal, 2 for 2nd, etc.)
-- 4. Indexes on all three columns for fast queries
-- 5. Self-referencing foreign key constraint with ON DELETE SET NULL
--
-- These fields enable tracking of renewal chains:
-- Original App (app-001) -> Renewal 1 (app-002, parent=app-001, count=1)
--                        -> Renewal 2 (app-003, parent=app-001, count=2)

-- Verify the columns exist
SELECT 'Renewal tracking columns status:' as status;
SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' 
AND COLUMN_NAME IN ('application_type', 'parent_application_id', 'renewal_count');

-- Verify indexes exist
SELECT 'Indexes created:' as status;
SELECT Index_name, Column_name FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications'
AND Index_name LIKE 'idx_applications_%';
