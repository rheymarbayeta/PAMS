-- Migration: Add eTracs Integration Columns to Entities Table
-- Description: Adds columns to track eTracs entity IDs and sync status
-- Date: 2026-03-30

ALTER TABLE `entities` ADD COLUMN `etracs_objid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'eTracs entity object ID';
ALTER TABLE `entities` ADD COLUMN `etracs_entityno` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'eTracs entity number';
ALTER TABLE `entities` ADD COLUMN `synced_at` timestamp NULL DEFAULT NULL COMMENT 'When entity was synced from eTracs';
ALTER TABLE `entities` ADD UNIQUE KEY `idx_etracs_objid` (`etracs_objid`);
