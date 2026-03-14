-- Sales table for transaction records
CREATE TABLE sales (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    local_id VARCHAR(50), -- For sync from local storage
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id VARCHAR(36),
    customer_name VARCHAR(100), -- Store name even if customer is deleted
    customer_phone VARCHAR(20),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    change_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash', 'card', 'mobile_banking', 'split') NOT NULL DEFAULT 'cash',
    payment_details JSON, -- Store split payment details
    sale_status ENUM('completed', 'pending', 'cancelled', 'returned') DEFAULT 'completed',
    notes TEXT,
    cashier_id VARCHAR(36),
    cashier_name VARCHAR(100),
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_invoice (invoice_number),
    INDEX idx_customer (customer_id),
    INDEX idx_date (created_at),
    INDEX idx_status (sale_status),
    INDEX idx_cashier (cashier_id),
    INDEX idx_local_id (local_id),
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Sales items table for detailed line items
CREATE TABLE sale_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sale_id VARCHAR(36) NOT NULL,
    product_id VARCHAR(36),
    product_name VARCHAR(200) NOT NULL, -- Store name even if product is deleted
    product_sku VARCHAR(100),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sale (sale_id),
    INDEX idx_product (product_id),
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
