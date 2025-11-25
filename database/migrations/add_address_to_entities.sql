-- Migration: Add address field to Entities table

USE pams_db;

ALTER TABLE Entities ADD COLUMN address VARCHAR(500) AFTER phone;
