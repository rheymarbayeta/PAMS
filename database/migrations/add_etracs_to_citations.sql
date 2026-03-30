-- Migration: Add eTracs Integration to Citations Table
-- Description: Adds column to link citations to eTracs entities
-- Date: 2026-03-30

ALTER TABLE `citations` ADD COLUMN `etracs_objid` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'eTracs entity object ID';
ALTER TABLE `citations` ADD KEY `idx_etracs_objid` (`etracs_objid`);
