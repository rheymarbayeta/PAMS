-- Script to clear all sample assessments and applications
-- WARNING: This will delete ALL applications and assessments from the database
-- Use with caution!

USE pams_db;

-- Disable foreign key checks temporarily to allow deletion
SET FOREIGN_KEY_CHECKS = 0;

-- Delete in order to respect foreign key constraints
-- 1. Delete Assessment_Record_Fees (child of Assessment_Records)
DELETE FROM Assessment_Record_Fees;

-- 2. Delete Assessment_Records (child of Applications)
DELETE FROM Assessment_Records;

-- 3. Delete Assessed_Fees (child of Applications)
DELETE FROM Assessed_Fees;

-- 4. Delete Application_Parameters (child of Applications)
DELETE FROM Application_Parameters;

-- 5. Clear application references from Audit_Trail (application_id will be set to NULL)
UPDATE Audit_Trail SET application_id = NULL WHERE application_id IS NOT NULL;

-- 6. Clear application references from Messages (application_context_id will be set to NULL)
UPDATE Messages SET application_context_id = NULL WHERE application_context_id IS NOT NULL;

-- 7. Delete Applications (parent table)
DELETE FROM Applications;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Reset AUTO_INCREMENT counters
ALTER TABLE Assessment_Record_Fees AUTO_INCREMENT = 1;
ALTER TABLE Assessment_Records AUTO_INCREMENT = 1;
ALTER TABLE Assessed_Fees AUTO_INCREMENT = 1;
ALTER TABLE Application_Parameters AUTO_INCREMENT = 1;
ALTER TABLE Applications AUTO_INCREMENT = 1;

SELECT 'All applications and assessments have been cleared successfully.' AS message;

