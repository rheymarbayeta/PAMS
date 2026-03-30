-- Migration: Create Enforcers Table
-- Description: Stores records of citation enforcers/officers
-- Date: 2026-03-30

CREATE TABLE IF NOT EXISTS `enforcers` (
  `enforcer_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `badge_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `position` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Traffic Enforcer',
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `station` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `license_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `license_expiry` date,
  `status` enum('Active','Inactive','Suspended','On Leave') DEFAULT 'Active',
  `citations_issued` int DEFAULT 0,
  `total_fines` decimal(12,2) DEFAULT 0.00,
  `photo_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `date_hired` date,
  `supervisor_id` varchar(64) COLLATE utf8mb4_unicode_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(64) COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`enforcer_id`),
  UNIQUE KEY `badge_number` (`badge_number`),
  KEY `idx_status` (`status`),
  KEY `idx_department` (`department`),
  KEY `idx_station` (`station`),
  KEY `idx_badge_number` (`badge_number`),
  FOREIGN KEY (`supervisor_id`) REFERENCES `enforcers` (`enforcer_id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add enforcer_id to citations table
ALTER TABLE `citations` ADD COLUMN `enforcer_id` varchar(64) COLLATE utf8mb4_unicode_ci;

-- Add foreign key constraint
ALTER TABLE `citations` 
ADD CONSTRAINT `fk_citations_enforcer_id` 
FOREIGN KEY (`enforcer_id`) REFERENCES `enforcers` (`enforcer_id`) ON DELETE SET NULL;
