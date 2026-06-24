-- Minimum flat charge up to N m³, then per-m³ rate for consumption above

USE pams_db;

ALTER TABLE ww_water_supplies
  MODIFY COLUMN billing_model ENUM(
    'progressive',
    'bracket_flat',
    'per_unit_deduction',
    'minimum_excess'
  ) NOT NULL DEFAULT 'progressive';
