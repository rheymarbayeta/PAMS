-- Phase 1: optional Solar Designer role (idempotent)
INSERT INTO roles (role_id, role_name, permissions)
SELECT MD5(CONCAT('role-', 'Solar Designer')), 'Solar Designer', '["dashboard_view","solar_designer"]'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = 'Solar Designer');
