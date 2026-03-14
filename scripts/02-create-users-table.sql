-- Users table for authentication and role management
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'cashier') NOT NULL DEFAULT 'cashier',
    avatar VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role, phone, address) VALUES 
('System Administrator', 'admin@mobilepos.com', '$2b$10$rOzJqQZ8kVxHxvQqGXqJ4eK8vQqGXqJ4eK8vQqGXqJ4eK8vQqGXqJ4', 'admin', '+8801712345678', 'Dhaka, Bangladesh'),
('Store Manager', 'manager@mobilepos.com', '$2b$10$rOzJqQZ8kVxHxvQqGXqJ4eK8vQqGXqJ4eK8vQqGXqJ4eK8vQqGXqJ4', 'manager', '+8801812345678', 'Dhaka, Bangladesh');
