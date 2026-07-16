-- Phase 0: indexes to support applications list filtering and sorting
-- Safe to re-run: errors for existing indexes are ignored by migration runner patterns

CREATE INDEX idx_applications_status ON applications (status);
CREATE INDEX idx_applications_created_at ON applications (created_at);
CREATE INDEX idx_applications_creator_id ON applications (creator_id);
CREATE INDEX idx_applications_assessor_id ON applications (assessor_id);
CREATE INDEX idx_applications_approver_id ON applications (approver_id);
CREATE INDEX idx_application_parameters_app_param ON application_parameters (application_id, param_name);
