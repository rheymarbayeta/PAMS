-- Phase 2: unified payment ledger (cross-module reconciliation)
CREATE TABLE IF NOT EXISTS payment_ledger (
  ledger_id VARCHAR(64) PRIMARY KEY,
  module VARCHAR(32) NOT NULL COMMENT 'permits|citations|rentals|waterworks',
  reference_type VARCHAR(64) NOT NULL COMMENT 'application|citation|lease_contract|ww_bill',
  reference_id VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'PHP',
  payment_date DATE NOT NULL,
  receipt_no VARCHAR(128) NULL,
  method VARCHAR(64) NULL,
  recorded_by VARCHAR(64) NULL,
  source_table VARCHAR(64) NULL,
  source_id VARCHAR(64) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ledger_module (module),
  INDEX idx_ledger_reference (reference_type, reference_id),
  INDEX idx_ledger_entity (entity_id),
  INDEX idx_ledger_date (payment_date),
  INDEX idx_ledger_source (source_table, source_id)
);
