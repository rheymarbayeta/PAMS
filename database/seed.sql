

USE pams_db;

-- Insert Roles
INSERT INTO Roles (role_name) VALUES
('SuperAdmin'),
('Admin'),
('Assessor'),
('Approver'),
('Application Creator'),
('Viewer')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- Insert Default Admin User (password: admin123)
-- Note: If login fails, run: node backend/scripts/resetAdminPassword.js
-- This will generate a fresh bcrypt hash and update the admin password
INSERT INTO Users (username, password_hash, full_name, role_id) VALUES
('admin', '$2a$10$bEq4i31LLUl4mkWtfb/3Se/NMG2Kh69NI6svxEI9i79kF58luzakm', 'System Administrator', 
 (SELECT role_id FROM Roles WHERE role_name = 'SuperAdmin'))
ON DUPLICATE KEY UPDATE username = VALUES(username), password_hash = VALUES(password_hash);

-- Insert Sample Fee Categories
INSERT INTO Fees_Categories (category_name) VALUES
('Zoning Fees'),
('Fire Safety Fees'),
('Building Permit Fees'),
('Environmental Fees'),
('Processing Fees')
ON DUPLICATE KEY UPDATE category_name = VALUES(category_name);

-- Insert Sample Fees
INSERT INTO Fees_Charges (category_id, fee_name, default_amount) VALUES
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Zoning Fees'), 'Zoning Review Fee', 500.00),
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Zoning Fees'), 'Zoning Compliance Fee', 300.00),
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Fire Safety Fees'), 'Fire Safety Inspection Fee', 750.00),
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Fire Safety Fees'), 'Fire Safety Certificate Fee', 250.00),
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Building Permit Fees'), 'Building Permit Application Fee', 1000.00),
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Building Permit Fees'), 'Building Permit Processing Fee', 500.00),
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Environmental Fees'), 'Environmental Impact Assessment', 2000.00),
((SELECT category_id FROM Fees_Categories WHERE category_name = 'Processing Fees'), 'Application Processing Fee', 200.00)
ON DUPLICATE KEY UPDATE fee_name = VALUES(fee_name);

