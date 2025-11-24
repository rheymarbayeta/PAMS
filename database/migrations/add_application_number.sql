-- Migration: Add application_number field and sequence tracking
-- Format: YYYY-MM (e.g., 2024-01)
-- Run each statement separately if you encounter errors

USE pams_db;

-- Step 1: Add application_number field to Applications table
ALTER TABLE Applications 
ADD COLUMN application_number VARCHAR(20) UNIQUE NULL AFTER application_id;

-- Step 2: Add index for application_number
ALTER TABLE Applications 
ADD INDEX idx_application_number (application_number);

-- Step 3: Drop table if it exists (in case of previous failed attempts)
DROP TABLE IF EXISTS Application_Sequence;

-- Step 4: Create sequence tracking table for monthly application numbers
CREATE TABLE Application_Sequence (
    sequence_id INT AUTO_INCREMENT PRIMARY KEY,
    period VARCHAR(7) NOT NULL UNIQUE,
    sequence_number INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
