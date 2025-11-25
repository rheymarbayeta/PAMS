-- Create Assessment_Rules table for storing computation rules
-- Rules link permit types, attributes, and fees for automatic assessment calculation

USE pams_db;

-- Create Assessment_Rules table
CREATE TABLE IF NOT EXISTS Assessment_Rules (
    rule_id VARCHAR(64) PRIMARY KEY,
    permit_type_id VARCHAR(64) NOT NULL,
    attribute_id VARCHAR(64),
    attribute VARCHAR(100) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (permit_type_id) REFERENCES Permit_Types(permit_type_id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES Attributes(attribute_id) ON DELETE SET NULL,
    INDEX idx_permit_type_id (permit_type_id),
    INDEX idx_attribute_id (attribute_id),
    INDEX idx_attribute (attribute),
    INDEX idx_is_active (is_active),
    UNIQUE KEY unique_permit_attribute (permit_type_id, attribute)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Assessment_Rule_Fees table (Fees associated with each rule)
CREATE TABLE IF NOT EXISTS Assessment_Rule_Fees (
    rule_fee_id VARCHAR(64) PRIMARY KEY,
    rule_id VARCHAR(64) NOT NULL,
    fee_id VARCHAR(64),
    fee_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    is_required BOOLEAN DEFAULT TRUE,
    fee_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rule_id) REFERENCES Assessment_Rules(rule_id) ON DELETE CASCADE,
    FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE SET NULL,
    INDEX idx_rule_id (rule_id),
    INDEX idx_fee_id (fee_id),
    INDEX idx_fee_order (fee_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

