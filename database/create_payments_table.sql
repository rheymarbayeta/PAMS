-- Create Payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS Payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    official_receipt_no VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    address VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    recorded_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Applications(application_id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_user_id) REFERENCES Users(user_id) ON DELETE RESTRICT,
    INDEX idx_application_id (application_id),
    INDEX idx_official_receipt_no (official_receipt_no),
    UNIQUE KEY unique_receipt (application_id, official_receipt_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
