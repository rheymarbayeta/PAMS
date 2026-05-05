-- Add lease_contract_units junction table for multi-unit support per contract
CREATE TABLE IF NOT EXISTS `lease_contract_units` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lease_contract_id` INT NOT NULL,
  `property_unit_id` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lease_contract_id) REFERENCES lease_contracts(id) ON DELETE CASCADE,
  FOREIGN KEY (property_unit_id) REFERENCES property_units(id) ON DELETE CASCADE,
  UNIQUE KEY unique_contract_unit (lease_contract_id, property_unit_id),
  INDEX idx_lease_contract_id (lease_contract_id),
  INDEX idx_property_unit_id (property_unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;

-- Migrate existing single-unit data into the new junction table
INSERT IGNORE INTO lease_contract_units (lease_contract_id, property_unit_id)
SELECT id, property_unit_id FROM lease_contracts WHERE property_unit_id IS NOT NULL;
