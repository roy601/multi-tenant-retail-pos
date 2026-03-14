-- Insert sample sales data
INSERT INTO sales (invoice_number, customer_id, customer_name, customer_phone, subtotal, tax_amount, total_amount, paid_amount, payment_method, cashier_id, cashier_name) VALUES
('INV-2024-001', (SELECT id FROM customers WHERE name = 'আহমেদ হাসান'), 'আহমেদ হাসান', '+8801712345678', 42000.00, 0.00, 42000.00, 42000.00, 'cash', (SELECT id FROM users WHERE role = 'admin'), 'System Administrator'),
('INV-2024-002', (SELECT id FROM customers WHERE name = 'ফাতেমা খাতুন'), 'ফাতেমা খাতুন', '+8801812345679', 95000.00, 0.00, 95000.00, 95000.00, 'card', (SELECT id FROM users WHERE role = 'admin'), 'System Administrator'),
('INV-2024-003', (SELECT id FROM customers WHERE name = 'মোহাম্মদ রহিম'), 'মোহাম্মদ রহিম', '+8801912345680', 64000.00, 0.00, 64000.00, 64000.00, 'mobile_banking', (SELECT id FROM users WHERE role = 'manager'), 'Store Manager');

-- Insert corresponding sale items
INSERT INTO sale_items (sale_id, product_id, product_name, product_sku, quantity, unit_price, line_total) VALUES
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-001'), (SELECT id FROM products WHERE sku = 'SAM-A54-128'), 'Samsung Galaxy A54', 'SAM-A54-128', 1, 42000.00, 42000.00),
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-002'), (SELECT id FROM products WHERE sku = 'APL-IP14-128'), 'iPhone 14', 'APL-IP14-128', 1, 95000.00, 95000.00),
((SELECT id FROM sales WHERE invoice_number = 'INV-2024-003'), (SELECT id FROM products WHERE sku = 'XIA-RN12-256'), 'Xiaomi Redmi Note 12', 'XIA-RN12-256', 2, 32000.00, 64000.00);

-- Insert sample purchase data
INSERT INTO purchases (purchase_number, supplier_name, supplier_phone, subtotal, total_amount, paid_amount, payment_method, created_by) VALUES
('PUR-2024-001', 'Samsung Bangladesh Ltd', '+8802123456789', 350000.00, 350000.00, 350000.00, 'bank_transfer', (SELECT id FROM users WHERE role = 'admin')),
('PUR-2024-002', 'Apple Authorized Distributor', '+8802123456790', 850000.00, 850000.00, 850000.00, 'bank_transfer', (SELECT id FROM users WHERE role = 'admin'));

-- Insert purchase items
INSERT INTO purchase_items (purchase_id, product_id, product_name, product_sku, quantity, unit_cost, line_total) VALUES
((SELECT id FROM purchases WHERE purchase_number = 'PUR-2024-001'), (SELECT id FROM products WHERE sku = 'SAM-A54-128'), 'Samsung Galaxy A54', 'SAM-A54-128', 10, 35000.00, 350000.00),
((SELECT id FROM purchases WHERE purchase_number = 'PUR-2024-002'), (SELECT id FROM products WHERE sku = 'APL-IP14-128'), 'iPhone 14', 'APL-IP14-128', 10, 85000.00, 850000.00);

-- Insert sample cashbook entries
INSERT INTO cashbook_entries (entry_date, entry_type, category, description, amount, reference_type, reference_number, created_by) VALUES
(CURDATE(), 'opening_balance', 'opening', 'Daily opening balance', 50000.00, 'other', 'OPEN-' || CURDATE(), (SELECT id FROM users WHERE role = 'admin')),
(CURDATE(), 'cash_in', 'sales', 'Sale to আহমেদ হাসান', 42000.00, 'sale', 'INV-2024-001', (SELECT id FROM users WHERE role = 'admin')),
(CURDATE(), 'cash_out', 'purchase', 'Purchase from Samsung Bangladesh', 350000.00, 'purchase', 'PUR-2024-001', (SELECT id FROM users WHERE role = 'admin')),
(CURDATE(), 'cash_in', 'sales', 'Sale to ফাতেমা খাতুন', 95000.00, 'sale', 'INV-2024-002', (SELECT id FROM users WHERE role = 'admin'));

-- Update daily cash summary
INSERT INTO daily_cash_summary (summary_date, opening_balance, total_cash_in, total_cash_out, closing_balance, total_sales, total_purchases, created_by) VALUES
(CURDATE(), 50000.00, 137000.00, 350000.00, -163000.00, 201000.00, 1200000.00, (SELECT id FROM users WHERE role = 'admin'));
