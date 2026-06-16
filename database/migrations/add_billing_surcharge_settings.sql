-- Migration: Billing surcharge settings for rights & rentals statements

USE pams_db;

INSERT INTO system_settings (setting_id, setting_key, setting_value, description) VALUES
(MD5('setting-billing_surcharge_enabled'), 'billing_surcharge_enabled', 'true', 'Apply late payment surcharge on billing statements (true/false)'),
(MD5('setting-billing_surcharge_percentage'), 'billing_surcharge_percentage', '20', 'Late payment surcharge percentage applied to unpaid previous balance on billing statements')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);
