-- Migration: Add quarterly payment amounts to Assessment_Records table
-- Note: If columns already exist, this will fail. Check first or ignore the error.

USE pams_db;

-- Add quarterly amount columns
ALTER TABLE Assessment_Records 
ADD COLUMN q1_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER total_amount_due,
ADD COLUMN q2_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER q1_amount,
ADD COLUMN q3_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER q2_amount,
ADD COLUMN q4_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER q3_amount;

