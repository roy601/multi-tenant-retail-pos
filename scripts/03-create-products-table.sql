-- Products table for inventory management
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    local_id VARCHAR(50), -- For sync from local storage
    name VARCHAR(200) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    brand VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'pcs',
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT DEFAULT 5,
    max_stock_level INT DEFAULT 1000,
    tax_rate DECIMAL(5,2) DEFAULT 0.00,
    discount_rate DECIMAL(5,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    image_url VARCHAR(500),
    supplier_id VARCHAR(36),
    created_by VARCHAR(36),
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_sku (sku),
    INDEX idx_barcode (barcode),
    INDEX idx_category (category),
    INDEX idx_brand (brand),
    INDEX idx_active (is_active),
    INDEX idx_stock (stock_quantity),
    INDEX idx_local_id (local_id),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample products
INSERT INTO products (name, description, sku, barcode, category, brand, cost_price, selling_price, stock_quantity) VALUES
('Samsung Galaxy A54', 'Samsung Galaxy A54 5G Smartphone', 'SAM-A54-128', '8801234567890', 'Mobile Phones', 'Samsung', 35000.00, 42000.00, 25),
('iPhone 14', 'Apple iPhone 14 128GB', 'APL-IP14-128', '8801234567891', 'Mobile Phones', 'Apple', 85000.00, 95000.00, 15),
('Xiaomi Redmi Note 12', 'Xiaomi Redmi Note 12 Pro', 'XIA-RN12-256', '8801234567892', 'Mobile Phones', 'Xiaomi', 28000.00, 32000.00, 30),
('Phone Case Universal', 'Universal Phone Protection Case', 'ACC-CASE-001', '8801234567893', 'Accessories', 'Generic', 150.00, 300.00, 100),
('Screen Protector', 'Tempered Glass Screen Protector', 'ACC-SCREEN-001', '8801234567894', 'Accessories', 'Generic', 80.00, 200.00, 150);
