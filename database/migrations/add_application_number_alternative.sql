-- Alternative migration: Add application_number field and sequence tracking
-- This version uses a different column name to avoid any potential conflicts

USE pams_db;

-- Add application_number field to Applications table
ALTER TABLE Applications 
ADD COLUMN application_number VARCHAR(20) UNIQUE NULL AFTER application_id,
ADD INDEX idx_application_number (application_number);

-- Create sequence tracking table for monthly application numbers
-- Using 'period' instead of 'year_month' to avoid any identifier issues
CREATE TABLE IF NOT EXISTS Application_Sequence (
    sequence_id INT AUTO_INCREMENT PRIMARY KEY,
    period VARCHAR(7) NOT NULL UNIQUE,
    sequence_number INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

