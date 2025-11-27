-- Migration: Add support for multiple roles per user
-- Date: 2025-11-27

-- Create User_Roles junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS User_Roles (
    user_role_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_role (user_id, role_id),
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing user roles to the new junction table
INSERT INTO User_Roles (user_role_id, user_id, role_id)
SELECT 
    CONCAT('UR_', MD5(CONCAT(user_id, role_id, NOW(), RAND()))),
    user_id,
    role_id
FROM Users
WHERE role_id IS NOT NULL
ON DUPLICATE KEY UPDATE user_role_id = user_role_id;

-- Note: We keep the role_id column in Users table for backward compatibility
-- It can be used as the "primary" role for display purposes
-- The actual role checks will use the User_Roles table
