-- Migration: Add system settings table for configurable defaults

USE pams_db;

-- Create System_Settings table
CREATE TABLE IF NOT EXISTS System_Settings (
    setting_id VARCHAR(64) PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO System_Settings (setting_id, setting_key, setting_value, description) VALUES
(MD5('setting-treasurer_name'), 'municipal_treasurer_name', 'HAIDEE D. OGOC', 'Municipal Treasurer name for assessment reports'),
(MD5('setting-treasurer_position'), 'municipal_treasurer_position', 'ACTING MUNICIPAL TREASURER', 'Municipal Treasurer position for assessment reports'),
(MD5('setting-permit_signatory_name'), 'permit_signatory_name', '', 'Permit signatory name'),
(MD5('setting-permit_signatory_position'), 'permit_signatory_position', '', 'Permit signatory position'),
(MD5('setting-default_municipality'), 'default_municipality', 'Dalaguete', 'Default municipality for new applications'),
(MD5('setting-default_province'), 'default_province', 'Cebu', 'Default province for new applications'),
(MD5('setting-default_country'), 'default_country', 'Philippines', 'Default country for new applications')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

