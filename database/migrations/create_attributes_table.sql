-- Create Attributes table
USE pams_db;

-- Create Attributes table
CREATE TABLE IF NOT EXISTS Attributes (
    attribute_id INT AUTO_INCREMENT PRIMARY KEY,
    attribute_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_attribute_name (attribute_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update Permit_Types to use attribute_id instead of attribute text
-- First, add the new column
ALTER TABLE Permit_Types 
ADD COLUMN attribute_id INT NULL AFTER permit_type_name;

-- Add foreign key
ALTER TABLE Permit_Types
ADD FOREIGN KEY (attribute_id) REFERENCES Attributes(attribute_id) ON DELETE SET NULL;

-- Create index
CREATE INDEX idx_attribute_id ON Permit_Types(attribute_id);

-- Note: The old 'attribute' column will be dropped in a separate migration after data migration

