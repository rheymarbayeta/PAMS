-- PAMS Database Schema (Empty)
-- Generated: November 27, 2025
-- Description: Clean schema with no data for fresh installations

-- MySQL Settings
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- =====================================================
-- CREATE DATABASE
-- =====================================================
DROP DATABASE IF EXISTS `pams_db`;
CREATE DATABASE `pams_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `pams_db`;

-- =====================================================
-- TABLE: roles
-- Description: User roles for access control
-- =====================================================
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `role_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`),
  KEY `idx_role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: users
-- Description: System users with authentication
-- =====================================================
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `user_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: entities
-- Description: Businesses/organizations applying for permits
-- =====================================================
DROP TABLE IF EXISTS `entities`;
CREATE TABLE `entities` (
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`entity_id`),
  KEY `idx_entity_name` (`entity_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: attributes
-- Description: Permit attributes (e.g., Cell Site, Perya)
-- =====================================================
DROP TABLE IF EXISTS `attributes`;
CREATE TABLE `attributes` (
  `attribute_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attribute_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`attribute_id`),
  UNIQUE KEY `attribute_name` (`attribute_name`),
  KEY `idx_attribute_name` (`attribute_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: permit_types
-- Description: Types of permits available
-- =====================================================
DROP TABLE IF EXISTS `permit_types`;
CREATE TABLE `permit_types` (
  `permit_type_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permit_type_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attribute_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attribute` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `validity_date` date DEFAULT NULL COMMENT 'Specific validity/expiration date for permits of this type',
  `validity_months` int DEFAULT '12' COMMENT 'Validity period in months for this permit type',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permit_type_id`),
  UNIQUE KEY `permit_type_name` (`permit_type_name`),
  KEY `idx_permit_type_name` (`permit_type_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_attribute_id` (`attribute_id`),
  CONSTRAINT `permit_types_ibfk_1` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`attribute_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: fees_categories
-- Description: Categories for fees (e.g., Regulatory Fee, Other Charge)
-- =====================================================
DROP TABLE IF EXISTS `fees_categories`;
CREATE TABLE `fees_categories` (
  `category_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: fees_charges
-- Description: Individual fees that can be assessed
-- =====================================================
DROP TABLE IF EXISTS `fees_charges`;
CREATE TABLE `fees_charges` (
  `fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`fee_id`),
  KEY `idx_category_id` (`category_id`),
  CONSTRAINT `fees_charges_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `fees_categories` (`category_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: permit_type_fees
-- Description: Default fees associated with permit types
-- =====================================================
DROP TABLE IF EXISTS `permit_type_fees`;
CREATE TABLE `permit_type_fees` (
  `permit_type_fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permit_type_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `is_required` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permit_type_fee_id`),
  UNIQUE KEY `unique_permit_fee` (`permit_type_id`,`fee_id`),
  KEY `idx_permit_type_id` (`permit_type_id`),
  KEY `idx_fee_id` (`fee_id`),
  CONSTRAINT `permit_type_fees_ibfk_1` FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types` (`permit_type_id`) ON DELETE CASCADE,
  CONSTRAINT `permit_type_fees_ibfk_2` FOREIGN KEY (`fee_id`) REFERENCES `fees_charges` (`fee_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: assessment_rules
-- Description: Assessment rules per permit type and attribute
-- =====================================================
DROP TABLE IF EXISTS `assessment_rules`;
CREATE TABLE `assessment_rules` (
  `rule_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permit_type_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attribute_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_id`),
  UNIQUE KEY `unique_permit_attribute_id` (`permit_type_id`,`attribute_id`),
  KEY `idx_permit_type_id` (`permit_type_id`),
  KEY `idx_attribute_id` (`attribute_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_assessment_rules_attribute` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`attribute_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessment_rules_permit_type` FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types` (`permit_type_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: assessment_rule_fees
-- Description: Fees included in assessment rules
-- =====================================================
DROP TABLE IF EXISTS `assessment_rule_fees`;
CREATE TABLE `assessment_rule_fees` (
  `rule_fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rule_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `is_required` tinyint(1) DEFAULT '1',
  `fee_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rule_fee_id`),
  KEY `idx_rule_id` (`rule_id`),
  KEY `idx_fee_id` (`fee_id`),
  KEY `idx_fee_order` (`fee_order`),
  CONSTRAINT `fk_rule_fees_fee` FOREIGN KEY (`fee_id`) REFERENCES `fees_charges` (`fee_id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_rule_fees_rule` FOREIGN KEY (`rule_id`) REFERENCES `assessment_rules` (`rule_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: applications
-- Description: Permit applications with full lifecycle
-- =====================================================
DROP TABLE IF EXISTS `applications`;
CREATE TABLE `applications` (
  `application_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creator_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessor_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approver_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_by_user_id` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_at` timestamp NULL DEFAULT NULL,
  `released_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `received_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `released_at` timestamp NULL DEFAULT NULL,
  `validity_date` date DEFAULT NULL COMMENT 'Permit validity/expiration date',
  `permit_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permit_type_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('Pending','Assessed','Pending Approval','Approved','Paid','Issued','Released') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `application_number` (`application_number`),
  KEY `idx_status` (`status`),
  KEY `idx_entity_id` (`entity_id`),
  KEY `idx_creator_id` (`creator_id`),
  KEY `idx_assessor_id` (`assessor_id`),
  KEY `idx_approver_id` (`approver_id`),
  KEY `idx_application_number` (`application_number`),
  KEY `idx_applications_issued_by` (`issued_by_user_id`),
  KEY `idx_validity_date` (`validity_date`),
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`entity_id`) REFERENCES `entities` (`entity_id`) ON DELETE RESTRICT,
  CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `applications_ibfk_3` FOREIGN KEY (`assessor_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `applications_ibfk_4` FOREIGN KEY (`approver_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_applications_issued_by` FOREIGN KEY (`issued_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: application_parameters
-- Description: Dynamic parameters/metadata for applications
-- =====================================================
DROP TABLE IF EXISTS `application_parameters`;
CREATE TABLE `application_parameters` (
  `parameter_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `param_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `param_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parameter_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_param_name` (`param_name`),
  CONSTRAINT `application_parameters_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: application_sequence
-- Description: Sequence numbers for application number generation
-- =====================================================
DROP TABLE IF EXISTS `application_sequence`;
CREATE TABLE `application_sequence` (
  `sequence_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `period` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence_number` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sequence_id`),
  UNIQUE KEY `period` (`period`),
  KEY `idx_period` (`period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: assessed_fees
-- Description: Fees assessed to specific applications
-- =====================================================
DROP TABLE IF EXISTS `assessed_fees`;
CREATE TABLE `assessed_fees` (
  `assessed_fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessed_amount` decimal(10,2) NOT NULL,
  `unit_amount` decimal(10,2) DEFAULT NULL,
  `quantity` int DEFAULT '1',
  `assessed_by_user_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`assessed_fee_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_fee_id` (`fee_id`),
  KEY `assessed_by_user_id` (`assessed_by_user_id`),
  CONSTRAINT `assessed_fees_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `assessed_fees_ibfk_2` FOREIGN KEY (`fee_id`) REFERENCES `fees_charges` (`fee_id`) ON DELETE RESTRICT,
  CONSTRAINT `assessed_fees_ibfk_3` FOREIGN KEY (`assessed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: assessment_records
-- Description: Assessment summary records for applications
-- =====================================================
DROP TABLE IF EXISTS `assessment_records`;
CREATE TABLE `assessment_records` (
  `assessment_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `business_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `app_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'NEW',
  `app_date` date NOT NULL,
  `validity_date` date DEFAULT NULL,
  `total_balance_due` decimal(12,2) DEFAULT '0.00',
  `total_surcharge` decimal(12,2) DEFAULT '0.00',
  `total_interest` decimal(12,2) DEFAULT '0.00',
  `total_amount_due` decimal(12,2) DEFAULT '0.00',
  `q1_amount` decimal(12,2) DEFAULT '0.00',
  `q2_amount` decimal(12,2) DEFAULT '0.00',
  `q3_amount` decimal(12,2) DEFAULT '0.00',
  `q4_amount` decimal(12,2) DEFAULT '0.00',
  `prepared_by_user_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by_user_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`assessment_id`),
  UNIQUE KEY `application_id` (`application_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_app_date` (`app_date`),
  KEY `prepared_by_user_id` (`prepared_by_user_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  CONSTRAINT `assessment_records_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `assessment_records_ibfk_2` FOREIGN KEY (`prepared_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `assessment_records_ibfk_3` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: assessment_record_fees
-- Description: Individual fees within assessment records
-- =====================================================
DROP TABLE IF EXISTS `assessment_record_fees`;
CREATE TABLE `assessment_record_fees` (
  `record_fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `quantity` int DEFAULT '1',
  `balance_due` decimal(10,2) NOT NULL,
  `surcharge` decimal(10,2) DEFAULT '0.00',
  `interest` decimal(10,2) DEFAULT '0.00',
  `total` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`record_fee_id`),
  KEY `idx_assessment_id` (`assessment_id`),
  KEY `idx_fee_id` (`fee_id`),
  CONSTRAINT `assessment_record_fees_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `assessment_records` (`assessment_id`) ON DELETE CASCADE,
  CONSTRAINT `assessment_record_fees_ibfk_2` FOREIGN KEY (`fee_id`) REFERENCES `fees_charges` (`fee_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: payments
-- Description: Payment records for applications
-- =====================================================
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `payment_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `official_receipt_no` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `recorded_by_user_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `unique_receipt` (`application_id`,`official_receipt_no`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_official_receipt_no` (`official_receipt_no`),
  KEY `recorded_by_user_id` (`recorded_by_user_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: notifications
-- Description: User notifications
-- =====================================================
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `notification_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: messages
-- Description: Internal chat messages between users
-- =====================================================
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `message_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_context_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_recipient_id` (`recipient_id`),
  KEY `idx_application_context_id` (`application_context_id`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`application_context_id`) REFERENCES `applications` (`application_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: audit_trail
-- Description: Audit logging for all system actions
-- =====================================================
DROP TABLE IF EXISTS `audit_trail`;
CREATE TABLE `audit_trail` (
  `log_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `application_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_action` (`action`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `audit_trail_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `audit_trail_ibfk_2` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: system_settings
-- Description: System configuration settings
-- =====================================================
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `setting_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipal_treasurer_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipal_treasurer_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permit_signatory_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permit_signatory_position` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABLE: report_templates
-- Description: DOCX templates for document generation
-- =====================================================
DROP TABLE IF EXISTS `report_templates`;
CREATE TABLE `report_templates` (
  `template_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `template_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int NOT NULL DEFAULT '0',
  `permit_type_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_default` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`template_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_permit_type_id` (`permit_type_id`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `report_templates_ibfk_1` FOREIGN KEY (`permit_type_id`) REFERENCES `permit_types` (`permit_type_id`) ON DELETE SET NULL,
  CONSTRAINT `report_templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Stores DOCX templates for generating permit reports using docxtemplater';

-- =====================================================
-- SEED DATA: Default Roles
-- =====================================================
INSERT INTO `roles` (`role_id`, `role_name`) VALUES
('role-26ac25f8935af17f0ef9', 'SuperAdmin'),
('role-5e9fcf77ad79f5c64a9a', 'Admin'),
('role-1ad9ffd5b1a1c9b2a45a', 'Assessor'),
('role-42c8c4c8a8dc0000000f', 'Approver'),
('role-7dc1ec6d8d4b8c5e4f9c', 'Application Creator'),
('role-8f9d1a2b3c4e5f6g7h8i', 'Viewer');

-- =====================================================
-- SEED DATA: Default Admin User
-- Password: admin123 (bcrypt hashed)
-- =====================================================
INSERT INTO `users` (`user_id`, `username`, `password_hash`, `full_name`, `role_id`) VALUES
('user-1a2b3c4d5e6f7g8h9i0j', 'admin', '$2a$10$bEq4i31LLUl4mkWtfb/3Se/NMG2Kh69NI6svxEI9i79kF58luzakm', 'System Administrator', 'role-26ac25f8935af17f0ef9');

-- =====================================================
-- Restore MySQL Settings
-- =====================================================
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- =====================================================
-- Schema creation complete!
-- 
-- Tables created: 21
-- Default roles: 6
-- Default admin user: admin / admin123
-- 
-- Next steps:
-- 1. Run: mysql -u root -p < database/schema_empty.sql
-- 2. Configure backend/.env with your database credentials
-- 3. Start backend: cd backend && npm run dev
-- 4. Start frontend: cd frontend && npm run dev
-- 5. Login at http://localhost:3000 with admin / admin123
-- =====================================================
