-- Migration: Add report_templates table for storing DOCX templates
-- This allows admins to upload and manage Word document templates for permit reports

CREATE TABLE IF NOT EXISTS report_templates (
    template_id VARCHAR(64) PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT NOT NULL DEFAULT 0,
    permit_type_id VARCHAR(64) NULL,
    description TEXT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (permit_type_id) REFERENCES permit_types(permit_type_id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT,
    INDEX idx_permit_type_id (permit_type_id),
    INDEX idx_is_default (is_default),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comment describing the table
ALTER TABLE report_templates COMMENT = 'Stores DOCX templates for generating permit reports using docxtemplater';

-- Verify the table was created
SELECT 'report_templates table created successfully' AS status;
