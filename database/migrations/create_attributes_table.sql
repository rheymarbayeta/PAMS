-- Create Attributes table
USE pams_db;

-- Create Attributes table
CREATE TABLE IF NOT EXISTS Attributes (
    attribute_id VARCHAR(64) PRIMARY KEY,
    attribute_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_attribute_name (attribute_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update Permit_Types to use attribute_id
-- Add foreign key
ALTER TABLE Permit_Types
ADD FOREIGN KEY (attribute_id) REFERENCES Attributes(attribute_id) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_attribute_id ON Permit_Types(attribute_id);

