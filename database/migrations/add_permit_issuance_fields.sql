-- Migration: Add permit issuance and release fields to Applications table
-- This adds fields to track who issued and released the permit

-- Add issued_by_user_id column
ALTER TABLE Applications 
ADD COLUMN issued_by_user_id VARCHAR(32) NULL AFTER approver_id,
ADD COLUMN issued_at TIMESTAMP NULL AFTER issued_by_user_id,
ADD COLUMN released_by VARCHAR(255) NULL AFTER issued_at,
ADD COLUMN received_by VARCHAR(255) NULL AFTER released_by,
ADD COLUMN released_at TIMESTAMP NULL AFTER received_by;

-- Add foreign key for issued_by_user_id
ALTER TABLE Applications
ADD CONSTRAINT fk_applications_issued_by
FOREIGN KEY (issued_by_user_id) REFERENCES Users(user_id)
ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_applications_issued_by ON Applications(issued_by_user_id);
