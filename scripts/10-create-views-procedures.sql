-- Useful views for reporting and analytics

-- Daily sales summary view
CREATE VIEW daily_sales_summary AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_transactions,
    SUM(total_amount) as total_sales,
    SUM(tax_amount) as total_tax,
    SUM(discount_amount) as total_discount,
    AVG(total_amount) as average_sale
FROM sales 
WHERE sale_status = 'completed'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- Product sales performance view
CREATE VIEW product_sales_performance AS
SELECT 
    p.id,
    p.name,
    p.sku,
    p.category,
    p.brand,
    COALESCE(SUM(si.quantity), 0) as total_sold,
    COALESCE(SUM(si.line_total), 0) as total_revenue,
    p.stock_quantity as current_stock,
    p.cost_price,
    p.selling_price
FROM products p
LEFT JOIN sale_items si ON p.id = si.product_id
LEFT JOIN sales s ON si.sale_id = s.id AND s.sale_status = 'completed'
GROUP BY p.id, p.name, p.sku, p.category, p.brand, p.stock_quantity, p.cost_price, p.selling_price
ORDER BY total_sold DESC;

-- Customer purchase summary view
CREATE VIEW customer_purchase_summary AS
SELECT 
    c.id,
    c.name,
    c.phone,
    c.customer_type,
    COUNT(s.id) as total_orders,
    COALESCE(SUM(s.total_amount), 0) as total_spent,
    COALESCE(AVG(s.total_amount), 0) as average_order_value,
    MAX(s.created_at) as last_purchase_date
FROM customers c
LEFT JOIN sales s ON c.id = s.customer_id AND s.sale_status = 'completed'
GROUP BY c.id, c.name, c.phone, c.customer_type
ORDER BY total_spent DESC;

-- Low stock products view
CREATE VIEW low_stock_products AS
SELECT 
    id,
    name,
    sku,
    category,
    brand,
    stock_quantity,
    min_stock_level,
    (min_stock_level - stock_quantity) as shortage_quantity
FROM products 
WHERE stock_quantity <= min_stock_level 
AND is_active = TRUE
ORDER BY shortage_quantity DESC;

-- Monthly revenue view
CREATE VIEW monthly_revenue AS
SELECT 
    YEAR(created_at) as year,
    MONTH(created_at) as month,
    MONTHNAME(created_at) as month_name,
    COUNT(*) as total_transactions,
    SUM(total_amount) as total_revenue,
    SUM(tax_amount) as total_tax,
    AVG(total_amount) as average_transaction
FROM sales 
WHERE sale_status = 'completed'
GROUP BY YEAR(created_at), MONTH(created_at), MONTHNAME(created_at)
ORDER BY year DESC, month DESC;

-- Stored procedure to update product stock after sale
DELIMITER //
CREATE PROCEDURE UpdateProductStock(
    IN p_product_id VARCHAR(36),
    IN p_quantity_sold INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    UPDATE products 
    SET stock_quantity = stock_quantity - p_quantity_sold,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
    
    COMMIT;
END //
DELIMITER ;

-- Stored procedure to process return and update stock
DELIMITER //
CREATE PROCEDURE ProcessReturn(
    IN p_return_id VARCHAR(36)
)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_product_id VARCHAR(36);
    DECLARE v_quantity INT;
    DECLARE v_return_type ENUM('sale_return', 'purchase_return');
    
    DECLARE return_cursor CURSOR FOR
        SELECT ri.product_id, ri.quantity, r.return_type
        FROM return_items ri
        JOIN returns r ON ri.return_id = r.id
        WHERE ri.return_id = p_return_id;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    OPEN return_cursor;
    
    read_loop: LOOP
        FETCH return_cursor INTO v_product_id, v_quantity, v_return_type;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- For sale returns, add stock back
        -- For purchase returns, reduce stock
        IF v_return_type = 'sale_return' THEN
            UPDATE products 
            SET stock_quantity = stock_quantity + v_quantity,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_product_id;
        ELSE
            UPDATE products 
            SET stock_quantity = stock_quantity - v_quantity,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_product_id;
        END IF;
        
    END LOOP;
    
    CLOSE return_cursor;
    
    -- Update return status
    UPDATE returns 
    SET return_status = 'completed',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_return_id;
    
    COMMIT;
END //
DELIMITER ;
