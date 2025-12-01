-- Migration: Add rule_id column to applications table
-- This links applications directly to assessment rules for easier fee lookup

ALTER TABLE applications 
ADD COLUMN rule_id VARCHAR(50) NULL AFTER permit_type_id;

-- Add foreign key constraint (optional, depends on your needs)
-- ALTER TABLE applications 
-- ADD CONSTRAINT fk_applications_rule_id 
-- FOREIGN KEY (rule_id) REFERENCES assessment_rules(rule_id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_applications_rule_id ON applications(rule_id);
