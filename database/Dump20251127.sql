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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_parameters`
--

LOCK TABLES `application_parameters` WRITE;
/*!40000 ALTER TABLE `application_parameters` DISABLE KEYS */;
INSERT INTO `application_parameters` VALUES ('0fbd863491d4559bf679690f9c0ed416','1fc48aefe4672b6fa2d0b653f8fde9d1','Country','Philippines','2025-11-27 01:34:55','2025-11-27 01:34:55'),('236fafbfb5ab098ea729409657fcca0d','84752e77c079a97a2e7429c0af8d3705','Barangay','Cawayan','2025-11-27 02:01:03','2025-11-27 02:01:03'),('277d9fb08ed8574a64b5d4638f33896f','84752e77c079a97a2e7429c0af8d3705','Province','Cebu','2025-11-27 02:01:03','2025-11-27 02:01:03'),('2c32792eee7bf8b94f9b8f48f9cc9457','1fc48aefe4672b6fa2d0b653f8fde9d1','Barangay','Poblacion','2025-11-27 01:34:55','2025-11-27 01:34:55'),('40dc58ba760aede70d219a011addf41d','adf9d15837ca54d9a0ac507e552b4e5a','Barangay','Cawayan','2025-11-27 02:03:34','2025-11-27 02:03:34'),('41940083869aaee5ef93671aa0051cd5','adf9d15837ca54d9a0ac507e552b4e5a','Municipality','Dalaguete','2025-11-27 02:03:34','2025-11-27 02:03:34'),('6b0539940b290a3c3ce314ead40b461b','84752e77c079a97a2e7429c0af8d3705','Municipality','Dalaguete','2025-11-27 02:01:03','2025-11-27 02:01:03'),('6d2efff1e13e37d4ba626a627f982f02','84752e77c079a97a2e7429c0af8d3705','Country','Philippines','2025-11-27 02:01:03','2025-11-27 02:01:03'),('75dd3c626a95893495fb76de7c8bb319','adf9d15837ca54d9a0ac507e552b4e5a','Province','Cebu','2025-11-27 02:03:34','2025-11-27 02:03:34'),('794441a85b3ae1912c42e65968c8b3cb','1fc48aefe4672b6fa2d0b653f8fde9d1','Province','Cebu','2025-11-27 01:34:55','2025-11-27 01:34:55'),('8d0c05ff1e52006c811a073194e183d5','1fc48aefe4672b6fa2d0b653f8fde9d1','Municipality','Dalaguete','2025-11-27 01:34:55','2025-11-27 01:34:55'),('a9d31a26f08675ba3a13289b1df1ad6f','adf9d15837ca54d9a0ac507e552b4e5a','Country','Philippines','2025-11-27 02:03:34','2025-11-27 02:03:34');
/*!40000 ALTER TABLE `application_parameters` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application_sequence`
--

DROP TABLE IF EXISTS `application_sequence`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_sequence`
--

LOCK TABLES `application_sequence` WRITE;
/*!40000 ALTER TABLE `application_sequence` DISABLE KEYS */;
INSERT INTO `application_sequence` VALUES ('7298d6db16cf8ef81fce8d63eb469cb2','2025-11',11,'2025-11-25 06:32:34','2025-11-27 02:03:34');
/*!40000 ALTER TABLE `application_sequence` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `applications`
--

DROP TABLE IF EXISTS `applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`entity_id`) REFERENCES `entities` (`entity_id`) ON DELETE RESTRICT,
  CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`creator_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT,
  CONSTRAINT `applications_ibfk_3` FOREIGN KEY (`assessor_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `applications_ibfk_4` FOREIGN KEY (`approver_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_applications_issued_by` FOREIGN KEY (`issued_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `applications`
--

LOCK TABLES `applications` WRITE;
/*!40000 ALTER TABLE `applications` DISABLE KEYS */;
INSERT INTO `applications` VALUES ('1fc48aefe4672b6fa2d0b653f8fde9d1','2025-11-009','f3abddedbfc9e623d37ca770a77cbcdd','user-1a2b3c4d5e6f7g8h9i0j','user-1a2b3c4d5e6f7g8h9i0j','user-1a2b3c4d5e6f7g8h9i0j',NULL,NULL,NULL,NULL,NULL,'Special Mayor\'s Permit','30190a0da91bc5d2dc4be18b5f9c5d81','Paid','2025-11-27 01:34:55','2025-11-27 01:45:11'),('84752e77c079a97a2e7429c0af8d3705','2025-11-010','cab877a6d1dae46cfa2ec26ec9467d5f','user-1a2b3c4d5e6f7g8h9i0j','user-1a2b3c4d5e6f7g8h9i0j','user-1a2b3c4d5e6f7g8h9i0j','user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 02:02:27','Rheymar Bayeta','Nelson Mandela','2025-11-27 02:03:02','Mayor\'s Permit','2a26825567df00e0bac462f17b961a0a','Released','2025-11-27 02:01:03','2025-11-27 02:03:02'),('adf9d15837ca54d9a0ac507e552b4e5a','2025-11-011','cab877a6d1dae46cfa2ec26ec9467d5f','user-1a2b3c4d5e6f7g8h9i0j',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Mayor\'s Permit','2a26825567df00e0bac462f17b961a0a','Pending','2025-11-27 02:03:34','2025-11-27 02:03:34');
/*!40000 ALTER TABLE `applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessed_fees`
--

DROP TABLE IF EXISTS `assessed_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessed_fees`
--

LOCK TABLES `assessed_fees` WRITE;
/*!40000 ALTER TABLE `assessed_fees` DISABLE KEYS */;
INSERT INTO `assessed_fees` VALUES ('09e574a7053a9e7f5028bd3816364c5f','1fc48aefe4672b6fa2d0b653f8fde9d1','483599b44707b19dbb44da1299f7c8ef',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:42','2025-11-27 01:35:42'),('1159ea92a744157f182c970ebd022671','1fc48aefe4672b6fa2d0b653f8fde9d1','866a4f9cebf09fd85213afdad0fb6768',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:10','2025-11-27 01:36:10'),('2df293597c8c24b6691006a45259ad23','1fc48aefe4672b6fa2d0b653f8fde9d1','46d3a77c791a247e35d928466fef2b3c',4200.00,600.00,7,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:35','2025-11-27 01:36:35'),('48ce2d6f33f1f1126067355d01a1437c','1fc48aefe4672b6fa2d0b653f8fde9d1','ad6d47427a39b795e76b42a206c7e9c4',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:11','2025-11-27 01:35:11'),('4cd70f3eb920e24370b37c8f58967430','1fc48aefe4672b6fa2d0b653f8fde9d1','f9893491c2a08cda7b836b116cde3a62',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:38','2025-11-27 01:35:38'),('574034392b4add1b0b6b918999664fa3','1fc48aefe4672b6fa2d0b653f8fde9d1','5656aced0541505737351eca2046ecb4',600.00,600.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:00','2025-11-27 01:36:00'),('6bc158d47d24b97158276b586e157d88','1fc48aefe4672b6fa2d0b653f8fde9d1','d90ebf10d49e0fd5e2964544b9e1f7bf',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:48','2025-11-27 01:36:48'),('8abcdd07e847a57201f3404f31c1bb59','1fc48aefe4672b6fa2d0b653f8fde9d1','9d1dfef7b3301b02f6e3836af5b1a186',1500.00,500.00,3,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:27','2025-11-27 01:36:27'),('90af55fa1bb9142523cdf4b911b1e537','1fc48aefe4672b6fa2d0b653f8fde9d1','10f7694c4a3ed1b2841bdf5135a21a53',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:06','2025-11-27 01:36:06'),('9d0141c8e4740475bdf448953256bae9','1fc48aefe4672b6fa2d0b653f8fde9d1','81cccc988e746282b2aeb08a81b50346',1000.00,500.00,2,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:28','2025-11-27 01:35:28'),('9f81f4e29866d3e52dd02836ac1af0fe','1fc48aefe4672b6fa2d0b653f8fde9d1','6bfb5988ffe9321b7a0158477a916bd7',600.00,600.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:19','2025-11-27 01:35:19'),('ba479673591f7da8d4f67eb3babef5dc','84752e77c079a97a2e7429c0af8d3705','a4e615c09226f598ce7873434c6fb9d9',200.00,200.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 02:01:08','2025-11-27 02:01:08'),('c599f779af033054ac441405811d68b4','1fc48aefe4672b6fa2d0b653f8fde9d1','1beaa88a4583950db82e624652a2a444',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:42','2025-11-27 01:36:42'),('cee1e8abf75f6e779453f1afd0760950','1fc48aefe4672b6fa2d0b653f8fde9d1','fc3e607aa110bc827306260341969fc7',600.00,600.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:07','2025-11-27 01:35:07'),('d38853329b928e2cebf073a0ad823eff','84752e77c079a97a2e7429c0af8d3705','5a3b497a2e3b50fe1ac015cbb18c8497',50000.00,50000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 02:01:08','2025-11-27 02:01:08'),('ed89c4bcd6f2bf30ca611dcf45b51d62','1fc48aefe4672b6fa2d0b653f8fde9d1','93e8b9d8de6f6628454dbea4bf3deb98',1200.00,600.00,2,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:36:20','2025-11-27 01:36:20'),('edd7a15043ea5211a61009588696be5c','1fc48aefe4672b6fa2d0b653f8fde9d1','0b5a93f4414de15e629f84c5a83ded03',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:55','2025-11-27 01:35:55'),('ff7691a06fda4701414da29af83f5db0','1fc48aefe4672b6fa2d0b653f8fde9d1','0125d1cb81a1f1dae1fc03afa0052e2f',1000.00,1000.00,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:35:50','2025-11-27 01:35:50');
/*!40000 ALTER TABLE `assessed_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_record_fees`
--

DROP TABLE IF EXISTS `assessment_record_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_record_fees`
--

LOCK TABLES `assessment_record_fees` WRITE;
/*!40000 ALTER TABLE `assessment_record_fees` DISABLE KEYS */;
INSERT INTO `assessment_record_fees` VALUES ('10550ba89d6cb5d6c069bfc3de4c4a71','9a673071728c41f117fb3311a8e7751c','1beaa88a4583950db82e624652a2a444','Trampoline',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('341e96dc1c6997cd2971553d3cd048db','9a673071728c41f117fb3311a8e7751c','d90ebf10d49e0fd5e2964544b9e1f7bf','Viking',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('350838cd1dce51c436526d949949618f','9a673071728c41f117fb3311a8e7751c','9d1dfef7b3301b02f6e3836af5b1a186','Target Shooting',1500.00,3,1500.00,0.00,0.00,1500.00,'2025-11-27 01:37:54'),('4d7ed583cc8ca9d41a815dcbfbc82c2f','9a673071728c41f117fb3311a8e7751c','81cccc988e746282b2aeb08a81b50346','Drop Ball',1000.00,2,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('53ab8258664f3fbf8fe9d61c586e5313','6d66acee980017c37fa8a7751f1b6b05','5a3b497a2e3b50fe1ac015cbb18c8497','Permit Fee',50000.00,1,50000.00,0.00,0.00,50000.00,'2025-11-27 02:01:14'),('54b60938673a81f83a01db62b342ea29','9a673071728c41f117fb3311a8e7751c','46d3a77c791a247e35d928466fef2b3c','Three Balls',4200.00,7,4200.00,0.00,0.00,4200.00,'2025-11-27 01:37:54'),('567cd7fcff61facf624d58efc4ad01e7','9a673071728c41f117fb3311a8e7751c','ad6d47427a39b795e76b42a206c7e9c4','Bingo',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('5d6d8d8dd548121c9691e5ef39208892','9a673071728c41f117fb3311a8e7751c','fc3e607aa110bc827306260341969fc7','Basketball Ring Shooting',600.00,1,600.00,0.00,0.00,600.00,'2025-11-27 01:37:54'),('7205cc181b9c81fc8233b87d18c24565','9a673071728c41f117fb3311a8e7751c','0b5a93f4414de15e629f84c5a83ded03','Horror Train',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('77f8ae48056afdece7023f9f0a9d0021','9a673071728c41f117fb3311a8e7751c','866a4f9cebf09fd85213afdad0fb6768','Octopus',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('884e4d3406eeb0969ef63510e90fe26c','9a673071728c41f117fb3311a8e7751c','483599b44707b19dbb44da1299f7c8ef','Flying Elephant',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('8b8f63d5be997e6147db7746a18ea784','9a673071728c41f117fb3311a8e7751c','93e8b9d8de6f6628454dbea4bf3deb98','Tangga',1200.00,2,1200.00,0.00,0.00,1200.00,'2025-11-27 01:37:54'),('a5cd50e8fe36158baa716307f299565b','6d66acee980017c37fa8a7751f1b6b05','a4e615c09226f598ce7873434c6fb9d9','Computer Fee',200.00,1,200.00,0.00,0.00,200.00,'2025-11-27 02:01:14'),('aac060c0670188e27d42c8363a6f294a','9a673071728c41f117fb3311a8e7751c','5656aced0541505737351eca2046ecb4','Itsa-Itsa (Ring/Coins)',600.00,1,600.00,0.00,0.00,600.00,'2025-11-27 01:37:54'),('bc468b473d3602ef0e0596801372c374','9a673071728c41f117fb3311a8e7751c','f9893491c2a08cda7b836b116cde3a62','Ferries Wheel',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('d2fc934a1b623e693e7b507014b0b742','9a673071728c41f117fb3311a8e7751c','10f7694c4a3ed1b2841bdf5135a21a53','Mr. Rabbit',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54'),('f70eddab399008781ada9af1b22a5c07','9a673071728c41f117fb3311a8e7751c','6bfb5988ffe9321b7a0158477a916bd7','Dart Balloon',600.00,1,600.00,0.00,0.00,600.00,'2025-11-27 01:37:54'),('fd211174b34715f079397c77d41b6af1','9a673071728c41f117fb3311a8e7751c','0125d1cb81a1f1dae1fc03afa0052e2f','Frisbee',1000.00,1,1000.00,0.00,0.00,1000.00,'2025-11-27 01:37:54');
/*!40000 ALTER TABLE `assessment_record_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_records`
--

DROP TABLE IF EXISTS `assessment_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_records`
--

LOCK TABLES `assessment_records` WRITE;
/*!40000 ALTER TABLE `assessment_records` DISABLE KEYS */;
INSERT INTO `assessment_records` VALUES ('6d66acee980017c37fa8a7751f1b6b05','84752e77c079a97a2e7429c0af8d3705','GLOBE TELECOM, INC.','GLOBE TELECOM, INC.','','2025-11-010','NEW','2025-11-27','2025-11-30',50200.00,0.00,0.00,50200.00,0.00,19076.00,18072.00,13052.00,'user-1a2b3c4d5e6f7g8h9i0j','user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 02:01:14','2025-11-27 02:01:28'),('9a673071728c41f117fb3311a8e7751c','1fc48aefe4672b6fa2d0b653f8fde9d1','THREE ROSES CARNIVAL','THREE ROSES CARNIVAL','','2025-11-009','NEW','2025-11-27','2025-11-30',18700.00,0.00,0.00,18700.00,0.00,7106.00,6732.00,4862.00,'user-1a2b3c4d5e6f7g8h9i0j','user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:37:54','2025-11-27 01:44:32');
/*!40000 ALTER TABLE `assessment_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_rule_fees`
--

DROP TABLE IF EXISTS `assessment_rule_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_rule_fees`
--

LOCK TABLES `assessment_rule_fees` WRITE;
/*!40000 ALTER TABLE `assessment_rule_fees` DISABLE KEYS */;
INSERT INTO `assessment_rule_fees` VALUES ('0231e5ff59c7ad95ac0dcea01c2b8218','5fb844cd6746cc1d2a726053f69cfcbd','a4e615c09226f598ce7873434c6fb9d9','Computer Fee',200.00,1,1,'2025-11-25 06:11:48','2025-11-25 06:11:48'),('0cd658280cbc85d3bcec0836c0fc51ba','5fb844cd6746cc1d2a726053f69cfcbd','5a3b497a2e3b50fe1ac015cbb18c8497','Permit Fee',50000.00,1,0,'2025-11-25 06:11:48','2025-11-25 06:11:48');
/*!40000 ALTER TABLE `assessment_rule_fees` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `assessment_rules`
--

DROP TABLE IF EXISTS `assessment_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assessment_rules`
--

LOCK TABLES `assessment_rules` WRITE;
/*!40000 ALTER TABLE `assessment_rules` DISABLE KEYS */;
INSERT INTO `assessment_rules` VALUES ('5fb844cd6746cc1d2a726053f69cfcbd','2a26825567df00e0bac462f17b961a0a','4e6cae0f7bcd841b7cd816d637842833','Mayor\'s Permit - Cell Site',NULL,1,'2025-11-25 06:11:48','2025-11-25 06:11:48'),('909803f4c7bd176cce8266b24de18216','30190a0da91bc5d2dc4be18b5f9c5d81','be910c509e923badd760bbb5a8459b15','Special Mayor\'s Permit - PERYA',NULL,1,'2025-11-26 01:54:25','2025-11-26 01:54:25');
/*!40000 ALTER TABLE `assessment_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attributes`
--

DROP TABLE IF EXISTS `attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attributes`
--

LOCK TABLES `attributes` WRITE;
/*!40000 ALTER TABLE `attributes` DISABLE KEYS */;
INSERT INTO `attributes` VALUES ('4e6cae0f7bcd841b7cd816d637842833','Cell Site','Cell Site ',1,'2025-11-25 05:18:39','2025-11-25 05:18:39'),('be910c509e923badd760bbb5a8459b15','PERYA','Perya',1,'2025-11-26 01:37:02','2025-11-26 01:37:02');
/*!40000 ALTER TABLE `attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_trail`
--

DROP TABLE IF EXISTS `audit_trail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_trail`
--

LOCK TABLES `audit_trail` WRITE;
/*!40000 ALTER TABLE `audit_trail` DISABLE KEYS */;
INSERT INTO `audit_trail` VALUES ('006ec0fde7cd447739ad6adb15775490','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Trampoline\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:36:42'),('03d81a5514cbcb997916cceb979e6ed8','user-1a2b3c4d5e6f7g8h9i0j',NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #0ab6b0173c87d92bd73483ca78c3b562','2025-11-25 07:40:19'),('05ee18c693701c0ff082351a4a17043e','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Drop Ball\" with amount ₱500.00 to application #2025-11-005','2025-11-26 02:11:10'),('06a6ac1bdc934eb7d9902e2978f779ad','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Tangga\'','2025-11-26 01:35:59'),('0754eb42d467114a18ed92576e991578','user-1a2b3c4d5e6f7g8h9i0j',NULL,'DELETE_APPLICATION','Deleted application #2025-11-004 (Status: Rejected)','2025-11-26 02:33:26'),('0875eb2aa4e733d0a34bf2ad08f3ab68','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','SUBMIT_ASSESSMENT','Submitted assessment for application #2025-11-010','2025-11-27 02:01:14'),('08802df02d8396fb4906f4ebe6e537be','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Itsa-Itsa (Ring/Coins)\" with amount ₱600.00 to application #2025-11-004','2025-11-26 01:55:45'),('0a7b39afcf809f1fee56099e7cb26c9e','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Ferries Wheel\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:15:48'),('0b517a1f1a860034b1cf2b614fb08036','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Drop Ball\'','2025-11-26 01:33:18'),('0b589eab8343597c88369d788c3c7bc8','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Viking\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:07:49'),('0b85a522a13243bf48b971540476b020','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Three Balls\" with amount ₱600.00 to application #2025-11-004','2025-11-26 01:55:45'),('0c666a3500d52fe52522c717150e9514','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Horror Train\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('0d7665cfd47e507b02d3b408dd7c6765','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Target Shooting\" with amount ₱1,500.00 to application #2025-11-009','2025-11-27 01:36:27'),('0ff44ea4b2a6fcb148ccf7acda543ea5','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Dart Balloon\" with amount ₱600.00 to application #2025-11-004','2025-11-26 01:55:45'),('16aa022180ad0d3aa27af67f7a76bb96','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Flying Elephant\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('1930f5a9fd9af5713c47654986ea0394','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Mr. Rabbit\'','2025-11-26 01:36:10'),('1d8d62e601490b021370b6302ac0faaa','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ISSUE_PERMIT','Issued permit for application 2025-11-008','2025-11-26 06:33:03'),('1e26f4901891729a1789afabb5ef0174','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Itsa-Itsa (Ring/Coins)\'','2025-11-26 01:35:04'),('1f42f1bd40ea71bf7d640fce6c89a8f0','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Bingo\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:06:10'),('1f7ce5b811dfad93ccc42269ca4aaa4e','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Octopus\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:09'),('21874d993a123ada6510b5ea14a92f8a','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Hordam\'','2025-11-26 01:34:15'),('246f6cb0728eb473f6864efa148c9ef9','user-1a2b3c4d5e6f7g8h9i0j',NULL,'APPROVE_APP','Approved application #2025-11-006','2025-11-26 03:24:26'),('251e343ae8a54b9806d3e674732168e0','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Basketball Ring Shooting\" with amount ₱600.00 to application #2025-11-005','2025-11-26 02:11:10'),('25ac34840b9f2ba81b19a7731ffca882','user-1a2b3c4d5e6f7g8h9i0j',NULL,'DELETE_APPLICATION','Deleted application #2025-11-003 (Status: Issued) and all related records','2025-11-26 06:31:18'),('25eac8cbccf35ca59514e4452f15071b','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Tangga\" with amount ₱600.00 to application #2025-11-005','2025-11-26 02:11:10'),('27c46c51aeff8c91752aa09e92a19951','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Bingo\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:10'),('29e167708c50c7be6b1fd459c40f0123','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Mr. Rabbit\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:07:07'),('2e98a517e3539d31ed1a28a15c460bbc','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Basketball Ring Shooting\" with amount ₱600.00 to application #2025-11-006','2025-11-26 03:14:59'),('30541f3282ab6f4a8ae1b6564117cb13','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','RECORD_PAYMENT','Recorded payment for application #84752e77c079a97a2e7429c0af8d3705: Receipt #2313212, Amount: ₱50200.00','2025-11-27 02:01:43'),('34433e74cfd800709414530cf7feb08d','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Dart Balloon\" with amount ₱600.00 to application #2025-11-007','2025-11-26 06:06:20'),('34be6c8f256368aab16b0f0ce9642073','user-1a2b3c4d5e6f7g8h9i0j',NULL,'LOGIN','User \'admin\' logged in','2025-11-26 03:54:20'),('34c192d1c3648b418301afead67bed55','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Frisbee\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:35:50'),('3ad72c7df8392f079aeba2f861913047','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ISSUE_PERMIT','Issued permit for application 2025-11-003','2025-11-26 03:58:35'),('3df1c2ba83a3883148cf41648b2222a6','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Dart Balloon\'','2025-11-26 01:35:48'),('3e1cd798910b0b1f156bde03aa215313','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Flying Elephant\'','2025-11-26 01:32:41'),('3e36734c649bb2164f92e2f4331d7030','user-1a2b3c4d5e6f7g8h9i0j',NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #2025-11-008','2025-11-26 06:32:16'),('3e65984c273ff9184cc80450aae0df39','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Three Balls\" with amount ₱4,200.00 to application #2025-11-008','2025-11-26 06:32:04'),('3e9de86876bb4257e7a835b5e3436f5d','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_PERMIT_TYPE','Created permit type \'Special Mayor\'s Permit\'','2025-11-26 01:37:17'),('431054e07dae3b97b0844b58495a2bfa','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','CREATE_APP','Created application #2025-11-010 for permit type: Mayor\'s Permit','2025-11-27 02:01:03'),('441061b696471460389862fcd333a98e','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Tangga\" with amount ₱1,200.00 to application #2025-11-007','2025-11-26 06:07:18'),('453a77323d3d400e56ed1776e39571c6','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Horror Train\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:35:55'),('471ffdce4682bf44ddaae1e0a8f1f6e7','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','CREATE_APP','Created application #2025-11-009 for permit type: Special Mayor\'s Permit','2025-11-27 01:34:55'),('486b69583bf565515ab50e27988793dc','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_ATTRIBUTE','Created attribute \'PERYA\'','2025-11-26 01:37:02'),('4a559f2cf0a57ac3a4b5e92426f990f3','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','APPROVE_APP','Approved application #2025-11-009','2025-11-27 01:44:32'),('4acce3acd8e9bb28083b220591862808','user-1a2b3c4d5e6f7g8h9i0j',NULL,'DELETE_APPLICATION','Deleted application #2025-11-008 (Status: Issued) and all related records','2025-11-27 01:34:33'),('4af3ddd658cf7aabe430d79bd7792f05','user-1a2b3c4d5e6f7g8h9i0j',NULL,'APPROVE_APP','Approved application #2025-11-008','2025-11-26 06:32:42'),('50354c3c47f9d172ce3cdf96d3eae3ab','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Frisbee\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:09'),('54b811033d35b29ca9116b72779d27b7','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Dart Balloon\" with amount ₱600.00 to application #2025-11-006','2025-11-26 03:15:17'),('554cf9275fac5a8ca3789347219a8a85','user-1a2b3c4d5e6f7g8h9i0j',NULL,'LOGIN','User \'admin\' logged in','2025-11-27 01:31:19'),('56f32e96ede55f25b34044edb5770130','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Ferries Wheel\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:35:38'),('58623ff6d451565ce7cbd8a948b0d828','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','ADD_FEE','Added fee \"Computer Fee\" with amount ₱200.00 to application #2025-11-010','2025-11-27 02:01:08'),('58f0b550ea40a3ad0205126673d0e654','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Octopus\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:16:26'),('59642697c3b507eb99cb11c737446acd','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee ID 5a3b497a2e3b50fe1ac015cbb18c8497 with amount 50000 to application #0ab6b0173c87d92bd73483ca78c3b562','2025-11-25 07:40:16'),('5a3e8525ba971a90caf2fe867f025c62','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Drop Ball\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:06:29'),('5c639ed804093507adcae86bb03ac945','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','RELEASE_PERMIT','Released permit for application 2025-11-010. Released by: Rheymar Bayeta, Received by: Nelson Mandela','2025-11-27 02:03:02'),('5d5b4c5854ee3a1983a079eea88647be','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Pinball\'','2025-11-26 01:34:02'),('5db4baa30afb80933e264cbd0d224d85','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Frisbee\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:15:57'),('5e35c1a4ae63ec16a5289ee17486d3a7','user-1a2b3c4d5e6f7g8h9i0j',NULL,'GENERATE_DOCUMENT','Generated document \"[TEMPLATE] MAYOR\'S PERMIT\" for application 2025-11-008','2025-11-26 07:35:24'),('5ebfef4e0dbaa2e212eb06cfa629091f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Mr. Rabbit\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('5f160c982ab23a7fe788df28b42386f7','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Dart Balloon\" with amount ₱600.00 to application #2025-11-005','2025-11-26 02:11:10'),('617a740d0c6720fbd603fb4df7589243','user-1a2b3c4d5e6f7g8h9i0j',NULL,'APPROVE_APP','Approved application #2025-11-003','2025-11-25 08:00:08'),('6369f35ff39bfa80c37b5041672fe807','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Drop Ball\" with amount ₱500.00 to application #2025-11-004','2025-11-26 01:55:45'),('64e83ef7541acbf51f26810a9a775b40','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_APP','Created application #2025-11-004 for permit type: Special Mayor\'s Permit','2025-11-26 01:55:37'),('65a3f236a6d1f26ab21b9fe6e3e0bc23','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Mr. Rabbit\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:36:06'),('67e3763c58f8f042ec2482402789f7ea','user-1a2b3c4d5e6f7g8h9i0j',NULL,'DELETE_APPLICATION','Deleted application #2025-11-007 (Status: Issued) and all related records','2025-11-26 06:31:04'),('69841b7d57008ce479349144f2a9d799','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_ENTITY','Created entity \'THREE ROSES CARNIVAL\'','2025-11-26 01:55:17'),('6a3eb0c2d3d40207f8cc3fd89aeb43be','user-1a2b3c4d5e6f7g8h9i0j',NULL,'RECORD_PAYMENT','Recorded payment for application #6c83d39a29f1bbef21e53e408e7238f4: Receipt #1238282, Amount: ₱18700.00','2025-11-26 03:36:07'),('6ccaf22e18b2283bb63962f17492ab2c','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Viking\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:36:48'),('6eee84e04d84244dbee0f5b4e78793a8','user-1a2b3c4d5e6f7g8h9i0j','adf9d15837ca54d9a0ac507e552b4e5a','RENEW_APP','Renewed application #2025-11-010 as application #2025-11-011','2025-11-27 02:03:34'),('756f0c679d760c2501d07a86b4230767','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_APP','Created application #2025-11-008 for permit type: Special Mayor\'s Permit','2025-11-26 06:31:45'),('78e2c043ced037c0083705ecc6971ab0','user-1a2b3c4d5e6f7g8h9i0j',NULL,'UPDATE_PERMIT_TYPE','Updated permit type ID 2a26825567df00e0bac462f17b961a0a','2025-11-25 08:21:30'),('7a05a637ec1dde17414de912c80fe97d','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Drop Ball\" with amount ₱1,500.00 to application #2025-11-008','2025-11-26 06:32:13'),('7a3bc89eadcff61ba12fbb2b8aa6c221','user-1a2b3c4d5e6f7g8h9i0j',NULL,'GENERATE_DOCUMENT','Generated document \"[TEMPLATE] MAYOR\'S PERMIT\" for application 2025-11-008','2025-11-26 07:36:39'),('7e7f03c9bf991682bda45e51e35a710d','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Ferries Wheel\'','2025-11-26 01:32:00'),('7e87ca308e7718c1c1d0b019580d362a','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Drop Ball\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:35:28'),('801926191a96802715ac17ff4eb6bdf0','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Bingo\" with amount ₱1,000.00 to application #2025-11-008','2025-11-26 06:31:58'),('808a9a197406a3f4d8241811c80d1981','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Flying Elephant\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:10'),('86343ed39ccda24d58ce67c0bc30ceed','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Trampoline\'','2025-11-26 01:35:35'),('8741b2844ee3df9f43f7a728c166a428','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Target Shooting\" with amount ₱500.00 to application #2025-11-004','2025-11-26 01:55:44'),('8789e98a77583d60c042d219813c0230','user-1a2b3c4d5e6f7g8h9i0j',NULL,'APPROVE_APP','Approved application #2025-11-007','2025-11-26 06:08:12'),('87947afa6a9336047992de07e7a2072e','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Three Balls\" with amount ₱4,200.00 to application #2025-11-006','2025-11-26 03:16:53'),('87b3919726cc0de765d11db5ec121d3a','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Basketball Ring Shooting\" with amount ₱600.00 to application #2025-11-004','2025-11-26 01:55:45'),('881cf5752be718615d2394445808bea7','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee ID a4e615c09226f598ce7873434c6fb9d9 with amount 200 to application #0ab6b0173c87d92bd73483ca78c3b562','2025-11-25 07:40:16'),('891bb5780ed35cbe4c4ee10ef9bfdc6b','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','ADD_FEE','Added fee \"Permit Fee\" with amount ₱50,000.00 to application #2025-11-010','2025-11-27 02:01:08'),('89237bdac9ad715a2ed6f9976ef0f2ec','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Merry Go Round\'','2025-11-26 01:31:29'),('897196e14c2e2676c991c0889b29ce6e','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Viking\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('8bb23d30704885d07e3a2d376682c384','user-1a2b3c4d5e6f7g8h9i0j',NULL,'GENERATE_DOCUMENT','Generated document \"[TEMPLATE] MAYOR\'S PERMIT\" for application 2025-11-008','2025-11-26 07:37:50'),('8c62d5a90641349dd14d4baa850f8edd','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Itsa-Itsa (Ring/Coins)\" with amount ₱600.00 to application #2025-11-007','2025-11-26 06:07:02'),('8d13b78ae3b6ddf8d9605b450675acfb','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Tangga\" with amount ₱1,200.00 to application #2025-11-009','2025-11-27 01:36:20'),('8f4b020965868afc38e0a6b3dbc0a4a2','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Pula-Puti\'','2025-11-26 01:33:52'),('8f70410ef231700f0acdc06d66db6293','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Tangga\" with amount ₱600.00 to application #2025-11-004','2025-11-26 01:55:45'),('92d34320f62f82bcab23c7f5b5be1e84','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Octopus\'','2025-11-26 01:31:07'),('94bc5b4d7d0a860215f828c93e86a4b6','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Three Balls\" with amount ₱4,200.00 to application #2025-11-009','2025-11-27 01:36:35'),('954f2de03f487da55eb63d4b562cc717','user-1a2b3c4d5e6f7g8h9i0j',NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #2025-11-006','2025-11-26 03:17:07'),('966958249724463282f1cf990e55d01c','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Roller Coaster\'','2025-11-26 01:31:44'),('96bfd6046ba337139e5b8391b37e9b92','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Three Balls\'','2025-11-26 01:36:29'),('97c0e3c25032d50ec9a856acfeff9f3d','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Bingo\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:35:11'),('97d76cde6f217e47e4fae782fe68d6be','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_APP','Created application #2025-11-007 for permit type: Special Mayor\'s Permit','2025-11-26 06:05:37'),('986df0c94e6f94257242f86295fae7fa','user-1a2b3c4d5e6f7g8h9i0j',NULL,'DELETE_APPLICATION','Deleted application #2025-11-005 (Status: Pending)','2025-11-26 02:33:22'),('9980e8e48fe442dd0e080b4536d5310a','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Viking\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:17:03'),('9b1b4dc5fa7607806d6139e36b197f02','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Target Shooting\" with amount ₱500.00 to application #2025-11-005','2025-11-26 02:11:10'),('9cb5f612aa57fe95f504778217a772c6','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Frisbee\'','2025-11-26 01:32:27'),('9f4ed471478087c8a2af353126b277d3','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Itsa-Itsa (Ring/Coins)\" with amount ₱600.00 to application #2025-11-009','2025-11-27 01:36:00'),('a03119d3f75bf3ec5378bdac5c7586fa','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Octopus\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:07:14'),('a1107d4c892e38c92471b2e482718fcc','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Itsa-Itsa (Ring/Coins)\" with amount ₱600.00 to application #2025-11-006','2025-11-26 03:16:16'),('a1cf074ab6bc8924b682095eaddc9a31','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Bingo\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:15:11'),('a37c553e336ae2ed0fee06293565be7f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Mr. Rabbit\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:09'),('a41572be450bc0f70f35aee172eddc04','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Horror Train\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:16:02'),('a49daaf7bb9e0bb8ae2dc9c6bff97683','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Frisbee\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('a56f289ffa5c3ffb9ead16f7c74b4f4b','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Target Shooting\" with amount ₱1,500.00 to application #2025-11-007','2025-11-26 06:07:30'),('a57d35c66d29c056af3c0d94ee7cf163','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_APP','Created application #2025-11-005 for permit type: Special Mayor\'s Permit','2025-11-26 02:11:03'),('a784eac969bb29952f05940c70034a3a','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Bingo\'','2025-11-26 01:33:06'),('a7fdde1eb0c9f5205441558267bb93a0','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Trampoline\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:16:59'),('aa60a8ca0d37e1bfab2c391f19c24b6e','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Dart Balloon\" with amount ₱600.00 to application #2025-11-009','2025-11-27 01:35:19'),('aab84b23dd81ae221d155d6044d36780','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Drop Ball\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:15:38'),('aad7c14641533320bffd467b7ee8acd2','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','APPROVE_APP','Approved application #2025-11-010','2025-11-27 02:01:28'),('ac25039e7fc7423200d83e33dab6c087','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ISSUE_PERMIT','Issued permit for application 2025-11-007','2025-11-26 06:08:47'),('acdcdf62839fb9320d55fc7d7ef79350','user-1a2b3c4d5e6f7g8h9i0j','84752e77c079a97a2e7429c0af8d3705','ISSUE_PERMIT','Issued permit for application 2025-11-010','2025-11-27 02:02:27'),('ad58d295150d468fee16c3b601c4eb40','user-1a2b3c4d5e6f7g8h9i0j',NULL,'UPDATE_PERMIT_TYPE','Updated permit type ID 30190a0da91bc5d2dc4be18b5f9c5d81','2025-11-26 03:50:34'),('ae50f3f3acbcfdcfb9ef92972848d5e9','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Flying Elephant\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:15:53'),('aedd66d441f41a78b669b5add989d9eb','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Basketball Ring Shooting\'','2025-11-26 01:35:23'),('af4c1dfb4c4182915702953ce95b6a33','user-1a2b3c4d5e6f7g8h9i0j',NULL,'UPDATE_ASSESSMENT_RULE','Updated assessment rule ID 909803f4c7bd176cce8266b24de18216','2025-11-26 02:31:29'),('b087625d3f0567032d5fbd57fb0376ce','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_APP','Created application 2025-11-003 (ID: 0ab6b0173c87d92bd73483ca78c3b562) for permit type: Mayor\'s Permit','2025-11-25 07:40:05'),('b220a0d323b54010fd487ae2be51886f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Tangga\" with amount ₱1,200.00 to application #2025-11-006','2025-11-26 03:16:33'),('b328e6f2ceb1e34c1d5abcd554613e88','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Three Balls\" with amount ₱4,200.00 to application #2025-11-007','2025-11-26 06:07:38'),('b37482bd7eaf14bb310764f7d89f1a8e','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_APP','Created application #2025-11-006 for permit type: Special Mayor\'s Permit','2025-11-26 02:35:30'),('b3cfa65e5eebbd0ebad0c6a30e92dea6','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Itsa-Itsa (Ring/Coins)\" with amount ₱600.00 to application #2025-11-005','2025-11-26 02:11:10'),('b4cfc121831e920543c3fe1e38305e95','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Mr. Rabbit\" with amount ₱1,000.00 to application #2025-11-006','2025-11-26 03:16:22'),('b7756f69fc73ecf320d7eee03e6e2346','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','RECORD_PAYMENT','Recorded payment for application #1fc48aefe4672b6fa2d0b653f8fde9d1: Receipt #1233232, Amount: ₱18700.00','2025-11-27 01:45:11'),('be82ff4eb6002df10c1be89756340ebf','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Ferries Wheel\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('c5c59bcb2b297eda1af43dc8da2c8a7b','user-1a2b3c4d5e6f7g8h9i0j',NULL,'RECORD_PAYMENT','Recorded payment for application #0ab6b0173c87d92bd73483ca78c3b562: Receipt #123123, Amount: ₱50200.00','2025-11-25 08:00:33'),('c63d4a61cddc317ec640170a2ff28dcd','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Drop Ball\" with amount ₱500.00 to application #2025-11-006','2025-11-26 03:15:26'),('c907bb587d6bd2b0af3b6a759b763856','user-1a2b3c4d5e6f7g8h9i0j',NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #2025-11-004','2025-11-26 01:56:38'),('ca6ddc05e8803b44601a56cc2e358001','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ISSUE_PERMIT','Issued permit for application 2025-11-006','2025-11-26 03:42:36'),('cab1a11f2649cbabbf019d441f1c8bda','user-1a2b3c4d5e6f7g8h9i0j',NULL,'RECORD_PAYMENT','Recorded payment for application #eca6a9a6597df6423afda41b221dcca0: Receipt #123123, Amount: ₱6700.00','2025-11-26 06:32:54'),('cb753866f639ac3ab7ad5d66ed266105','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Flying Elephant\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:35:42'),('cd1ae2b2d3b775b48b38be70b2c6976f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Basketball Ring Shooting\" with amount ₱600.00 to application #2025-11-007','2025-11-26 06:06:03'),('d0037cd97fdf9b8a20ec9e37293e67eb','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Trampoline\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:10'),('d00fe59f9c791141bc410a8f8d35ae8f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Horror Train\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:09'),('d16779b83a11925381fd1b3d112bc3a9','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Viking\'','2025-11-26 01:32:56'),('d1d9b09766916234c70cadfa7997d1fc','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Flying Elephant\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:06:41'),('d2069caa431427122eb73d4731fc8862','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','SUBMIT_ASSESSMENT','Submitted assessment for application #2025-11-009','2025-11-27 01:37:54'),('d2ce381755149681628989635df32de1','user-1a2b3c4d5e6f7g8h9i0j',NULL,'LOGIN','User \'admin\' logged in','2025-11-26 02:39:43'),('d3b8e49cf5b3fcc00658f437be013e13','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Basketball Ring Shooting\" with amount ₱600.00 to application #2025-11-009','2025-11-27 01:35:07'),('d5c300feacb7bc9b9ef931ebe732a9e6','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Roleta\'','2025-11-26 01:34:42'),('d7794782a787c17958eeca6722e4479c','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Frisbee\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:06:48'),('d7c5ee05e266842662f53fa6558e5445','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Target Shooting\'','2025-11-26 01:34:31'),('d96e502d06ebcd3eaad3064cbb62cc0a','user-1a2b3c4d5e6f7g8h9i0j',NULL,'SUBMIT_ASSESSMENT','Submitted assessment for application #2025-11-007','2025-11-26 06:07:53'),('d9e5a88c08ebf201b56c7fa1150ce622','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Ferries Wheel\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:06:35'),('de4df3a9df89705378d5a29f3b8c05df','user-1a2b3c4d5e6f7g8h9i0j',NULL,'DELETE_APPLICATION','Deleted application #2025-11-006 (Status: Released) and all related records','2025-11-26 06:30:56'),('df85dec865f0ff3c211f617ba708566c','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Trampoline\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:07:42'),('e37706dc2f4bd18b596bb5c561284fb8','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Octopus\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('e39a58e7933669bb7d1a54371ab508cf','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Bingo\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:45'),('e502cd92f3a60c03845f87433d695897','user-1a2b3c4d5e6f7g8h9i0j',NULL,'REMOVE_FEE','Removed fee \"Unknown Fee\" from application #2025-11-006','2025-11-26 03:15:31'),('e5e939225b0f2d20f54a5df20cb85172','user-1a2b3c4d5e6f7g8h9i0j',NULL,'RELEASE_PERMIT','Released permit for application 2025-11-006. Released by: Rheymar Bayeta, Received by: Nelson Mandela','2025-11-26 03:49:44'),('e9e61a9c25e9c3aa63d4d59a21c2e36f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_FEE','Created fee \'Horror Train\'','2025-11-26 01:32:13'),('ebc0320d8abc24a9e12668e3e6b91d15','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Horror Train\" with amount ₱1,000.00 to application #2025-11-007','2025-11-26 06:06:55'),('ec7a7342c3c7d67acec0bfb79ebbfa48','user-1a2b3c4d5e6f7g8h9i0j','1fc48aefe4672b6fa2d0b653f8fde9d1','ADD_FEE','Added fee \"Octopus\" with amount ₱1,000.00 to application #2025-11-009','2025-11-27 01:36:10'),('f1b98694f9263149a6cc4ff65fbc27c9','user-1a2b3c4d5e6f7g8h9i0j',NULL,'CREATE_ASSESSMENT_RULE','Created assessment rule \'Special Mayor\'s Permit - PERYA\'','2025-11-26 01:54:25'),('f4b3b8a973f4966e1064102122af363f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Ferries Wheel\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:10'),('fa22dd0e1b55d78e03f40f4508b2f2ea','user-1a2b3c4d5e6f7g8h9i0j',NULL,'RECORD_PAYMENT','Recorded payment for application #924d93c41b15db09625d1e73adc76459: Receipt #1238282, Amount: ₱18700.00','2025-11-26 06:08:41'),('fbdd803889b9ab18ab2a20ebf61caf3f','user-1a2b3c4d5e6f7g8h9i0j',NULL,'REJECT_APP','Rejected application #2025-11-004: Re-apply.','2025-11-26 02:09:40'),('fd43561006bf6e6b8e12c68e93c26b2c','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Trampoline\" with amount ₱1,000.00 to application #2025-11-004','2025-11-26 01:55:44'),('fd49dc7639875f1a25e83c113ec283f4','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Viking\" with amount ₱1,000.00 to application #2025-11-005','2025-11-26 02:11:09'),('fd76692cb63cfb9f139fb2fbf1953db8','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Target Shooting\" with amount ₱1,500.00 to application #2025-11-006','2025-11-26 03:16:43'),('fded6c45070b6ac6ff92528a3bc2bae4','user-1a2b3c4d5e6f7g8h9i0j',NULL,'ADD_FEE','Added fee \"Three Balls\" with amount ₱600.00 to application #2025-11-005','2025-11-26 02:11:10');
/*!40000 ALTER TABLE `audit_trail` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `entities`
--

DROP TABLE IF EXISTS `entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `entities`
--

LOCK TABLES `entities` WRITE;
/*!40000 ALTER TABLE `entities` DISABLE KEYS */;
INSERT INTO `entities` VALUES ('cab877a6d1dae46cfa2ec26ec9467d5f','GLOBE TELECOM, INC.','GLOBE TELECOM, INC.',NULL,NULL,'CEBU CITY','2025-11-25 06:13:29','2025-11-25 06:13:29'),('f3abddedbfc9e623d37ca770a77cbcdd','THREE ROSES CARNIVAL','THREE ROSES CARNIVAL',NULL,NULL,'Borongan City, Samar','2025-11-26 01:55:17','2025-11-26 01:55:17');
/*!40000 ALTER TABLE `entities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fees_categories`
--

DROP TABLE IF EXISTS `fees_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fees_categories` (
  `category_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fees_categories`
--

LOCK TABLES `fees_categories` WRITE;
/*!40000 ALTER TABLE `fees_categories` DISABLE KEYS */;
INSERT INTO `fees_categories` VALUES ('4aff38db081a96476652db388f7b0832','Other Charge','2025-11-25 05:17:34','2025-11-25 05:17:34'),('8eb45c7ca87f1b560bf81afe6f60dcd9','Regulatory Fee','2025-11-25 05:17:19','2025-11-25 05:17:19');
/*!40000 ALTER TABLE `fees_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fees_charges`
--

DROP TABLE IF EXISTS `fees_charges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fees_charges`
--

LOCK TABLES `fees_charges` WRITE;
/*!40000 ALTER TABLE `fees_charges` DISABLE KEYS */;
INSERT INTO `fees_charges` VALUES ('0125d1cb81a1f1dae1fc03afa0052e2f','8eb45c7ca87f1b560bf81afe6f60dcd9','Frisbee',1000.00,'2025-11-26 01:32:27','2025-11-26 01:32:27'),('0b5a93f4414de15e629f84c5a83ded03','8eb45c7ca87f1b560bf81afe6f60dcd9','Horror Train',1000.00,'2025-11-26 01:32:13','2025-11-26 01:32:13'),('10f7694c4a3ed1b2841bdf5135a21a53','8eb45c7ca87f1b560bf81afe6f60dcd9','Mr. Rabbit',1000.00,'2025-11-26 01:36:10','2025-11-26 01:36:10'),('1beaa88a4583950db82e624652a2a444','8eb45c7ca87f1b560bf81afe6f60dcd9','Trampoline',1000.00,'2025-11-26 01:35:35','2025-11-26 01:35:35'),('20ac062d7fc295f9abb3935feec7622c','8eb45c7ca87f1b560bf81afe6f60dcd9','Roller Coaster',1000.00,'2025-11-26 01:31:44','2025-11-26 01:31:44'),('46d3a77c791a247e35d928466fef2b3c','8eb45c7ca87f1b560bf81afe6f60dcd9','Three Balls',600.00,'2025-11-26 01:36:29','2025-11-26 01:36:29'),('483599b44707b19dbb44da1299f7c8ef','8eb45c7ca87f1b560bf81afe6f60dcd9','Flying Elephant',1000.00,'2025-11-26 01:32:41','2025-11-26 01:32:41'),('4906628320e07b18e8a266fac716adca','8eb45c7ca87f1b560bf81afe6f60dcd9','Pinball',600.00,'2025-11-26 01:34:02','2025-11-26 01:34:02'),('5656aced0541505737351eca2046ecb4','8eb45c7ca87f1b560bf81afe6f60dcd9','Itsa-Itsa (Ring/Coins)',600.00,'2025-11-26 01:35:04','2025-11-26 01:35:04'),('5a3b497a2e3b50fe1ac015cbb18c8497','8eb45c7ca87f1b560bf81afe6f60dcd9','Permit Fee',1000.00,'2025-11-25 05:17:46','2025-11-25 06:43:51'),('5f73f1ac2314ddbfeb12b6f1b44b1d53','8eb45c7ca87f1b560bf81afe6f60dcd9','Pula-Puti',600.00,'2025-11-26 01:33:52','2025-11-26 01:33:52'),('6bfb5988ffe9321b7a0158477a916bd7','8eb45c7ca87f1b560bf81afe6f60dcd9','Dart Balloon',600.00,'2025-11-26 01:35:48','2025-11-26 01:35:48'),('81cccc988e746282b2aeb08a81b50346','8eb45c7ca87f1b560bf81afe6f60dcd9','Drop Ball',500.00,'2025-11-26 01:33:18','2025-11-26 01:33:18'),('866a4f9cebf09fd85213afdad0fb6768','8eb45c7ca87f1b560bf81afe6f60dcd9','Octopus',1000.00,'2025-11-26 01:31:07','2025-11-26 01:31:07'),('8c3e34206f1ddc23ab91e4b62b9d4da2','8eb45c7ca87f1b560bf81afe6f60dcd9','Roleta',500.00,'2025-11-26 01:34:42','2025-11-26 01:34:42'),('93dc99e658b846967847189e2b5b8513','8eb45c7ca87f1b560bf81afe6f60dcd9','Merry Go Round',1000.00,'2025-11-26 01:31:29','2025-11-26 01:31:29'),('93e8b9d8de6f6628454dbea4bf3deb98','8eb45c7ca87f1b560bf81afe6f60dcd9','Tangga',600.00,'2025-11-26 01:35:59','2025-11-26 01:35:59'),('9d1dfef7b3301b02f6e3836af5b1a186','8eb45c7ca87f1b560bf81afe6f60dcd9','Target Shooting',500.00,'2025-11-26 01:34:31','2025-11-26 01:34:31'),('a4e615c09226f598ce7873434c6fb9d9','4aff38db081a96476652db388f7b0832','Computer Fee',200.00,'2025-11-25 05:18:03','2025-11-25 05:18:03'),('acf128d22690f5ff696f851c6a012ba9','8eb45c7ca87f1b560bf81afe6f60dcd9','Hordam',600.00,'2025-11-26 01:34:15','2025-11-26 01:34:15'),('ad6d47427a39b795e76b42a206c7e9c4','8eb45c7ca87f1b560bf81afe6f60dcd9','Bingo',1000.00,'2025-11-26 01:33:06','2025-11-26 01:33:06'),('d90ebf10d49e0fd5e2964544b9e1f7bf','8eb45c7ca87f1b560bf81afe6f60dcd9','Viking',1000.00,'2025-11-26 01:32:56','2025-11-26 01:32:56'),('f9893491c2a08cda7b836b116cde3a62','8eb45c7ca87f1b560bf81afe6f60dcd9','Ferries Wheel',1000.00,'2025-11-26 01:32:00','2025-11-26 01:32:00'),('fc3e607aa110bc827306260341969fc7','8eb45c7ca87f1b560bf81afe6f60dcd9','Basketball Ring Shooting',600.00,'2025-11-26 01:35:23','2025-11-26 01:35:23');
/*!40000 ALTER TABLE `fees_charges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES ('03e4119d5e0c8c941f0ebaac0c022488','user-5e6f7g8h9i0j1k2l3m4n','Application #84752e77c079a97a2e7429c0af8d3705 is pending approval','/applications/84752e77c079a97a2e7429c0af8d3705',0,'2025-11-27 02:01:14'),('236308be4286e81a7dc6b10687658213','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-004 requires assessment','/applications/b357a9740a128a181cf14f95b8a98733',0,'2025-11-26 01:55:37'),('241af4a60f457eb4c98693ab28872447','user-3c4d5e6f7g8h9i0j1k2l','New application #adf9d15837ca54d9a0ac507e552b4e5a requires assessment (renewal)','/applications/adf9d15837ca54d9a0ac507e552b4e5a',0,'2025-11-27 02:03:34'),('245962f07bbcd88713482e1b9177b157','user-5e6f7g8h9i0j1k2l3m4n','Application #0e2252aa2f57386cfb2c2445240226fd is pending approval','/applications/0e2252aa2f57386cfb2c2445240226fd',0,'2025-11-25 06:44:12'),('26d5ead15912259232b8f6770f662023','user-1a2b3c4d5e6f7g8h9i0j','Application #1fc48aefe4672b6fa2d0b653f8fde9d1 has been approved','/applications/1fc48aefe4672b6fa2d0b653f8fde9d1',1,'2025-11-27 01:44:32'),('291bdd968b557844bc093d42671a070f','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-003 requires assessment','/applications/0ab6b0173c87d92bd73483ca78c3b562',0,'2025-11-25 07:40:05'),('2a116f891536a90e60bea77604dbaa27','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-001 requires assessment','/applications/0e2252aa2f57386cfb2c2445240226fd',0,'2025-11-25 06:32:34'),('36abc76cfc4d523edb04e6106d016f8b','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-007 requires assessment','/applications/924d93c41b15db09625d1e73adc76459',0,'2025-11-26 06:05:37'),('376bc7428cdaebb959740d6be604fd97','user-5e6f7g8h9i0j1k2l3m4n','Application #79e6b3a6c5a19cb2c6db0344635bb33c is pending approval','/applications/79e6b3a6c5a19cb2c6db0344635bb33c',0,'2025-11-25 07:23:53'),('50463d1d9d629446a385a06ebb67ae77','user-5e6f7g8h9i0j1k2l3m4n','Application #924d93c41b15db09625d1e73adc76459 is pending approval','/applications/924d93c41b15db09625d1e73adc76459',0,'2025-11-26 06:07:53'),('67a6db47cd3f947b6582d6a902c485e6','user-1a2b3c4d5e6f7g8h9i0j','Application #eca6a9a6597df6423afda41b221dcca0 has been approved','/applications/eca6a9a6597df6423afda41b221dcca0',1,'2025-11-26 06:32:42'),('72380c57b42eaff9ca7824949828ee91','user-5e6f7g8h9i0j1k2l3m4n','Application #6c83d39a29f1bbef21e53e408e7238f4 is pending approval','/applications/6c83d39a29f1bbef21e53e408e7238f4',0,'2025-11-26 03:17:07'),('744ffccbb98239ec4e80e31385554347','user-5e6f7g8h9i0j1k2l3m4n','Application #1fc48aefe4672b6fa2d0b653f8fde9d1 is pending approval','/applications/1fc48aefe4672b6fa2d0b653f8fde9d1',0,'2025-11-27 01:37:54'),('7cc1972008e454e4b43559a55e0716f0','user-1a2b3c4d5e6f7g8h9i0j','Application #b357a9740a128a181cf14f95b8a98733 has been rejected: Re-apply.','/applications/b357a9740a128a181cf14f95b8a98733',1,'2025-11-26 02:09:40'),('83661551ce61270a25cebdae65fc0c3c','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-005 requires assessment','/applications/950bd63315ce38f08178cd6f88678851',0,'2025-11-26 02:11:03'),('946fdf83d491e3c05c23efaa78169682','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-008 requires assessment','/applications/eca6a9a6597df6423afda41b221dcca0',0,'2025-11-26 06:31:45'),('9972bd7178d97ed4efae1b9dd28a7372','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-006 requires assessment','/applications/6c83d39a29f1bbef21e53e408e7238f4',0,'2025-11-26 02:35:30'),('9f77db2563cf5bfe15d1116f60aba0e5','user-1a2b3c4d5e6f7g8h9i0j','Application #6c83d39a29f1bbef21e53e408e7238f4 has been approved','/applications/6c83d39a29f1bbef21e53e408e7238f4',1,'2025-11-26 03:24:26'),('b114ac7efaa0a71326809f5f360c8dea','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-002 requires assessment','/applications/79e6b3a6c5a19cb2c6db0344635bb33c',0,'2025-11-25 07:23:32'),('bb960d1728eddfd195c1fa67c05aab48','user-1a2b3c4d5e6f7g8h9i0j','Application #924d93c41b15db09625d1e73adc76459 has been approved','/applications/924d93c41b15db09625d1e73adc76459',1,'2025-11-26 06:08:12'),('c8d129e444426a78d843f82ddf9f122e','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-010 requires assessment','/applications/84752e77c079a97a2e7429c0af8d3705',0,'2025-11-27 02:01:03'),('ce829ef9c9118a91d574d617574d96bc','user-3c4d5e6f7g8h9i0j1k2l','New application 2025-11-009 requires assessment','/applications/1fc48aefe4672b6fa2d0b653f8fde9d1',0,'2025-11-27 01:34:55'),('e53f2d3fa9245d860ebbc2162fd3bcbd','user-5e6f7g8h9i0j1k2l3m4n','Application #eca6a9a6597df6423afda41b221dcca0 is pending approval','/applications/eca6a9a6597df6423afda41b221dcca0',0,'2025-11-26 06:32:16'),('e696e8329cafd56253775bc8480e9f49','user-1a2b3c4d5e6f7g8h9i0j','Application #84752e77c079a97a2e7429c0af8d3705 has been approved','/applications/84752e77c079a97a2e7429c0af8d3705',1,'2025-11-27 02:01:28'),('e70acd5ed58af447b0bb378ad660663c','user-1a2b3c4d5e6f7g8h9i0j','Application #0ab6b0173c87d92bd73483ca78c3b562 has been approved','/applications/0ab6b0173c87d92bd73483ca78c3b562',1,'2025-11-25 08:00:08'),('f471de9ee1fb279f207b70927e5f6b6e','user-5e6f7g8h9i0j1k2l3m4n','Application #0ab6b0173c87d92bd73483ca78c3b562 is pending approval','/applications/0ab6b0173c87d92bd73483ca78c3b562',0,'2025-11-25 07:40:19'),('f61d6796da433cabcda1f9ed7e6466be','user-1a2b3c4d5e6f7g8h9i0j','Application #0e2252aa2f57386cfb2c2445240226fd has been approved','/applications/0e2252aa2f57386cfb2c2445240226fd',1,'2025-11-25 06:44:50'),('ffa483ed7654e35f05534910fe68ee7c','user-5e6f7g8h9i0j1k2l3m4n','Application #b357a9740a128a181cf14f95b8a98733 is pending approval','/applications/b357a9740a128a181cf14f95b8a98733',0,'2025-11-26 01:56:38');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES ('02aab65215eba2f8c8b684208816d6e9','84752e77c079a97a2e7429c0af8d3705','2313212','2025-11-27','Poblacion, Dalaguete, Cebu',50200.00,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 02:01:43','2025-11-27 02:01:43'),('0d404811b3306972a501eea64fb677d3','1fc48aefe4672b6fa2d0b653f8fde9d1','1233232','2025-11-27','Poblacion, Dalaguete, Cebu',18700.00,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-27 01:45:11','2025-11-27 01:45:11');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permit_type_fees`
--

DROP TABLE IF EXISTS `permit_type_fees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  `permit_type_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permit_type_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attribute_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attribute` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`permit_type_id`),
  UNIQUE KEY `permit_type_name` (`permit_type_name`),
  KEY `idx_permit_type_name` (`permit_type_name`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_attribute_id` (`attribute_id`),
  CONSTRAINT `permit_types_ibfk_1` FOREIGN KEY (`attribute_id`) REFERENCES `attributes` (`attribute_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permit_types`
--

LOCK TABLES `permit_types` WRITE;
/*!40000 ALTER TABLE `permit_types` DISABLE KEYS */;
INSERT INTO `permit_types` VALUES ('2a26825567df00e0bac462f17b961a0a','Mayor\'s Permit','4e6cae0f7bcd841b7cd816d637842833',NULL,'Cell Site',1,'2025-11-25 05:58:14','2025-11-25 08:21:30'),('30190a0da91bc5d2dc4be18b5f9c5d81','Special Mayor\'s Permit','be910c509e923badd760bbb5a8459b15',NULL,'PERYA',1,'2025-11-26 01:37:17','2025-11-26 03:50:34');
/*!40000 ALTER TABLE `permit_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `report_templates`
--

DROP TABLE IF EXISTS `report_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `report_templates`
--

LOCK TABLES `report_templates` WRITE;
/*!40000 ALTER TABLE `report_templates` DISABLE KEYS */;
INSERT INTO `report_templates` VALUES ('7f01a796c4b1117592743813276587ef','[TEMPLATE] MAYOR\'S PERMIT','[TEMPLATE] MAYOR\'S PERMIT.docx','C:\\PAMS\\backend\\uploads\\templates\\template_306310589bc52d9cabdee2d945446763_1764142665010.docx',541150,NULL,NULL,0,1,'user-1a2b3c4d5e6f7g8h9i0j','2025-11-26 07:37:45','2025-11-26 07:37:45');
/*!40000 ALTER TABLE `report_templates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `role_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_name` (`role_name`),
  KEY `idx_role_name` (`role_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('role-1ad9ffd5b1a1c9b2a45a','Assessor','2025-11-20 01:47:25','2025-11-20 01:47:25'),('role-26ac25f8935af17f0ef9','SuperAdmin','2025-11-20 01:47:25','2025-11-20 01:47:25'),('role-42c8c4c8a8dc0000000f','Approver','2025-11-20 01:47:25','2025-11-20 01:47:25'),('role-5e9fcf77ad79f5c64a9a','Admin','2025-11-20 01:47:25','2025-11-20 01:47:25'),('role-7dc1ec6d8d4b8c5e4f9c','Application Creator','2025-11-20 01:47:25','2025-11-20 01:47:25'),('role-8f9d1a2b3c4e5f6g7h8i','Viewer','2025-11-20 01:47:25','2025-11-20 01:47:25');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES ('0e956cdd56173ca8a4edbd64ddf08595','municipal_treasurer_position','ACTING MUNICIPAL TREASURER',NULL,NULL,NULL,NULL,NULL,'2025-11-25 06:12:47','2025-11-26 02:05:43'),('17ec19d774210eaa744cda96e8b1255b','permit_signatory_position','MUNICIPAL MAYOR',NULL,NULL,NULL,NULL,NULL,'2025-11-25 06:12:47','2025-11-26 02:05:43'),('1a1b09200f96859e4a43a237ce9a2e2b','permit_tabular_display_conditions','[{\"display_mode\":\"table_with_quantity\",\"attribute_id\":\"be910c509e923badd760bbb5a8459b15\"}]','Conditions for displaying permit activities in tabular format',NULL,NULL,NULL,NULL,'2025-11-26 05:45:04','2025-11-27 02:00:29'),('26a99987eb74849c807f333f550329ad','default_country','Philippines',NULL,NULL,NULL,NULL,NULL,'2025-11-25 06:12:47','2025-11-26 02:05:43'),('3172af87f530ce05ff1d5e8dad8f82be','permit_signatory_name','NELIN B. TAMBIS, CPA, MPA',NULL,NULL,NULL,NULL,NULL,'2025-11-25 06:12:47','2025-11-26 02:05:43'),('aca691ca82e5a72dd00cb7e762e408ab','default_province','Cebu',NULL,NULL,NULL,NULL,NULL,'2025-11-25 06:12:47','2025-11-26 02:05:43'),('b055c92efd1166c33c1541bdc9d583e8','default_municipality','Dalaguete',NULL,NULL,NULL,NULL,NULL,'2025-11-25 06:12:47','2025-11-26 02:05:43'),('d83d879a9ace497cb3083082d5bd3e57','municipal_treasurer_name','HAIDEE D. OGOC',NULL,NULL,NULL,NULL,NULL,'2025-11-25 06:12:47','2025-11-26 02:05:43');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('user-1a2b3c4d5e6f7g8h9i0j','admin','$2a$10$bEq4i31LLUl4mkWtfb/3Se/NMG2Kh69NI6svxEI9i79kF58luzakm','Rheymar A. Bayeta','role-26ac25f8935af17f0ef9','2025-11-20 01:47:25','2025-11-20 01:47:25'),('user-3c4d5e6f7g8h9i0j1k2l','lord','$2a$10$7WZtSj3qrXXLoVcoxY8gSOOewssHIekHglQ96i1vyt/F4SrlIe.rW','Lourd William','role-1ad9ffd5b1a1c9b2a45a','2025-11-20 08:32:57','2025-11-20 08:32:57'),('user-4d5e6f7g8h9i0j1k2l3m','fritz','$2a$10$w/5CALsnFE6aF5j758lEkO2PZLqBtqIdEryIAJQ8xgi63IQw3wAR.','Fritz','role-7dc1ec6d8d4b8c5e4f9c','2025-11-20 08:33:21','2025-11-20 08:33:21'),('user-5e6f7g8h9i0j1k2l3m4n','chyrramae','$2a$10$c4xJiXCHJHZ/bITJ56qmJeVvMg2kJ8PPFSETS2RY51H5v9ErvzfJ6','Chyrramae','role-42c8c4c8a8dc0000000f','2025-11-20 08:35:32','2025-11-20 08:35:32'),('user-6f7g8h9i0j1k2l3m4n5o','superadmin','$2a$10$hE9f8H9mK8I7mL6nO5pQ.SEu3T2sR1qU0vW9xY8zB7cA6dE5fG4','Super Administrator','role-26ac25f8935af17f0ef9','2025-11-25 11:40:00','2025-11-25 11:40:00');
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

-- Dump completed on 2025-11-27 10:12:13
