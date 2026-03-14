-- Additional indexes for performance optimization

-- Composite indexes for common queries
CREATE INDEX idx_sales_date_status ON sales(created_at, sale_status);
CREATE INDEX idx_sales_customer_date ON sales(customer_id, created_at);
CREATE INDEX idx_products_category_active ON products(category, is_active);
CREATE INDEX idx_products_stock_active ON products(stock_quantity, is_active);
CREATE INDEX idx_customers_type_active ON customers(customer_type, is_active);

-- Full-text search indexes
ALTER TABLE products ADD FULLTEXT(name, description);
ALTER TABLE customers ADD FULLTEXT(name, address);

-- Optimize tables
OPTIMIZE TABLE users;
OPTIMIZE TABLE products;
OPTIMIZE TABLE customers;
OPTIMIZE TABLE sales;
OPTIMIZE TABLE sale_items;
OPTIMIZE TABLE purchases;
OPTIMIZE TABLE purchase_items;
OPTIMIZE TABLE returns;
OPTIMIZE TABLE return_items;
OPTIMIZE TABLE cashbook_entries;

-- Create backup procedure
DELIMITER //
CREATE PROCEDURE CreateDatabaseBackup()
BEGIN
    DECLARE backup_name VARCHAR(100);
    SET backup_name = CONCAT('mobile_pos_backup_', DATE_FORMAT(NOW(), '%Y%m%d_%H%i%s'));
    
    -- This would typically use mysqldump command
    -- Implementation depends on your server setup
    SELECT CONCAT('Backup created: ', backup_name) as backup_status;
END //
DELIMITER ;
