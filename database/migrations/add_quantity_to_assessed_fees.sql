-- Migration: Add quantity column to Assessed_Fees table
-- This allows storing the quantity for each fee during assessment
-- The quantity will then be used in the permit report to display fees with their quantities

-- Add quantity column to Assessed_Fees table
ALTER TABLE Assessed_Fees 
ADD COLUMN quantity INT DEFAULT 1 AFTER assessed_amount;

-- Add unit_amount column to store the per-unit amount (before multiplication)
ALTER TABLE Assessed_Fees 
ADD COLUMN unit_amount DECIMAL(10, 2) AFTER assessed_amount;

-- Update existing records to set unit_amount = assessed_amount (since quantity was 1)
UPDATE Assessed_Fees 
SET unit_amount = assessed_amount, quantity = 1 
WHERE unit_amount IS NULL;

-- Verify the changes
SELECT 'Migration completed: Added quantity and unit_amount columns to Assessed_Fees table' AS status;
