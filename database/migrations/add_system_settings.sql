-- Migration: Add system settings table for configurable defaults

USE pams_db;

-- Create System_Settings table
CREATE TABLE IF NOT EXISTS System_Settings (
    setting_id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO System_Settings (setting_key, setting_value, description) VALUES
('default_municipality', 'Dalaguete', 'Default municipality for new applications'),
('default_province', 'Cebu', 'Default province for new applications'),
('default_country', 'Philippines', 'Default country for new applications')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

