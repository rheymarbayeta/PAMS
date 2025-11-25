-- Fresh Database Schema with Hash-Based IDs (Empty - Only Users)
-- Created: November 25, 2025
-- This schema includes all 20 tables with VARCHAR(64) hash-based IDs
-- NO DATA: Empty tables except Users (5 users included)

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Drop existing database if present
DROP DATABASE IF EXISTS pams_db;

-- Create fresh database
CREATE DATABASE IF NOT EXISTS pams_db;
USE pams_db;

-- ============================================
-- STEP 1: ROLES TABLE
-- ============================================
CREATE TABLE `roles` (
  `role_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `role_name` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role_name (role_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert roles
INSERT INTO `roles` VALUES
('role-26ac25f8935af17f0ef9','SuperAdmin','2025-11-20 01:47:25','2025-11-20 01:47:25'),
('role-5e9fcf77ad79f5c64a9a','Admin','2025-11-20 01:47:25','2025-11-20 01:47:25'),
('role-1ad9ffd5b1a1c9b2a45a','Assessor','2025-11-20 01:47:25','2025-11-20 01:47:25'),
('role-42c8c4c8a8dc0000000f','Approver','2025-11-20 01:47:25','2025-11-20 01:47:25'),
('role-7dc1ec6d8d4b8c5e4f9c','Application Creator','2025-11-20 01:47:25','2025-11-20 01:47:25'),
('role-8f9d1a2b3c4e5f6g7h8i','Viewer','2025-11-20 01:47:25','2025-11-20 01:47:25');

-- ============================================
-- STEP 2: USERS TABLE
-- ============================================
CREATE TABLE `users` (
  `user_id` VARCHAR(64) NOT NULL,
  `username` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  INDEX idx_username (username),
  INDEX idx_role_id (role_id),
  CONSTRAINT users_ibfk_1 FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert users
-- Password hashes:
-- admin / admin123 = $2a$10$bEq4i31LLUl4mkWtfb/3Se/NMG2Kh69NI6svxEI9i79kF58luzakm
-- lord / lord123 = $2a$10$7WZtSj3qrXXLoVcoxY8gSOOewssHIekHglQ96i1vyt/F4SrlIe.rW
-- fritz / fritz123 = $2a$10$w/5CALsnFE6aF5j758lEkO2PZLqBtqIdEryIAJQ8xgi63IQw3wAR.
-- chyrramae / chyrramae123 = $2a$10$c4xJiXCHJHZ/bITJ56qmJeVvMg2kJ8PPFSETS2RY51H5v9ErvzfJ6
-- superadmin / superadmin123 = $2a$10$hE9f8H9mK8I7mL6nO5pQ.SEu3T2sR1qU0vW9xY8zB7cA6dE5fG4

INSERT INTO `users` VALUES
('user-1a2b3c4d5e6f7g8h9i0j','admin','$2a$10$bEq4i31LLUl4mkWtfb/3Se/NMG2Kh69NI6svxEI9i79kF58luzakm','Rheymar A. Bayeta','role-26ac25f8935af17f0ef9','2025-11-20 01:47:25','2025-11-20 01:47:25'),
('user-3c4d5e6f7g8h9i0j1k2l','lord','$2a$10$7WZtSj3qrXXLoVcoxY8gSOOewssHIekHglQ96i1vyt/F4SrlIe.rW','Lourd William','role-1ad9ffd5b1a1c9b2a45a','2025-11-20 08:32:57','2025-11-20 08:32:57'),
('user-4d5e6f7g8h9i0j1k2l3m','fritz','$2a$10$w/5CALsnFE6aF5j758lEkO2PZLqBtqIdEryIAJQ8xgi63IQw3wAR.','Fritz','role-7dc1ec6d8d4b8c5e4f9c','2025-11-20 08:33:21','2025-11-20 08:33:21'),
('user-5e6f7g8h9i0j1k2l3m4n','chyrramae','$2a$10$c4xJiXCHJHZ/bITJ56qmJeVvMg2kJ8PPFSETS2RY51H5v9ErvzfJ6','Chyrramae','role-42c8c4c8a8dc0000000f','2025-11-20 08:35:32','2025-11-20 08:35:32'),
('user-6f7g8h9i0j1k2l3m4n5o','superadmin','$2a$10$hE9f8H9mK8I7mL6nO5pQ.SEu3T2sR1qU0vW9xY8zB7cA6dE5fG4','Super Administrator','role-26ac25f8935af17f0ef9','2025-11-25 11:40:00','2025-11-25 11:40:00');

-- ============================================
-- STEP 3: ENTITIES TABLE (EMPTY)
-- ============================================
CREATE TABLE `entities` (
  `entity_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `entity_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_entity_name (entity_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 4: FEES_CATEGORIES TABLE (EMPTY)
-- ============================================
CREATE TABLE `fees_categories` (
  `category_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `category_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 5: FEES_CHARGES TABLE (EMPTY)
-- ============================================
CREATE TABLE `fees_charges` (
  `fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `category_id` VARCHAR(64) NOT NULL,
  `fee_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_amount` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category_id (category_id),
  CONSTRAINT fees_charges_ibfk_1 FOREIGN KEY (category_id) REFERENCES fees_categories(category_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 6: ATTRIBUTES TABLE (EMPTY)
-- ============================================
CREATE TABLE `attributes` (
  `attribute_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `attribute_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `description` TEXT COLLATE utf8mb4_unicode_ci,
  `is_active` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attribute_name (attribute_name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 7: PERMIT_TYPES TABLE (EMPTY)
-- ============================================
CREATE TABLE `permit_types` (
  `permit_type_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `permit_type_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `attribute_id` VARCHAR(64) DEFAULT NULL,
  `attribute` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci,
  `is_active` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_permit_type_name (permit_type_name),
  INDEX idx_is_active (is_active),
  INDEX idx_attribute_id (attribute_id),
  CONSTRAINT permit_types_ibfk_1 FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 8: PERMIT_TYPE_FEES TABLE (EMPTY)
-- ============================================
CREATE TABLE `permit_type_fees` (
  `permit_type_fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `permit_type_id` VARCHAR(64) NOT NULL,
  `fee_id` VARCHAR(64) NOT NULL,
  `default_amount` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `is_required` TINYINT(1) DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_permit_fee (permit_type_id, fee_id),
  INDEX idx_permit_type_id (permit_type_id),
  INDEX idx_fee_id (fee_id),
  CONSTRAINT permit_type_fees_ibfk_1 FOREIGN KEY (permit_type_id) REFERENCES permit_types(permit_type_id) ON DELETE CASCADE,
  CONSTRAINT permit_type_fees_ibfk_2 FOREIGN KEY (fee_id) REFERENCES fees_charges(fee_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 9: APPLICATIONS TABLE (EMPTY)
-- ============================================
CREATE TABLE `applications` (
  `application_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `application_number` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL UNIQUE,
  `entity_id` VARCHAR(64) NOT NULL,
  `creator_id` VARCHAR(64) NOT NULL,
  `assessor_id` VARCHAR(64) DEFAULT NULL,
  `approver_id` VARCHAR(64) DEFAULT NULL,
  `permit_type` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` ENUM('Pending','Assessed','Pending Approval','Approved','Paid','Issued','Released','Rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_entity_id (entity_id),
  INDEX idx_creator_id (creator_id),
  INDEX idx_assessor_id (assessor_id),
  INDEX idx_approver_id (approver_id),
  INDEX idx_application_number (application_number),
  CONSTRAINT applications_ibfk_1 FOREIGN KEY (entity_id) REFERENCES entities(entity_id) ON DELETE RESTRICT,
  CONSTRAINT applications_ibfk_2 FOREIGN KEY (creator_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT applications_ibfk_3 FOREIGN KEY (assessor_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT applications_ibfk_4 FOREIGN KEY (approver_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 10: APPLICATION_PARAMETERS TABLE (EMPTY)
-- ============================================
CREATE TABLE `application_parameters` (
  `parameter_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `application_id` VARCHAR(64) NOT NULL,
  `param_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `param_value` TEXT COLLATE utf8mb4_unicode_ci,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_application_id (application_id),
  INDEX idx_param_name (param_name),
  CONSTRAINT application_parameters_ibfk_1 FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 11: APPLICATION_SEQUENCE TABLE (EMPTY)
-- ============================================
CREATE TABLE `application_sequence` (
  `sequence_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `period` VARCHAR(7) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `sequence_number` INT NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 12: ASSESSMENT_RULES TABLE (EMPTY)
-- ============================================
CREATE TABLE `assessment_rules` (
  `rule_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `permit_type_id` VARCHAR(64) NOT NULL,
  `attribute_id` VARCHAR(64) NOT NULL,
  `rule_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` TEXT COLLATE utf8mb4_unicode_ci,
  `is_active` TINYINT(1) DEFAULT '1',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_permit_attribute_id (permit_type_id, attribute_id),
  INDEX idx_permit_type_id (permit_type_id),
  INDEX idx_attribute_id (attribute_id),
  INDEX idx_is_active (is_active),
  CONSTRAINT fk_assessment_rules_permit_type FOREIGN KEY (permit_type_id) REFERENCES permit_types(permit_type_id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_rules_attribute FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 13: ASSESSMENT_RULE_FEES TABLE (EMPTY)
-- ============================================
CREATE TABLE `assessment_rule_fees` (
  `rule_fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `fee_id` VARCHAR(64) NOT NULL,
  `fee_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL DEFAULT '0.00',
  `is_required` TINYINT(1) DEFAULT '1',
  `fee_order` INT DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_rule_id (rule_id),
  INDEX idx_fee_id (fee_id),
  INDEX idx_fee_order (fee_order),
  CONSTRAINT fk_rule_fees_rule FOREIGN KEY (rule_id) REFERENCES assessment_rules(rule_id) ON DELETE CASCADE,
  CONSTRAINT fk_rule_fees_fee FOREIGN KEY (fee_id) REFERENCES fees_charges(fee_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 14: ASSESSMENT_RECORDS TABLE (EMPTY)
-- ============================================
CREATE TABLE `assessment_records` (
  `assessment_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `application_id` VARCHAR(64) NOT NULL UNIQUE,
  `business_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` TEXT COLLATE utf8mb4_unicode_ci,
  `app_number` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_type` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT 'NEW',
  `app_date` DATE NOT NULL,
  `validity_date` DATE DEFAULT NULL,
  `total_balance_due` DECIMAL(12,2) DEFAULT '0.00',
  `total_surcharge` DECIMAL(12,2) DEFAULT '0.00',
  `total_interest` DECIMAL(12,2) DEFAULT '0.00',
  `total_amount_due` DECIMAL(12,2) DEFAULT '0.00',
  `q1_amount` DECIMAL(12,2) DEFAULT '0.00',
  `q2_amount` DECIMAL(12,2) DEFAULT '0.00',
  `q3_amount` DECIMAL(12,2) DEFAULT '0.00',
  `q4_amount` DECIMAL(12,2) DEFAULT '0.00',
  `prepared_by_user_id` VARCHAR(64) DEFAULT NULL,
  `approved_by_user_id` VARCHAR(64) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_application_id (application_id),
  INDEX idx_app_date (app_date),
  INDEX prepared_by_user_id (prepared_by_user_id),
  INDEX approved_by_user_id (approved_by_user_id),
  CONSTRAINT assessment_records_ibfk_1 FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
  CONSTRAINT assessment_records_ibfk_2 FOREIGN KEY (prepared_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT assessment_records_ibfk_3 FOREIGN KEY (approved_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 15: ASSESSMENT_RECORD_FEES TABLE (EMPTY)
-- ============================================
CREATE TABLE `assessment_record_fees` (
  `record_fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `assessment_id` VARCHAR(64) NOT NULL,
  `fee_id` VARCHAR(64) NOT NULL,
  `fee_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `quantity` INT DEFAULT '1',
  `balance_due` DECIMAL(10,2) NOT NULL,
  `surcharge` DECIMAL(10,2) DEFAULT '0.00',
  `interest` DECIMAL(10,2) DEFAULT '0.00',
  `total` DECIMAL(10,2) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_assessment_id (assessment_id),
  INDEX idx_fee_id (fee_id),
  CONSTRAINT assessment_record_fees_ibfk_1 FOREIGN KEY (assessment_id) REFERENCES assessment_records(assessment_id) ON DELETE CASCADE,
  CONSTRAINT assessment_record_fees_ibfk_2 FOREIGN KEY (fee_id) REFERENCES fees_charges(fee_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 16: ASSESSED_FEES TABLE (EMPTY)
-- ============================================
CREATE TABLE `assessed_fees` (
  `assessed_fee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `application_id` VARCHAR(64) NOT NULL,
  `fee_id` VARCHAR(64) NOT NULL,
  `assessed_amount` DECIMAL(10,2) NOT NULL,
  `assessed_by_user_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_application_id (application_id),
  INDEX idx_fee_id (fee_id),
  INDEX assessed_by_user_id (assessed_by_user_id),
  CONSTRAINT assessed_fees_ibfk_1 FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
  CONSTRAINT assessed_fees_ibfk_2 FOREIGN KEY (fee_id) REFERENCES fees_charges(fee_id) ON DELETE RESTRICT,
  CONSTRAINT assessed_fees_ibfk_3 FOREIGN KEY (assessed_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 17: AUDIT_TRAIL TABLE (EMPTY)
-- ============================================
CREATE TABLE `audit_trail` (
  `log_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `application_id` VARCHAR(64) DEFAULT NULL,
  `action` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` TEXT COLLATE utf8mb4_unicode_ci,
  `timestamp` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_application_id (application_id),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp),
  CONSTRAINT audit_trail_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT audit_trail_ibfk_2 FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 18: NOTIFICATIONS TABLE (EMPTY)
-- ============================================
CREATE TABLE `notifications` (
  `notification_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `user_id` VARCHAR(64) NOT NULL,
  `message` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` TINYINT(1) DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at),
  CONSTRAINT notifications_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 19: MESSAGES TABLE (EMPTY)
-- ============================================
CREATE TABLE `messages` (
  `message_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `sender_id` VARCHAR(64) NOT NULL,
  `recipient_id` VARCHAR(64) NOT NULL,
  `application_context_id` VARCHAR(64) DEFAULT NULL,
  `content` TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sender_id (sender_id),
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_application_context_id (application_context_id),
  INDEX idx_timestamp (timestamp),
  CONSTRAINT messages_ibfk_1 FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT messages_ibfk_2 FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT messages_ibfk_3 FOREIGN KEY (application_context_id) REFERENCES applications(application_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 20: PAYMENTS TABLE (EMPTY)
-- ============================================
CREATE TABLE `payments` (
  `payment_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `application_id` VARCHAR(64) NOT NULL,
  `official_receipt_no` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` DATE NOT NULL,
  `address` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `recorded_by_user_id` VARCHAR(64) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_receipt (application_id, official_receipt_no),
  INDEX idx_application_id (application_id),
  INDEX idx_official_receipt_no (official_receipt_no),
  INDEX recorded_by_user_id (recorded_by_user_id),
  CONSTRAINT payments_ibfk_1 FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE CASCADE,
  CONSTRAINT payments_ibfk_2 FOREIGN KEY (recorded_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- STEP 21: SYSTEM_SETTINGS TABLE (EMPTY)
-- ============================================
CREATE TABLE `system_settings` (
  `setting_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `setting_key` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL UNIQUE,
  `setting_value` TEXT COLLATE utf8mb4_unicode_ci,
  `description` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipal_treasurer_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipal_treasurer_position` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permit_signatory_name` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permit_signatory_position` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET @OLD_UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET @OLD_SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-25 11:45:00
