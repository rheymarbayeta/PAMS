-- PAMS Database Schema
-- MySQL 8.0+
-- All IDs use VARCHAR(64) hash-based format (MD5/UUID) instead of INT AUTO_INCREMENT

CREATE DATABASE IF NOT EXISTS pams_db;
USE pams_db;

-- Roles Table
CREATE TABLE IF NOT EXISTS Roles (
    role_id VARCHAR(64) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES Roles(role_id) ON DELETE RESTRICT,
    INDEX idx_username (username),
    INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Entities Table (Permit Applicants)
CREATE TABLE IF NOT EXISTS Entities (
    entity_id VARCHAR(64) PRIMARY KEY,
    entity_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_entity_name (entity_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Applications Table
CREATE TABLE IF NOT EXISTS Applications (
    application_id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) NOT NULL,
    creator_id VARCHAR(64) NOT NULL,
    assessor_id VARCHAR(64),
    approver_id VARCHAR(64),
    permit_type_id VARCHAR(64),
    permit_type VARCHAR(100) NOT NULL,
    status ENUM('Pending', 'Assessed', 'Pending Approval', 'Approved', 'Rejected', 'Paid', 'Issued', 'Released') DEFAULT 'Pending',
    application_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES Entities(entity_id) ON DELETE RESTRICT,
    FOREIGN KEY (creator_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (assessor_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approver_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_entity_id (entity_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_assessor_id (assessor_id),
    INDEX idx_approver_id (approver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Application_Parameters Table (Dynamic fields)
CREATE TABLE IF NOT EXISTS Application_Parameters (
    parameter_id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL,
    param_name VARCHAR(100) NOT NULL,
    param_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
    INDEX idx_application_id (application_id),
    INDEX idx_param_name (param_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fees_Categories Table
CREATE TABLE IF NOT EXISTS Fees_Categories (
    category_id VARCHAR(64) PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fees_Charges Table (Master list of all possible fees)
CREATE TABLE IF NOT EXISTS Fees_Charges (
    fee_id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL,
    fee_name VARCHAR(255) NOT NULL,
    default_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES Fees_Categories(category_id) ON DELETE RESTRICT,
    INDEX idx_category_id (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assessed_Fees Table (Links fees to applications)
CREATE TABLE IF NOT EXISTS Assessed_Fees (
    assessed_fee_id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL,
    fee_id VARCHAR(64) NOT NULL,
    assessed_amount DECIMAL(10, 2) NOT NULL,
    assessed_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE RESTRICT,
    FOREIGN KEY (assessed_by_user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    INDEX idx_application_id (application_id),
    INDEX idx_fee_id (fee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit_Trail Table
CREATE TABLE IF NOT EXISTS Audit_Trail (
    log_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    application_id VARCHAR(64),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_application_id (application_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
    notification_id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages Table (Internal chat)
CREATE TABLE IF NOT EXISTS Messages (
    message_id VARCHAR(64) PRIMARY KEY,
    sender_id VARCHAR(64) NOT NULL,
    recipient_id VARCHAR(64) NOT NULL,
    application_context_id VARCHAR(64),
    content TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (recipient_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (application_context_id) REFERENCES Applications(application_id) ON DELETE SET NULL,
    INDEX idx_sender_id (sender_id),
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_application_context_id (application_context_id),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payments Table (Payment receipts)
CREATE TABLE IF NOT EXISTS Payments (
    payment_id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL,
    official_receipt_no VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    address VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    recorded_by_user_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    INDEX idx_application_id (application_id),
    INDEX idx_official_receipt_no (official_receipt_no),
    UNIQUE KEY unique_receipt (application_id, official_receipt_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
