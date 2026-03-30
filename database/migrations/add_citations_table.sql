-- Add Citations Table for Traffic Citation Tickets
-- This table stores traffic violation citation tickets issued by enforcement officers

CREATE TABLE IF NOT EXISTS Citations (
    citation_id VARCHAR(64) PRIMARY KEY,
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Driver Information
    driver_name VARCHAR(255) NOT NULL,
    driver_address VARCHAR(255),
    driver_contact VARCHAR(50),
    license_number VARCHAR(100),
    license_expiry DATE,
    
    -- Vehicle Information
    vehicle_type VARCHAR(100),
    vehicle_color VARCHAR(50),
    plate_number VARCHAR(50) NOT NULL,
    vehicle_registration VARCHAR(100),
    vehicle_owner VARCHAR(255),
    
    -- Registered Owner Information
    owner_name VARCHAR(255),
    owner_address VARCHAR(255),
    owner_contact VARCHAR(50),
    
    -- Violation Details
    violations JSON NOT NULL COMMENT "Array of violation types",
    other_violations TEXT COMMENT "Custom violations if Others selected",
    violation_location VARCHAR(255),
    violation_time TIME,
    violation_date DATE NOT NULL,
    remarks TEXT,
    
    -- Fine Information
    fine_amount DECIMAL(10, 2),
    payment_status ENUM('Pending', 'Paid', 'Installment', 'Disputed', 'Cancelled') DEFAULT 'Pending',
    
    -- Signatures & Authority
    enforcer_name VARCHAR(255),
    enforcer_badge VARCHAR(100),
    enforcer_signature LONGBLOB COMMENT "Base64 encoded signature",
    witness_name VARCHAR(255),
    witness_signature LONGBLOB COMMENT "Base64 encoded signature",
    supervisor_name VARCHAR(255),
    supervisor_signature LONGBLOB COMMENT "Base64 encoded signature",
    seal_stamp LONGBLOB COMMENT "Base64 encoded seal/stamp",
    
    -- Status
    is_completed BOOLEAN DEFAULT FALSE,
    issued_by_user_id VARCHAR(64),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (issued_by_user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_ticket_number (ticket_number),
    INDEX idx_plate_number (plate_number),
    INDEX idx_driver_name (driver_name),
    INDEX idx_violation_date (violation_date),
    INDEX idx_payment_status (payment_status),
    INDEX idx_is_completed (is_completed),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Create a Payments table to track citation payments (if not already exists)
CREATE TABLE IF NOT EXISTS Citation_Payments (
    payment_id VARCHAR(64) PRIMARY KEY,
    citation_id VARCHAR(64) NOT NULL,
    amount_paid DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) COMMENT 'Cash, Check, Card, Online',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (citation_id) REFERENCES Citations(citation_id) ON DELETE RESTRICT,
    
    INDEX idx_citation_id (citation_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
