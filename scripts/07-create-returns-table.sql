-- Returns table for sales and purchase returns
CREATE TABLE returns (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    local_id VARCHAR(50), -- For sync from local storage
    return_number VARCHAR(50) UNIQUE NOT NULL,
    return_type ENUM('sale_return', 'purchase_return') NOT NULL,
    original_transaction_id VARCHAR(36), -- Reference to original sale/purchase
    original_invoice_number VARCHAR(50),
    customer_id VARCHAR(36),
    customer_name VARCHAR(100),
    supplier_name VARCHAR(100),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    refund_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    refund_method ENUM('cash', 'card', 'store_credit', 'bank_transfer') DEFAULT 'cash',
    return_reason VARCHAR(200),
    return_status ENUM('completed', 'pending', 'cancelled') DEFAULT 'completed',
    notes TEXT,
    processed_by VARCHAR(36),
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_return_number (return_number),
    INDEX idx_type (return_type),
    INDEX idx_original (original_transaction_id),
    INDEX idx_customer (customer_id),
    INDEX idx_date (created_at),
    INDEX idx_local_id (local_id),
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Return items table
CREATE TABLE return_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    return_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    return_reason VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_return (return_id),
    INDEX idx_product (product_id),
    
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
