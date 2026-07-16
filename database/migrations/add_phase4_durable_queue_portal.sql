-- Phase 4: durable job queue + portal OTP / payment intake

CREATE TABLE IF NOT EXISTS job_queue (
  job_id VARCHAR(64) PRIMARY KEY,
  job_type VARCHAR(64) NOT NULL,
  payload_json TEXT NULL,
  status ENUM('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
  result_json MEDIUMTEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_job_status (status, created_at)
);

CREATE TABLE IF NOT EXISTS portal_otp_challenges (
  challenge_id VARCHAR(64) PRIMARY KEY,
  application_number VARCHAR(64) NOT NULL,
  channel ENUM('sms','email') NOT NULL DEFAULT 'sms',
  destination VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  verified_at DATETIME NULL,
  session_token VARCHAR(128) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_otp_app (application_number),
  KEY idx_otp_session (session_token)
);

CREATE TABLE IF NOT EXISTS portal_payment_intents (
  intent_id VARCHAR(64) PRIMARY KEY,
  application_id VARCHAR(64) NOT NULL,
  application_number VARCHAR(64) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PHP',
  status ENUM('pending','submitted','confirmed','cancelled','failed') NOT NULL DEFAULT 'pending',
  payer_name VARCHAR(255) NULL,
  payer_contact VARCHAR(255) NULL,
  reference_no VARCHAR(128) NULL,
  session_token VARCHAR(128) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ppi_app (application_id),
  KEY idx_ppi_status (status)
);
