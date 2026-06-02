-- Price Monitoring Module - Database Migration
-- Run this script to create all price monitoring tables

-- Commodity Categories
CREATE TABLE IF NOT EXISTS pm_commodity_categories (
  category_id VARCHAR(64) PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50) DEFAULT 'tag',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Commodities
CREATE TABLE IF NOT EXISTS pm_commodities (
  commodity_id VARCHAR(64) PRIMARY KEY,
  category_id VARCHAR(64) NOT NULL,
  commodity_name VARCHAR(150) NOT NULL,
  unit VARCHAR(50) NOT NULL COMMENT 'e.g., kg, liter, piece, dozen',
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES pm_commodity_categories(category_id) ON DELETE CASCADE,
  UNIQUE KEY uq_commodity (category_id, commodity_name)
);

-- Markets / Monitoring Locations
CREATE TABLE IF NOT EXISTS pm_markets (
  market_id VARCHAR(64) PRIMARY KEY,
  market_name VARCHAR(150) NOT NULL,
  barangay VARCHAR(100),
  address TEXT,
  market_type ENUM('public_market','supermarket','grocery','sari_sari','wet_market','other') DEFAULT 'public_market',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Price Records
CREATE TABLE IF NOT EXISTS pm_price_records (
  record_id VARCHAR(64) PRIMARY KEY,
  commodity_id VARCHAR(64) NOT NULL,
  market_id VARCHAR(64) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  recorded_date DATE NOT NULL,
  recorder_id VARCHAR(64) NOT NULL,
  notes TEXT,
  source ENUM('field_survey','market_report','official_bulletin','other') DEFAULT 'field_survey',
  is_verified TINYINT(1) DEFAULT 0,
  verified_by VARCHAR(64),
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (commodity_id) REFERENCES pm_commodities(commodity_id) ON DELETE CASCADE,
  FOREIGN KEY (market_id) REFERENCES pm_markets(market_id) ON DELETE CASCADE
);

-- Price Alerts
CREATE TABLE IF NOT EXISTS pm_price_alerts (
  alert_id VARCHAR(64) PRIMARY KEY,
  alert_name VARCHAR(150) NOT NULL,
  commodity_id VARCHAR(64) NOT NULL,
  market_id VARCHAR(64),
  alert_type ENUM('above','below','change_pct') NOT NULL,
  threshold_value DECIMAL(10,2) NOT NULL COMMENT 'Price or % change threshold',
  is_active TINYINT(1) DEFAULT 1,
  notify_roles TEXT COMMENT 'JSON array of role names to notify',
  last_triggered_at TIMESTAMP NULL,
  created_by VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (commodity_id) REFERENCES pm_commodities(commodity_id) ON DELETE CASCADE,
  FOREIGN KEY (market_id) REFERENCES pm_markets(market_id) ON DELETE SET NULL
);

-- Alert Trigger Log
CREATE TABLE IF NOT EXISTS pm_alert_triggers (
  trigger_id VARCHAR(64) PRIMARY KEY,
  alert_id VARCHAR(64) NOT NULL,
  record_id VARCHAR(64) NOT NULL,
  triggered_price DECIMAL(10,2) NOT NULL,
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (alert_id) REFERENCES pm_price_alerts(alert_id) ON DELETE CASCADE,
  FOREIGN KEY (record_id) REFERENCES pm_price_records(record_id) ON DELETE CASCADE
);

-- Seed default commodity categories
INSERT IGNORE INTO pm_commodity_categories (category_id, category_name, description, icon) VALUES
  ('pmcat_rice_grains', 'Rice & Grains', 'Rice, corn, and other grain products', 'grain'),
  ('pmcat_meat', 'Meat & Poultry', 'Pork, chicken, beef, and other meats', 'meat'),
  ('pmcat_fish_seafood', 'Fish & Seafood', 'Fresh and dried fish, shellfish', 'fish'),
  ('pmcat_vegetables', 'Vegetables', 'Fresh vegetables and leafy greens', 'leaf'),
  ('pmcat_fruits', 'Fruits', 'Fresh and seasonal fruits', 'apple'),
  ('pmcat_dairy_eggs', 'Dairy & Eggs', 'Eggs, milk, and dairy products', 'egg'),
  ('pmcat_cooking_oil', 'Cooking Oil & Condiments', 'Oil, vinegar, soy sauce, and condiments', 'droplet'),
  ('pmcat_fuel', 'Fuel & Energy', 'Gasoline, diesel, LPG', 'flame'),
  ('pmcat_construction', 'Construction Materials', 'Cement, sand, gravel, steel', 'building'),
  ('pmcat_other', 'Other Commodities', 'Other monitored goods and services', 'tag');

-- Seed default commodities
INSERT IGNORE INTO pm_commodities (commodity_id, category_id, commodity_name, unit) VALUES
  ('pmcom_rice_wlnd', 'pmcat_rice_grains', 'Rice - Well Milled', 'kg'),
  ('pmcom_rice_reg', 'pmcat_rice_grains', 'Rice - Regular Milled', 'kg'),
  ('pmcom_rice_spec', 'pmcat_rice_grains', 'Rice - Special/Premium', 'kg'),
  ('pmcom_pork_kasim', 'pmcat_meat', 'Pork - Kasim (Shoulder)', 'kg'),
  ('pmcom_pork_liempo', 'pmcat_meat', 'Pork - Liempo (Belly)', 'kg'),
  ('pmcom_chicken_whole', 'pmcat_meat', 'Chicken - Whole', 'kg'),
  ('pmcom_chicken_breast', 'pmcat_meat', 'Chicken - Breast', 'kg'),
  ('pmcom_bangus', 'pmcat_fish_seafood', 'Bangus (Milkfish)', 'kg'),
  ('pmcom_tilapia', 'pmcat_fish_seafood', 'Tilapia', 'kg'),
  ('pmcom_galunggong', 'pmcat_fish_seafood', 'Galunggong (Round Scad)', 'kg'),
  ('pmcom_ampalaya', 'pmcat_vegetables', 'Ampalaya (Bitter Gourd)', 'kg'),
  ('pmcom_kangkong', 'pmcat_vegetables', 'Kangkong (Water Spinach)', 'kg'),
  ('pmcom_sitaw', 'pmcat_vegetables', 'Sitaw (String Beans)', 'kg'),
  ('pmcom_tomato', 'pmcat_vegetables', 'Tomato', 'kg'),
  ('pmcom_onion_red', 'pmcat_vegetables', 'Red Onion', 'kg'),
  ('pmcom_garlic', 'pmcat_vegetables', 'Garlic', 'kg'),
  ('pmcom_banana', 'pmcat_fruits', 'Banana - Lakatan', 'kg'),
  ('pmcom_mango', 'pmcat_fruits', 'Mango - Carabao', 'kg'),
  ('pmcom_eggs_medium', 'pmcat_dairy_eggs', 'Eggs - Medium (per piece)', 'piece'),
  ('pmcom_cooking_oil', 'pmcat_cooking_oil', 'Cooking Oil - Refined', 'liter'),
  ('pmcom_lpg_11', 'pmcat_fuel', 'LPG 11kg Cylinder', 'cylinder'),
  ('pmcom_gasoline95', 'pmcat_fuel', 'Gasoline - RON 95', 'liter'),
  ('pmcom_diesel', 'pmcat_fuel', 'Diesel', 'liter');

-- Seed default market
INSERT IGNORE INTO pm_markets (market_id, market_name, barangay, market_type) VALUES
  ('pmmkt_dalaguete_central', 'Dalaguete Public Market', 'Poblacion', 'public_market'),
  ('pmmkt_dalaguete_wet', 'Dalaguete Wet Market', 'Poblacion', 'wet_market');
