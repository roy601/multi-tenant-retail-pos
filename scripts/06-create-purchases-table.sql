-- Purchases table for inventory purchases
CREATE TABLE purchases (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    local_id VARCHAR(50), -- For sync from local storage
    purchase_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(100),
    supplier_phone VARCHAR(20),
    supplier_address TEXT,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    due_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash', 'bank_transfer', 'cheque', 'credit') DEFAULT 'cash',
    purchase_status ENUM('completed', 'pending', 'cancelled') DEFAULT 'completed',
    notes TEXT,
    created_by VARCHAR(36),
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_purchase_number (purchase_number),
    INDEX idx_supplier (supplier_name),
    INDEX idx_date (created_at),
    INDEX idx_status (purchase_status),
    INDEX idx_local_id (local_id),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Purchase items table
CREATE TABLE purchase_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    purchase_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    product_name VARCHAR(200) NOT NULL,
    product_sku VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_purchase (purchase_id),
    INDEX idx_product (product_id),
    
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
