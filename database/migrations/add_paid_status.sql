-- Migration: Add 'Paid', 'Issued', and 'Released' statuses to Applications table

USE pams_db;

ALTER TABLE Applications 
MODIFY status ENUM('Pending', 'Assessed', 'Pending Approval', 'Approved', 'Paid', 'Issued', 'Released', 'Rejected') DEFAULT 'Pending';
