-- Migration: Add signatory settings

USE pams_db;

-- Insert new signatory settings if they don't exist
INSERT INTO System_Settings (setting_id, setting_key, setting_value, description) VALUES
(UUID(), 'municipal_treasurer_name', 'HAIDEE D. OGOC', 'Municipal Treasurer name for assessment reports'),
(UUID(), 'municipal_treasurer_position', 'ACTING MUNICIPAL TREASURER', 'Municipal Treasurer position for assessment reports'),
(UUID(), 'permit_signatory_name', '', 'Permit signatory name'),
(UUID(), 'permit_signatory_position', '', 'Permit signatory position')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
