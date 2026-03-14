-- Cashbook table for daily cash management
CREATE TABLE cashbook_entries (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    local_id VARCHAR(50), -- For sync from local storage
    entry_date DATE NOT NULL,
    entry_type ENUM('opening_balance', 'cash_in', 'cash_out', 'closing_balance') NOT NULL,
    category VARCHAR(100), -- e.g., 'sales', 'purchase', 'expense', 'other'
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    reference_type ENUM('sale', 'purchase', 'return', 'expense', 'other'),
    reference_id VARCHAR(36), -- Reference to sale/purchase/return ID
    reference_number VARCHAR(50), -- Invoice/receipt number
    payment_method ENUM('cash', 'card', 'mobile_banking', 'bank_transfer') DEFAULT 'cash',
    created_by VARCHAR(36),
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_date (entry_date),
    INDEX idx_type (entry_type),
    INDEX idx_category (category),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_local_id (local_id),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Daily cash summary table
CREATE TABLE daily_cash_summary (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    summary_date DATE UNIQUE NOT NULL,
    opening_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_cash_in DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_cash_out DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    closing_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_sales DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_purchases DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_returns DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_expenses DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_date (summary_date),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
