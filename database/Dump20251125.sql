-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: pams_db
-- ------------------------------------------------------
-- Server version	8.0.44

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

--
-- Table structure for table `application_parameters`
--

DROP TABLE IF EXISTS `application_parameters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_parameters` (
  `parameter_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `param_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `param_value` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`parameter_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_param_name` (`param_name`),
  CONSTRAINT `application_parameters_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_parameters`
--

LOCK TABLES `application_parameters` WRITE;
/*!40000 ALTER TABLE `application_parameters` DISABLE KEYS */;
INSERT INTO `application_parameters` VALUES (9,3,'Municipality','Dalaguete','2025-11-20 08:25:56','2025-11-20 08:25:56'),(10,3,'Province','Cebu','2025-11-20 08:25:56','2025-11-20 08:25:56'),(11,3,'Country','Philippines','2025-11-20 08:25:56','2025-11-20 08:25:56'),(12,3,'Barangay','Poblacion','2025-11-20 08:25:56','2025-11-20 08:25:56'),(13,4,'Municipality','Dalaguete','2025-11-20 08:31:47','2025-11-20 08:31:47'),(14,4,'Province','Cebu','2025-11-20 08:31:47','2025-11-20 08:31:47'),(15,4,'Country','Philippines','2025-11-20 08:31:47','2025-11-20 08:31:47'),(16,4,'Barangay','Lanao','2025-11-20 08:31:47','2025-11-20 08:31:47'),(17,5,'Municipality','Dalaguete','2025-11-20 08:33:54','2025-11-20 08:33:54'),(18,5,'Province','Cebu','2025-11-20 08:33:54','2025-11-20 08:33:54'),(19,5,'Country','Philippines','2025-11-20 08:33:54','2025-11-20 08:33:54'),(20,5,'Barangay','Cawayan','2025-11-20 08:33:54','2025-11-20 08:33:54');
/*!40000 ALTER TABLE `application_parameters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application_sequence`
--

DROP TABLE IF EXISTS `application_sequence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_sequence` (
  `sequence_id` int NOT NULL AUTO_INCREMENT,
  `period` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sequence_number` int NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`sequence_id`),
  UNIQUE KEY `period` (`period`),
  KEY `idx_period` (`period`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_sequence`
--

LOCK TABLES `application_sequence` WRITE;
/*!40000 ALTER TABLE `application_sequence` DISABLE KEYS */;
INSERT INTO `application_sequence` VALUES (1,'2025-11',10,'2025-11-20 03:08:24','2025-11-20 08:33:54');
/*!40000 ALTER TABLE `application_sequence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `application_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int NOT NULL,
  `creator_id` int NOT NULL,
  `assessor_id` int DEFAULT NULL,
  `approver_id` int DEFAULT NULL,
  `permit_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('Pending','Assessed','Pending Approval','Approved','Paid','Issued','Released','Rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'Pending',
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
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`entity_id`) REFERENCES `entities` (`entity_id`) ON DELETE RESTRICT,
  CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `applications_ibfk_3` FOREIGN KEY (`assessor_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `applications_ibfk_4` FOREIGN KEY (`approver_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applications`
--

LOCK TABLES `applications` WRITE;
/*!40000 ALTER TABLE `applications` DISABLE KEYS */;
INSERT INTO `applications` VALUES (3,'2025-11-008',1,1,1,1,'Mayor\'s Permit','Approved','2025-11-20 08:25:56','2025-11-20 08:26:44'),(4,'2025-11-009',2,1,1,1,'Mayor\'s Permit','Approved','2025-11-20 08:31:47','2025-11-20 08:32:06'),(5,'2025-11-010',1,4,3,5,'Mayor\'s Permit','Paid','2025-11-20 08:33:54','2025-11-25 02:19:08');
/*!40000 ALTER TABLE `applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessed_fees`
--

DROP TABLE IF EXISTS `assessed_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessed_fees` (
  `assessed_fee_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `fee_id` int NOT NULL,
  `assessed_amount` decimal(10,2) NOT NULL,
  `assessed_by_user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`assessed_fee_id`),
  KEY `assessed_by_user_id` (`assessed_by_user_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_fee_id` (`fee_id`),
  CONSTRAINT `assessed_fees_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `assessed_fees_ibfk_2` FOREIGN KEY (`fee_id`) REFERENCES `fees_charges` (`fee_id`) ON DELETE RESTRICT,
  CONSTRAINT `assessed_fees_ibfk_3` FOREIGN KEY (`assessed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessed_fees`
--

LOCK TABLES `assessed_fees` WRITE;
/*!40000 ALTER TABLE `assessed_fees` DISABLE KEYS */;
INSERT INTO `assessed_fees` VALUES (6,3,17,50000.00,1,'2025-11-20 08:26:01','2025-11-20 08:26:01'),(8,3,18,200.00,1,'2025-11-20 08:26:01','2025-11-20 08:26:01'),(9,4,17,50000.00,1,'2025-11-20 08:31:50','2025-11-20 08:31:50'),(10,4,18,200.00,1,'2025-11-20 08:31:50','2025-11-20 08:31:50'),(11,5,17,50000.00,3,'2025-11-20 08:34:25','2025-11-20 08:34:25'),(12,5,18,200.00,5,'2025-11-20 08:34:25','2025-11-20 08:36:42');
/*!40000 ALTER TABLE `assessed_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_record_fees`
--

DROP TABLE IF EXISTS `assessment_record_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_record_fees` (
  `record_fee_id` int NOT NULL AUTO_INCREMENT,
  `assessment_id` int NOT NULL,
  `fee_id` int NOT NULL,
  `fee_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_record_fees`
--

LOCK TABLES `assessment_record_fees` WRITE;
/*!40000 ALTER TABLE `assessment_record_fees` DISABLE KEYS */;
INSERT INTO `assessment_record_fees` VALUES (1,1,18,'Computer Fee',200.00,1,200.00,0.00,0.00,200.00,'2025-11-20 08:26:17'),(2,1,17,'Mayor\'s Permit Fee',50000.00,1,50000.00,0.00,0.00,50000.00,'2025-11-20 08:26:17'),(3,2,18,'Computer Fee',200.00,1,200.00,0.00,0.00,200.00,'2025-11-20 08:31:57'),(4,2,17,'Mayor\'s Permit Fee',50000.00,1,50000.00,0.00,0.00,50000.00,'2025-11-20 08:31:57'),(5,3,18,'Computer Fee',200.00,1,200.00,0.00,0.00,200.00,'2025-11-20 08:34:49'),(6,3,17,'Mayor\'s Permit Fee',50000.00,1,50000.00,0.00,0.00,50000.00,'2025-11-20 08:34:49');
/*!40000 ALTER TABLE `assessment_record_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_records`
--

DROP TABLE IF EXISTS `assessment_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_records` (
  `assessment_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `business_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `app_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `app_type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'NEW',
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
  `prepared_by_user_id` int DEFAULT NULL,
  `approved_by_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`assessment_id`),
  UNIQUE KEY `application_id` (`application_id`),
  KEY `prepared_by_user_id` (`prepared_by_user_id`),
  KEY `approved_by_user_id` (`approved_by_user_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_app_date` (`app_date`),
  CONSTRAINT `assessment_records_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `assessment_records_ibfk_2` FOREIGN KEY (`prepared_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `assessment_records_ibfk_3` FOREIGN KEY (`approved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_records`
--

LOCK TABLES `assessment_records` WRITE;
/*!40000 ALTER TABLE `assessment_records` DISABLE KEYS */;
INSERT INTO `assessment_records` VALUES (1,3,'GLOBE TELECOME, INC.','GLOBE TELECOME, INC.','','2025-11-008','NEW','2025-11-20','2025-11-30',50200.00,0.00,0.00,50200.00,0.00,19076.00,18072.00,13052.00,1,1,'2025-11-20 08:26:17','2025-11-20 08:26:44'),(2,4,'SAMPLE','SAMPLE','','2025-11-009','NEW','2025-11-20','2025-11-30',50200.00,0.00,0.00,50200.00,0.00,19076.00,18072.00,13052.00,1,1,'2025-11-20 08:31:57','2025-11-20 08:32:06'),(3,5,'GLOBE TELECOME, INC.','GLOBE TELECOME, INC.','','2025-11-010','NEW','2025-11-20','2025-11-30',50200.00,0.00,0.00,50200.00,0.00,19076.00,18072.00,13052.00,3,5,'2025-11-20 08:34:49','2025-11-20 08:36:45');
/*!40000 ALTER TABLE `assessment_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_rule_fees`
--

DROP TABLE IF EXISTS `assessment_rule_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_rule_fees` (
  `rule_fee_id` int NOT NULL AUTO_INCREMENT,
  `rule_id` int NOT NULL,
  `fee_id` int NOT NULL,
  `fee_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_rule_fees`
--

LOCK TABLES `assessment_rule_fees` WRITE;
/*!40000 ALTER TABLE `assessment_rule_fees` DISABLE KEYS */;
INSERT INTO `assessment_rule_fees` VALUES (3,1,17,'Mayor\'s Permit Fee',50000.00,1,0,'2025-11-20 08:09:01','2025-11-20 08:09:01'),(4,1,18,'Computer Fee',200.00,1,1,'2025-11-20 08:09:01','2025-11-20 08:09:01');
/*!40000 ALTER TABLE `assessment_rule_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_rules`
--

DROP TABLE IF EXISTS `assessment_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assessment_rules` (
  `rule_id` int NOT NULL AUTO_INCREMENT,
  `permit_type_id` int NOT NULL,
  `attribute_id` int NOT NULL,
  `rule_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_rules`
--

LOCK TABLES `assessment_rules` WRITE;
/*!40000 ALTER TABLE `assessment_rules` DISABLE KEYS */;
INSERT INTO `assessment_rules` VALUES (1,1,1,'Mayor\'s Permit - Cell Site','Mayor\'s Permit - Cell Site',1,'2025-11-20 07:11:19','2025-11-20 07:11:19');
/*!40000 ALTER TABLE `assessment_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attributes`
--

DROP TABLE IF EXISTS `attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attributes` (
  `attribute_id` int NOT NULL AUTO_INCREMENT,
  `attribute_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`attribute_id`),
  UNIQUE KEY `attribute_name` (`attribute_name`),
  KEY `idx_attribute_name` (`attribute_name`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attributes`
--

LOCK TABLES `attributes` WRITE;
/*!40000 ALTER TABLE `attributes` DISABLE KEYS */;
INSERT INTO `attributes` VALUES (1,'Cell Site','Permit Fee for Cell Site',1,'2025-11-20 06:21:08','2025-11-20 06:21:08');
/*!40000 ALTER TABLE `attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_trail`
--

DROP TABLE IF EXISTS `audit_trail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_trail` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `application_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_action` (`action`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `audit_trail_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `audit_trail_ibfk_2` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=94 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_trail`
--

LOCK TABLES `audit_trail` WRITE;
/*!40000 ALTER TABLE `audit_trail` DISABLE KEYS */;
INSERT INTO `audit_trail` VALUES (1,1,NULL,'LOGIN','User \'admin\' logged in','2025-11-20 03:07:12'),(2,1,NULL,'CREATE_ENTITY','Created entity \'GLOBE TELECOME, INC.\'','2025-11-20 03:07:59'),(3,1,NULL,'CREATE_APP','Created application 2025-11-002 (ID: 1) for permit type: Mayor\'s Permit','2025-11-20 03:08:24'),(4,1,NULL,'ADD_FEE','Added fee ID 5 with amount 1000 to application #1','2025-11-20 03:08:49'),(5,1,NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #1','2025-11-20 03:08:51'),(6,1,NULL,'APPROVE_APP','Approved application #1','2025-11-20 03:09:07'),(7,1,NULL,'CREATE_APP','Created application 2025-11-003 (ID: 2) for permit type: Mayor\'s Permit','2025-11-20 03:19:17'),(8,1,NULL,'ADD_FEE','Added fee ID 5 with amount 1000 to application #2','2025-11-20 03:19:24'),(9,1,NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #2','2025-11-20 03:19:25'),(10,1,NULL,'CREATE_APP','Created application 2025-11-004 (ID: 3) for permit type: Mayor\'s Permit','2025-11-20 03:35:06'),(11,1,NULL,'ADD_FEE','Added fee ID 7 with amount 2000 to application #3','2025-11-20 03:35:12'),(12,1,NULL,'ADD_FEE','Added fee ID 13 with amount 1000 to application #3','2025-11-20 03:35:14'),(13,1,NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #3','2025-11-20 03:35:15'),(14,1,NULL,'CREATE_ENTITY','Created entity \'SAMPLE\'','2025-11-20 03:58:07'),(15,1,NULL,'CREATE_APP','Created application 2025-11-005 (ID: 4) for permit type: MAYOR\'S pERMIT','2025-11-20 03:58:29'),(16,1,NULL,'ADD_FEE','Added fee ID 1 with amount 500 to application #4','2025-11-20 03:58:36'),(17,1,NULL,'ADD_FEE','Added fee ID 12 with amount 250 to application #4','2025-11-20 03:58:38'),(18,1,NULL,'ADD_FEE','Added fee ID 13 with amount 1000 to application #4','2025-11-20 03:58:40'),(19,1,NULL,'ADD_FEE','Added fee ID 14 with amount 500 to application #4','2025-11-20 03:58:43'),(20,1,NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #4','2025-11-20 03:58:45'),(21,1,NULL,'CREATE_FEE_CATEGORY','Created category \'Regulatory Fee\'','2025-11-20 05:28:42'),(22,1,NULL,'DELETE_FEE','Deleted fee ID 5','2025-11-20 05:32:01'),(23,1,NULL,'DELETE_FEE','Deleted fee ID 13','2025-11-20 05:32:03'),(24,1,NULL,'DELETE_FEE','Deleted fee ID 6','2025-11-20 05:32:04'),(25,1,NULL,'DELETE_FEE','Deleted fee ID 14','2025-11-20 05:32:06'),(26,1,NULL,'DELETE_FEE','Deleted fee ID 7','2025-11-20 05:32:07'),(27,1,NULL,'DELETE_FEE','Deleted fee ID 15','2025-11-20 05:32:09'),(28,1,NULL,'DELETE_FEE','Deleted fee ID 4','2025-11-20 05:32:10'),(29,1,NULL,'DELETE_FEE','Deleted fee ID 12','2025-11-20 05:32:12'),(30,1,NULL,'DELETE_FEE','Deleted fee ID 3','2025-11-20 05:32:13'),(31,1,NULL,'DELETE_FEE','Deleted fee ID 11','2025-11-20 05:32:15'),(32,1,NULL,'DELETE_FEE','Deleted fee ID 8','2025-11-20 05:32:16'),(33,1,NULL,'DELETE_FEE','Deleted fee ID 16','2025-11-20 05:32:17'),(34,1,NULL,'DELETE_FEE','Deleted fee ID 2','2025-11-20 05:32:19'),(35,1,NULL,'DELETE_FEE','Deleted fee ID 10','2025-11-20 05:32:20'),(36,1,NULL,'DELETE_FEE','Deleted fee ID 1','2025-11-20 05:32:22'),(37,1,NULL,'DELETE_FEE','Deleted fee ID 9','2025-11-20 05:32:23'),(38,1,NULL,'CREATE_FEE','Created fee \'Mayor\'s Permit Fee\'','2025-11-20 05:32:53'),(39,1,NULL,'CREATE_ATTRIBUTE','Created attribute \'Cell Site\'','2025-11-20 06:21:08'),(40,1,NULL,'CREATE_PERMIT_TYPE','Created permit type \'Mayor\'s Permit\'','2025-11-20 06:21:39'),(41,1,NULL,'CREATE_FEE','Created fee \'Computer Fee\'','2025-11-20 06:34:03'),(42,1,NULL,'CREATE_ASSESSMENT_RULE','Created assessment rule \'Mayor\'s Permit - Cell Site\'','2025-11-20 07:11:19'),(43,1,NULL,'CREATE_APP','Created application 2025-11-006 (ID: 1) for permit type: Mayor\'s Permit','2025-11-20 07:12:10'),(44,1,NULL,'DELETE_APPLICATION','Deleted application 2025-11-006','2025-11-20 07:25:32'),(45,1,NULL,'UPDATE_PERMIT_TYPE','Updated permit type ID 1','2025-11-20 07:25:46'),(46,1,NULL,'UPDATE_PERMIT_TYPE','Updated permit type ID 1','2025-11-20 07:25:58'),(47,1,NULL,'UPDATE_PERMIT_TYPE','Updated permit type ID 1','2025-11-20 07:29:18'),(48,1,NULL,'CREATE_APP','Created application 2025-11-007 (ID: 2) for permit type: Mayor\'s Permit','2025-11-20 08:02:11'),(49,1,NULL,'UPDATE_ASSESSMENT_RULE','Updated assessment rule ID 1','2025-11-20 08:09:01'),(50,1,NULL,'LOGIN','User \'admin\' logged in','2025-11-20 08:15:02'),(51,1,NULL,'ADD_FEE','Added fee ID 17 with amount 50000 to application #2','2025-11-20 08:21:32'),(52,1,NULL,'ADD_FEE','Added fee ID 17 with amount 50000 to application #2','2025-11-20 08:21:32'),(53,1,NULL,'ADD_FEE','Added fee ID 18 with amount 200 to application #2','2025-11-20 08:21:32'),(54,1,NULL,'ADD_FEE','Added fee ID 18 with amount 200 to application #2','2025-11-20 08:21:32'),(55,1,NULL,'DELETE_APPLICATION','Deleted application 2025-11-007','2025-11-20 08:25:09'),(56,1,3,'CREATE_APP','Created application 2025-11-008 (ID: 3) for permit type: Mayor\'s Permit','2025-11-20 08:25:56'),(57,1,3,'ADD_FEE','Added fee ID 17 with amount 50000 to application #3','2025-11-20 08:26:01'),(58,1,3,'ADD_FEE','Added fee ID 17 with amount 50000 to application #3','2025-11-20 08:26:01'),(59,1,3,'ADD_FEE','Added fee ID 18 with amount 200 to application #3','2025-11-20 08:26:01'),(60,1,3,'ADD_FEE','Added fee ID 18 with amount 200 to application #3','2025-11-20 08:26:01'),(61,1,3,'REMOVE_FEE','Removed fee ID 7 from application #3','2025-11-20 08:26:13'),(62,1,3,'REMOVE_FEE','Removed fee ID 5 from application #3','2025-11-20 08:26:15'),(63,1,3,'SUBMIT_ASSESSMENT','Submitted assessment for application #3','2025-11-20 08:26:17'),(64,1,3,'APPROVE_APP','Approved application #3','2025-11-20 08:26:44'),(65,1,4,'CREATE_APP','Created application 2025-11-009 (ID: 4) for permit type: Mayor\'s Permit','2025-11-20 08:31:47'),(66,1,4,'ADD_FEE','Added fee ID 17 with amount 50000 to application #4','2025-11-20 08:31:50'),(67,1,4,'ADD_FEE','Added fee ID 18 with amount 200 to application #4','2025-11-20 08:31:50'),(68,1,4,'SUBMIT_ASSESSMENT','Submitted assessment for application #4','2025-11-20 08:31:57'),(69,1,4,'APPROVE_APP','Approved application #4','2025-11-20 08:32:06'),(70,1,NULL,'CREATE_USER','Created user \'lord\'','2025-11-20 08:32:57'),(71,1,NULL,'CREATE_USER','Created user \'fritz\'','2025-11-20 08:33:21'),(72,4,NULL,'LOGIN','User \'fritz\' logged in','2025-11-20 08:33:33'),(73,4,5,'CREATE_APP','Created application 2025-11-010 (ID: 5) for permit type: Mayor\'s Permit','2025-11-20 08:33:54'),(74,3,NULL,'LOGIN','User \'lord\' logged in','2025-11-20 08:34:07'),(75,3,5,'ADD_FEE','Added fee ID 17 with amount 50000 to application #5','2025-11-20 08:34:25'),(76,3,5,'ADD_FEE','Added fee ID 18 with amount 200 to application #5','2025-11-20 08:34:25'),(77,3,5,'SUBMIT_ASSESSMENT','Submitted assessment for application #5','2025-11-20 08:34:49'),(78,1,NULL,'LOGIN','User \'admin\' logged in','2025-11-20 08:35:01'),(79,1,NULL,'CREATE_USER','Created user \'chyrramae\'','2025-11-20 08:35:32'),(80,5,NULL,'LOGIN','User \'chyrramae\' logged in','2025-11-20 08:35:43'),(81,5,5,'REASSESS_FEE','Re-assessed fee ID 12 from 200.00 to 200 for application #5','2025-11-20 08:36:42'),(82,5,5,'APPROVE_APP','Approved application #5','2025-11-20 08:36:45'),(83,3,NULL,'LOGIN','User \'lord\' logged in','2025-11-20 08:37:13'),(84,4,NULL,'LOGIN','User \'fritz\' logged in','2025-11-20 08:37:33'),(85,1,NULL,'LOGIN','User \'admin\' logged in','2025-11-20 08:53:31'),(86,1,NULL,'UPDATE_ENTITY','Updated entity ID 1','2025-11-20 08:56:18'),(87,1,NULL,'LOGIN','User \'admin\' logged in','2025-11-24 01:49:53'),(88,1,NULL,'UPDATE_FEE_CATEGORY','Updated category ID 5','2025-11-25 00:26:51'),(89,1,NULL,'LOGIN','User \'admin\' logged in','2025-11-25 00:49:50'),(90,1,5,'RECORD_PAYMENT','Recorded payment for application #5: Receipt #12312321, Amount: ₱50200.00','2025-11-25 00:50:10'),(91,1,5,'RECORD_PAYMENT','Recorded payment for application #5: Receipt #sdfsd, Amount: ₱50200.00','2025-11-25 02:19:08'),(92,1,NULL,'UPDATE_ENTITY','Updated entity ID 1','2025-11-25 02:31:38'),(93,1,NULL,'UPDATE_USER','Updated user ID 1','2025-11-25 02:36:21');
/*!40000 ALTER TABLE `audit_trail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entities`
--

DROP TABLE IF EXISTS `entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entities` (
  `entity_id` int NOT NULL AUTO_INCREMENT,
  `entity_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`entity_id`),
  KEY `idx_entity_name` (`entity_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entities`
--

LOCK TABLES `entities` WRITE;
/*!40000 ALTER TABLE `entities` DISABLE KEYS */;
INSERT INTO `entities` VALUES (1,'GLOBE TELECOM, INC.','GLOBE TELECOM, INC.',NULL,NULL,'Cebu City','2025-11-20 03:07:59','2025-11-25 02:31:38'),(2,'SAMPLE','SAMPLE',NULL,NULL,NULL,'2025-11-20 03:58:07','2025-11-20 03:58:07');
/*!40000 ALTER TABLE `entities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fees_categories`
--

DROP TABLE IF EXISTS `fees_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fees_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fees_categories`
--

LOCK TABLES `fees_categories` WRITE;
/*!40000 ALTER TABLE `fees_categories` DISABLE KEYS */;
INSERT INTO `fees_categories` VALUES (1,'Zoning Fees','2025-11-20 01:47:25','2025-11-20 01:47:25'),(2,'Fire Safety Fees','2025-11-20 01:47:25','2025-11-20 01:47:25'),(3,'Building Permit Fees','2025-11-20 01:47:25','2025-11-20 01:47:25'),(4,'Environmental Fees','2025-11-20 01:47:25','2025-11-20 01:47:25'),(5,'Other Charge','2025-11-20 01:47:25','2025-11-25 00:26:51'),(11,'Regulatory Fee','2025-11-20 05:28:42','2025-11-20 05:28:42');
/*!40000 ALTER TABLE `fees_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fees_charges`
--

DROP TABLE IF EXISTS `fees_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fees_charges` (
  `fee_id` int NOT NULL AUTO_INCREMENT,
  `category_id` int NOT NULL,
  `fee_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`fee_id`),
  KEY `idx_category_id` (`category_id`),
  CONSTRAINT `fees_charges_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `fees_categories` (`category_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fees_charges`
--

LOCK TABLES `fees_charges` WRITE;
/*!40000 ALTER TABLE `fees_charges` DISABLE KEYS */;
INSERT INTO `fees_charges` VALUES (17,11,'Mayor\'s Permit Fee',1000.00,'2025-11-20 05:32:53','2025-11-20 05:32:53'),(18,5,'Computer Fee',200.00,'2025-11-20 06:34:03','2025-11-20 06:34:03');
/*!40000 ALTER TABLE `fees_charges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `recipient_id` int NOT NULL,
  `application_context_id` int DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_recipient_id` (`recipient_id`),
  KEY `idx_application_context_id` (`application_context_id`),
  KEY `idx_timestamp` (`timestamp`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`application_context_id`) REFERENCES `applications` (`application_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,3,4,NULL,'Okay na pre na asses na.','2025-11-20 08:34:42'),(2,5,3,NULL,'approve na boss.','2025-11-20 08:37:06');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `link` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,1,'Application #1 has been approved','/applications/1',1,'2025-11-20 03:09:07'),(2,1,'Application #3 has been approved','/applications/3',1,'2025-11-20 08:26:44'),(3,1,'Application #4 has been approved','/applications/4',1,'2025-11-20 08:32:06'),(4,3,'New application 2025-11-010 requires assessment','/applications/5',1,'2025-11-20 08:33:54'),(5,4,'New message from Lourd William: Okay na pre na asses na.','/chat?user_id=3',1,'2025-11-20 08:34:42'),(6,4,'Application #5 has been approved','/applications/5',1,'2025-11-20 08:36:45'),(7,3,'New message from Chyrramae: approve na boss.','/chat?user_id=5',1,'2025-11-20 08:37:06');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `official_receipt_no` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_date` date NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `recorded_by_user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `unique_receipt` (`application_id`,`official_receipt_no`),
  KEY `recorded_by_user_id` (`recorded_by_user_id`),
  KEY `idx_application_id` (`application_id`),
  KEY `idx_official_receipt_no` (`official_receipt_no`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `applications` (`application_id`) ON DELETE CASCADE,
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,5,'12312321','2025-11-25','Poblacion, Dalaguete, Cebu',50200.00,1,'2025-11-25 00:50:10','2025-11-25 00:50:10'),(2,4,'123123','2025-11-25','Poblacion, Dlaaguete, Cebu',50200.00,1,'2025-11-25 02:12:06','2025-11-25 02:12:06'),(3,5,'123123','2025-11-25','Dalaguete, Cebu',50200.00,1,'2025-11-25 02:17:00','2025-11-25 02:17:00'),(4,5,'sdfsd','2025-11-25',NULL,50200.00,1,'2025-11-25 02:19:08','2025-11-25 02:19:08');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permit_type_fees`
--

DROP TABLE IF EXISTS `permit_type_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permit_type_fees` (
  `permit_type_fee_id` int NOT NULL AUTO_INCREMENT,
  `permit_type_id` int NOT NULL,
  `fee_id` int NOT NULL,
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permit_type_fees`
--

LOCK TABLES `permit_type_fees` WRITE;
/*!40000 ALTER TABLE `permit_type_fees` DISABLE KEYS */;
/*!40000 ALTER TABLE `permit_type_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permit_types`
--

DROP TABLE IF EXISTS `permit_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permit_types` (
  `permit_type_id` int NOT NULL AUTO_INCREMENT,
  `permit_type_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attribute_id` int DEFAULT NULL,
  `attribute` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permit_type_id`),
  UNIQUE KEY `permit_type_name` (`permit_type_name`),
  KEY `idx_permit_type_name` (`permit_type_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_attribute` (`attribute`),
  KEY `idx_attribute_id` (`attribute_id`),
  CONSTRAINT `permit_types_ibfk_1` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`attribute_id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permit_types`
--

LOCK TABLES `permit_types` WRITE;
/*!40000 ALTER TABLE `permit_types` DISABLE KEYS */;
INSERT INTO `permit_types` VALUES (1,'Mayor\'s Permit',1,NULL,'Mayor\'s Permit for Cell Site',1,'2025-11-20 06:21:39','2025-11-20 07:29:18');
/*!40000 ALTER TABLE `permit_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` int NOT NULL AUTO_INCREMENT,
  `role_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'SuperAdmin','2025-11-20 01:47:25','2025-11-20 01:47:25'),(2,'Admin','2025-11-20 01:47:25','2025-11-20 01:47:25'),(3,'Assessor','2025-11-20 01:47:25','2025-11-20 01:47:25'),(4,'Approver','2025-11-20 01:47:25','2025-11-20 01:47:25'),(5,'Application Creator','2025-11-20 01:47:25','2025-11-20 01:47:25'),(6,'Viewer','2025-11-20 01:47:25','2025-11-20 01:47:25');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `setting_id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `setting_value` text COLLATE utf8mb4_unicode_ci,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `municipal_treasurer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `municipal_treasurer_position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permit_signatory_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permit_signatory_position` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`setting_id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'default_municipality','Dalaguete',NULL,'2025-11-20 01:48:06','2025-11-25 02:04:28',NULL,NULL,NULL,NULL),(2,'default_province','Cebu',NULL,'2025-11-20 01:48:06','2025-11-25 02:04:28',NULL,NULL,NULL,NULL),(3,'default_country','Philippines',NULL,'2025-11-20 01:48:06','2025-11-25 02:04:28',NULL,NULL,NULL,NULL),(4,'municipal_treasurer_name','HAIDEE D. OGOC',NULL,'2025-11-25 01:46:50','2025-11-25 02:04:28',NULL,NULL,NULL,NULL),(5,'municipal_treasurer_position','ACTING MUNICIPAL TREASURER',NULL,'2025-11-25 01:46:50','2025-11-25 02:04:28',NULL,NULL,NULL,NULL),(6,'permit_signatory_name','NELIN B. TAMBIS, CPA,  MPA',NULL,'2025-11-25 01:46:50','2025-11-25 02:04:28',NULL,NULL,NULL,NULL),(7,'permit_signatory_position','MUNICIPAL MAYOR',NULL,'2025-11-25 01:46:50','2025-11-25 02:04:28',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2a$10$bEq4i31LLUl4mkWtfb/3Se/NMG2Kh69NI6svxEI9i79kF58luzakm','Rheymar A. Bayeta',1,'2025-11-20 01:47:25','2025-11-25 02:36:21'),(3,'lord','$2a$10$7WZtSj3qrXXLoVcoxY8gSOOewssHIekHglQ96i1vyt/F4SrlIe.rW','Lourd William',3,'2025-11-20 08:32:57','2025-11-20 08:32:57'),(4,'fritz','$2a$10$w/5CALsnFE6aF5j758lEkO2PZLqBtqIdEryIAJQ8xgi63IQw3wAR.','Fritz',5,'2025-11-20 08:33:21','2025-11-20 08:33:21'),(5,'chyrramae','$2a$10$c4xJiXCHJHZ/bITJ56qmJeVvMg2kJ8PPFSETS2RY51H5v9ErvzfJ6','Chyrramae',4,'2025-11-20 08:35:32','2025-11-20 08:35:32');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-25 11:35:20
