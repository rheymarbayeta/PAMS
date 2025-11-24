-- Create Permit_Types table
CREATE TABLE IF NOT EXISTS Permit_Types (
    permit_type_id INT AUTO_INCREMENT PRIMARY KEY,
    permit_type_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_permit_type_name (permit_type_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create Permit_Type_Fees table (Default fees for each permit type)
CREATE TABLE IF NOT EXISTS Permit_Type_Fees (
    permit_type_fee_id INT AUTO_INCREMENT PRIMARY KEY,
    permit_type_id INT NOT NULL,
    fee_id INT NOT NULL,
    default_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (permit_type_id) REFERENCES Permit_Types(permit_type_id) ON DELETE CASCADE,
    FOREIGN KEY (fee_id) REFERENCES Fees_Charges(fee_id) ON DELETE RESTRICT,
    UNIQUE KEY unique_permit_fee (permit_type_id, fee_id),
    INDEX idx_permit_type_id (permit_type_id),
    INDEX idx_fee_id (fee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

