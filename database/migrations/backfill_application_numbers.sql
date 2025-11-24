-- Migration: Backfill application numbers for existing applications
-- This script assigns application numbers to existing applications that don't have one

USE pams_db;

-- Create sequence table if it doesn't exist (in case migration wasn't run)
CREATE TABLE IF NOT EXISTS Application_Sequence (
    sequence_id INT AUTO_INCREMENT PRIMARY KEY,
    year_month VARCHAR(7) NOT NULL UNIQUE,
    sequence_number INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_year_month (year_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add application_number column if it doesn't exist
-- Note: MySQL doesn't support IF NOT EXISTS in ALTER TABLE ADD COLUMN
-- Run this only if the column doesn't exist yet
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'Applications' 
  AND COLUMN_NAME = 'application_number';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Applications ADD COLUMN application_number VARCHAR(20) UNIQUE NULL AFTER application_id, ADD INDEX idx_application_number (application_number)',
    'SELECT "Column application_number already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill application numbers for existing applications
-- This will assign numbers based on creation date
-- Using a stored procedure approach for better reliability
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS BackfillApplicationNumbers()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE app_id INT;
    DECLARE app_date DATE;
    DECLARE year_month VARCHAR(7);
    DECLARE seq_num INT;
    
    DECLARE cur CURSOR FOR 
        SELECT application_id, DATE(created_at) 
        FROM Applications 
        WHERE application_number IS NULL 
        ORDER BY created_at ASC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO app_id, app_date;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET year_month = DATE_FORMAT(app_date, '%Y-%m');
        
        -- Get or create sequence for this month
        SELECT COALESCE(MAX(sequence_number), 0) + 1 INTO seq_num
        FROM Application_Sequence
        WHERE Application_Sequence.year_month = year_month;
        
        IF seq_num = 1 THEN
            INSERT INTO Application_Sequence (year_month, sequence_number)
            VALUES (year_month, 1)
            ON DUPLICATE KEY UPDATE sequence_number = sequence_number;
        ELSE
            UPDATE Application_Sequence 
            SET sequence_number = seq_num 
            WHERE Application_Sequence.year_month = year_month;
        END IF;
        
        -- Update application with the number
        UPDATE Applications
        SET application_number = CONCAT(year_month, '-', LPAD(seq_num, 3, '0'))
        WHERE application_id = app_id;
        
    END LOOP;
    
    CLOSE cur;
END$$

DELIMITER ;

-- Execute the procedure
CALL BackfillApplicationNumbers();

-- Drop the procedure after use
DROP PROCEDURE IF EXISTS BackfillApplicationNumbers;

-- Update sequence table with the highest sequence for each month
INSERT INTO Application_Sequence (year_month, sequence_number)
SELECT 
    DATE_FORMAT(created_at, '%Y-%m') as year_month,
    MAX(CAST(SUBSTRING_INDEX(application_number, '-', -1) AS UNSIGNED)) as max_sequence
FROM Applications
WHERE application_number IS NOT NULL
GROUP BY DATE_FORMAT(created_at, '%Y-%m')
ON DUPLICATE KEY UPDATE 
    sequence_number = GREATEST(sequence_number, VALUES(sequence_number));

