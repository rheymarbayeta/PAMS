-- Migration: Add report_customizations table for storing custom report edits
-- This allows users to edit report content and optionally save changes to the database

CREATE TABLE IF NOT EXISTS report_customizations (
    customization_id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL UNIQUE,
    report_type ENUM('assessment', 'permit', 'endorsement') NOT NULL,
    custom_content JSON NOT NULL COMMENT 'Stores edited fields as JSON',
    original_content JSON NOT NULL COMMENT 'Backup of original generated content',
    edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    edited_by_user_id VARCHAR(64) NOT NULL,
    is_saved BOOLEAN DEFAULT FALSE COMMENT 'true if changes are persisted, false for temporary edits',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (edited_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_application_id (application_id),
    INDEX idx_report_type (report_type),
    INDEX idx_is_saved (is_saved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment describing the table
ALTER TABLE report_customizations COMMENT = 'Stores custom report edits and metadata for assessment, permit, and endorsement reports';

-- Verify the table was created
SELECT 'report_customizations table created successfully' AS status;
