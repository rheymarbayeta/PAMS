-- Phase 3: Enterprise foundations (org units, approvals, attachments, schedules, integrations)

CREATE TABLE IF NOT EXISTS org_units (
  org_unit_id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('municipality','office','barangay','division') NOT NULL DEFAULT 'office',
  parent_id VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_org_code (code),
  KEY idx_org_parent (parent_id)
);

CREATE TABLE IF NOT EXISTS user_org_units (
  user_id VARCHAR(64) NOT NULL,
  org_unit_id VARCHAR(64) NOT NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, org_unit_id),
  KEY idx_uou_org (org_unit_id)
);

CREATE TABLE IF NOT EXISTS approval_chains (
  chain_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  permit_type_id VARCHAR(64) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_chain_permit (permit_type_id)
);

CREATE TABLE IF NOT EXISTS approval_chain_steps (
  step_id VARCHAR(64) PRIMARY KEY,
  chain_id VARCHAR(64) NOT NULL,
  step_order INT NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  sla_hours INT NOT NULL DEFAULT 48,
  KEY idx_steps_chain (chain_id, step_order)
);

CREATE TABLE IF NOT EXISTS application_approval_steps (
  app_step_id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL,
  chain_id VARCHAR(64) NOT NULL,
  step_id VARCHAR(64) NOT NULL,
  step_order INT NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  status ENUM('pending','approved','rejected','escalated','skipped') NOT NULL DEFAULT 'pending',
  assignee_id VARCHAR(64) NULL,
  due_at DATETIME NULL,
  acted_at DATETIME NULL,
  acted_by VARCHAR(64) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_aas_app (application_id),
  KEY idx_aas_status (status, due_at)
);

CREATE TABLE IF NOT EXISTS attachments (
  attachment_id VARCHAR(64) PRIMARY KEY,
  module VARCHAR(32) NOT NULL,
  reference_type VARCHAR(64) NOT NULL,
  reference_id VARCHAR(64) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  uploaded_by VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_att_ref (module, reference_type, reference_id)
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  schedule_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  report_type VARCHAR(64) NOT NULL,
  frequency ENUM('hourly','daily','weekly','monthly') NOT NULL DEFAULT 'daily',
  params_json TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_run_at DATETIME NULL,
  next_run_at DATETIME NULL,
  created_by VARCHAR(64) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sched_next (is_active, next_run_at)
);

CREATE TABLE IF NOT EXISTS integration_events (
  event_id VARCHAR(64) PRIMARY KEY,
  channel VARCHAR(32) NOT NULL COMMENT 'sms|treasury|gis|etracs|webhook',
  direction ENUM('outbound','inbound') NOT NULL DEFAULT 'outbound',
  status ENUM('queued','sent','failed','received') NOT NULL DEFAULT 'queued',
  payload_json TEXT NULL,
  response_json TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ie_channel (channel, created_at)
);

-- Optional scoping columns (safe if re-run fails on duplicate column — runner soft-handles)
ALTER TABLE applications ADD COLUMN org_unit_id VARCHAR(64) NULL;
ALTER TABLE applications ADD KEY idx_app_org_unit (org_unit_id);
ALTER TABLE entities ADD COLUMN org_unit_id VARCHAR(64) NULL;

INSERT IGNORE INTO org_units (org_unit_id, code, name, type, is_active)
VALUES ('org_municipal_hall', 'MUN-HALL', 'Municipal Hall', 'municipality', 1);
