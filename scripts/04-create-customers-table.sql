-- Customers table for customer management
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    local_id VARCHAR(50), -- For sync from local storage
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(50),
    postal_code VARCHAR(10),
    date_of_birth DATE,
    gender ENUM('male', 'female', 'other'),
    customer_type ENUM('regular', 'vip', 'wholesale') DEFAULT 'regular',
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    total_purchases DECIMAL(12,2) DEFAULT 0.00,
    total_orders INT DEFAULT 0,
    last_purchase_date TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by VARCHAR(36),
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_phone (phone),
    INDEX idx_email (email),
    INDEX idx_customer_type (customer_type),
    INDEX idx_active (is_active),
    INDEX idx_local_id (local_id),
    
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert sample customers
INSERT INTO customers (name, email, phone, address, city, customer_type) VALUES
('আহমেদ হাসান', 'ahmed.hasan@email.com', '+8801712345678', 'ধানমন্ডি, ঢাকা', 'ঢাকা', 'regular'),
('ফাতেমা খাতুন', 'fatema.khatun@email.com', '+8801812345679', 'গুলশান, ঢাকা', 'ঢাকা', 'vip'),
('মোহাম্মদ রহিম', 'mohammad.rahim@email.com', '+8801912345680', 'চট্টগ্রাম', 'চট্টগ্রাম', 'wholesale'),
('সালমা বেগম', 'salma.begum@email.com', '+8801612345681', 'সিলেট', 'সিলেট', 'regular'),
('করিম উদ্দিন', 'karim.uddin@email.com', '+8801512345682', 'রাজশাহী', 'রাজশাহী', 'regular');
