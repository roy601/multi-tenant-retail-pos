-- Sync log table to track synchronization
CREATE TABLE sync_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sync_type ENUM('full_sync', 'incremental_sync', 'manual_sync') NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    operation ENUM('insert', 'update', 'delete') NOT NULL,
    local_id VARCHAR(50),
    server_id VARCHAR(36),
    sync_status ENUM('pending', 'success', 'failed', 'conflict') DEFAULT 'pending',
    error_message TEXT,
    sync_data JSON, -- Store the actual data being synced
    device_id VARCHAR(100), -- Identify which device synced the data
    user_id VARCHAR(36),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sync_type (sync_type),
    INDEX idx_table (table_name),
    INDEX idx_status (sync_status),
    INDEX idx_local_id (local_id),
    INDEX idx_device (device_id),
    INDEX idx_date (synced_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Settings table for system configuration
CREATE TABLE system_settings (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Whether setting can be accessed by non-admin users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (setting_key),
    INDEX idx_public (is_public)
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('store_name', 'Mobile POS Store', 'string', 'Store name for receipts and reports', TRUE),
('store_address', 'Dhaka, Bangladesh', 'string', 'Store address', TRUE),
('store_phone', '+8801712345678', 'string', 'Store contact phone', TRUE),
('store_email', 'store@mobilepos.com', 'string', 'Store email address', TRUE),
('currency_symbol', '৳', 'string', 'Currency symbol', TRUE),
('currency_code', 'BDT', 'string', 'Currency code', TRUE),
('tax_rate', '0.00', 'number', 'Default tax rate percentage', TRUE),
('receipt_footer', 'Thank you for your business!', 'string', 'Receipt footer message', TRUE),
('low_stock_threshold', '5', 'number', 'Low stock alert threshold', TRUE),
('auto_backup_enabled', 'true', 'boolean', 'Enable automatic backups', FALSE),
('backup_frequency', '24', 'number', 'Backup frequency in hours', FALSE);
