-- DOE Inspection Report Form - Retailing of Liquid Fuels (LF) and LPG
-- Station profile fields on establishments (auto-fill source for new inspections)

ALTER TABLE `pm_markets` ADD COLUMN `dealer_operator` VARCHAR(150) NULL;
ALTER TABLE `pm_markets` ADD COLUMN `contact_number` VARCHAR(50) NULL;
ALTER TABLE `pm_markets` ADD COLUMN `supplier` VARCHAR(150) NULL;
ALTER TABLE `pm_markets` ADD COLUMN `oil_company` VARCHAR(150) NULL;
ALTER TABLE `pm_markets` ADD COLUMN `gps_lat` VARCHAR(30) NULL;
ALTER TABLE `pm_markets` ADD COLUMN `gps_lng` VARCHAR(30) NULL;

CREATE TABLE IF NOT EXISTS pm_fuel_inspections (
  inspection_id VARCHAR(64) PRIMARY KEY,
  market_id VARCHAR(64) NOT NULL,
  inspection_date DATE NOT NULL,
  time_in VARCHAR(10) NULL,
  time_out VARCHAR(10) NULL,
  special_assignment_no VARCHAR(100) NULL,
  business_name VARCHAR(150) NOT NULL,
  dealer_operator VARCHAR(150) NULL,
  business_address TEXT NULL,
  contact_number VARCHAR(50) NULL,
  supplier VARCHAR(150) NULL,
  oil_company VARCHAR(150) NULL,
  gps_lat VARCHAR(30) NULL,
  gps_lng VARCHAR(30) NULL,
  products LONGTEXT NULL COMMENT 'JSON: per product prices and inventory',
  remarks TEXT NULL,
  inspected_by VARCHAR(150) NULL,
  outlet_official VARCHAR(150) NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pm_fuel_insp_market (market_id, inspection_date),
  FOREIGN KEY (market_id) REFERENCES pm_markets(market_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
