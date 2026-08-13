-- Rental computation schedule for lease contracts (VAT / WHT period bands)
CREATE TABLE IF NOT EXISTS `lease_contract_rental_schedule` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `lease_contract_id` INT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `period_label` VARCHAR(100) NOT NULL,
  `date_from` DATE NOT NULL,
  `date_to` DATE NOT NULL,
  `rent_type` ENUM('free', 'half', 'full', 'custom') NOT NULL DEFAULT 'full',
  `basic_monthly_rent` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `vat_rate` DECIMAL(8,6) NOT NULL DEFAULT 0.120000,
  `wht_rate` DECIMAL(8,6) NOT NULL DEFAULT 0.050000,
  `vat_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `total_monthly_rent` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `wht_amount` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `net_monthly_rent` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`lease_contract_id`) REFERENCES `lease_contracts`(`id`) ON DELETE CASCADE,
  INDEX `idx_rental_schedule_contract` (`lease_contract_id`),
  INDEX `idx_rental_schedule_dates` (`lease_contract_id`, `date_from`, `date_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ROW_FORMAT=DYNAMIC;
