-- Add attribute column to Permit_Types table
USE pams_db;

ALTER TABLE Permit_Types 
ADD COLUMN attribute VARCHAR(100) NULL AFTER permit_type_name;

CREATE INDEX idx_attribute ON Permit_Types(attribute);

