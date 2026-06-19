-- Waterworks roles and surcharge settings

USE pams_db;

INSERT INTO roles (role_id, role_name) VALUES
(MD5('role-waterworks-manager'), 'Waterworks Manager'),
(MD5('role-meter-reader'), 'Meter Reader')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

INSERT INTO system_settings (setting_id, setting_key, setting_value, description) VALUES
(MD5('setting-ww_billing_surcharge_enabled'), 'ww_billing_surcharge_enabled', 'true', 'Apply late payment surcharge on waterworks billing statements (true/false)'),
(MD5('setting-ww_billing_surcharge_percentage'), 'ww_billing_surcharge_percentage', '10', 'Late payment surcharge percentage on unpaid previous balance for waterworks bills')
ON DUPLICATE KEY UPDATE description = VALUES(description);
