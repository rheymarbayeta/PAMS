-- Migration: Add assessment records table for storing assessment reports
-- This table stores assessment records that can be used to generate PDF reports

USE pams_db;

-- Create Assessment_Records table
CREATE TABLE IF NOT EXISTS Assessment_Records (
    assessment_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    address TEXT,
    app_number VARCHAR(50),
    app_type VARCHAR(20) DEFAULT 'NEW',
    app_date DATE NOT NULL,
    validity_date DATE,
    total_balance_due DECIMAL(12, 2) DEFAULT 0.00,
    total_surcharge DECIMAL(12, 2) DEFAULT 0.00,
    total_interest DECIMAL(12, 2) DEFAULT 0.00,
    total_amount_due DECIMAL(12, 2) DEFAULT 0.00,
    q1_amount DECIMAL(12, 2) DEFAULT 0.00,
    q2_amount DECIMAL(12, 2) DEFAULT 0.00,
    q3_amount DECIMAL(12, 2) DEFAULT 0.00,
    q4_amount DECIMAL(12, 2) DEFAULT 0.00,
    prepared_by_user_id INT,
    approved_by_user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (prepared_by_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    INDEX idx_application_id (application_id),
    INDEX idx_app_date (app_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Assessment_Record_Fees table for individual fees in assessment
CREATE TABLE IF NOT EXISTS Assessment_Record_Fees (
    record_fee_id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    fee_id INT NOT NULL,
    fee_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    quantity INT DEFAULT 1,
    balance_due DECIMAL(10, 2) NOT NULL,
    surcharge DECIMAL(10, 2) DEFAULT 0.00,
    interest DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES Assessment_Records(assessment_id) ON DELETE CASCADE,
    FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE RESTRICT,
    INDEX idx_assessment_id (assessment_id),
    INDEX idx_fee_id (fee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

