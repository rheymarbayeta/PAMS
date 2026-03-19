-- Migration: Add html_report_templates table for storing customizable HTML report templates
-- This allows admins to customize assessment, permit, and endorsement report templates
-- without requiring code changes

CREATE TABLE IF NOT EXISTS html_report_templates (
    template_id VARCHAR(64) PRIMARY KEY,
    report_type ENUM('assessment', 'permit', 'endorsement') NOT NULL,
    template_html LONGTEXT NOT NULL COMMENT 'Complete HTML template with ${variable} placeholders',
    version INT DEFAULT 1,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE COMMENT 'One default template per report_type',
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_default (report_type, is_default) USING BTREE,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_report_type (report_type),
    INDEX idx_is_default (is_default),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment describing the table
ALTER TABLE html_report_templates COMMENT = 'Stores customizable HTML report templates for assessment, permit, and endorsement reports with variable placeholders';

-- Verify the table was created
SELECT 'html_report_templates table created successfully' AS status;
