-- Insert sample data for testing

-- Insert sample products
INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES
('WH-001', 'Wireless Headphones', 'Premium wireless headphones with noise cancellation', 20, 100),
('SW-002', 'Smart Watch', 'Fitness tracking smart watch', 15, 50),
('PC-003', 'Phone Case', 'Protective phone case for various models', 50, 200),
('BS-004', 'Bluetooth Speaker', 'Portable bluetooth speaker', 10, 40),
('CB-005', 'USB Cable', 'High-speed USB charging cable', 100, 500);

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status) VALUES
('PO-2024-001', 'Tech Supplies Co.', '2024-01-15', 250.00, 'Delivered'),
('PO-2024-002', 'Electronics Hub', '2024-01-18', 150.00, 'In Transit'),
('PO-2024-003', 'Global Gadgets', '2024-01-20', 200.00, 'Pending');

-- Insert sample PO items
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
-- PO-2024-001
(1, 'WH-001', 'Wireless Headphones', 50, 75.00),
(1, 'SW-002', 'Smart Watch', 25, 120.00),
(1, 'PC-003', 'Phone Case', 100, 15.00),
-- PO-2024-002
(2, 'BS-004', 'Bluetooth Speaker', 30, 85.00),
(2, 'CB-005', 'USB Cable', 200, 8.50),
-- PO-2024-003
(3, 'WH-001', 'Wireless Headphones', 30, 76.00),
(3, 'SW-002', 'Smart Watch', 20, 118.00);

-- Insert inventory records (FIFO layers)
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
-- Wireless Headphones
(1, 1, 25, 75.00, '2024-01-15'),  -- From PO-2024-001
(1, 6, 20, 76.00, '2024-01-20'),  -- From PO-2024-003
-- Smart Watch
(2, 2, 12, 120.00, '2024-01-15'), -- From PO-2024-001
(2, 7, 15, 118.00, '2024-01-20'), -- From PO-2024-003
-- Phone Case
(3, 3, 156, 15.00, '2024-01-15'), -- From PO-2024-001
-- Bluetooth Speaker
(4, 4, 8, 85.00, '2024-01-18'),   -- From PO-2024-002
-- USB Cable
(5, 5, 180, 8.50, '2024-01-18');  -- From PO-2024-002

-- Insert sample Shopify stores
INSERT INTO shopify_stores (name, shopify_domain, access_token, status, last_sync) VALUES
('Store A', 'store-a.myshopify.com', 'shpat_dummy_token_1', 'Connected', '2024-01-20 10:00:00'),
('Store B', 'store-b.myshopify.com', 'shpat_dummy_token_2', 'Connected', '2024-01-20 11:00:00'),
('Store C', 'store-c.myshopify.com', 'shpat_dummy_token_3', 'Error', '2024-01-18 15:30:00');

-- Insert sample Shopify orders
INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, shipping_address) VALUES
(1, '5234567890123', '#1001', 'John Doe', 'john@example.com', '2024-01-20 14:30:00', 'Fulfilled', 299.99, 9.99, '123 Main St, New York, NY 10001'),
(2, '5234567890124', '#1002', 'Jane Smith', 'jane@example.com', '2024-01-20 15:45:00', 'Processing', 189.99, 12.99, '456 Oak Ave, Los Angeles, CA 90210'),
(1, '5234567890125', '#1003', 'Bob Johnson', 'bob@example.com', '2024-01-19 16:20:00', 'Shipped', 45.99, 7.99, '789 Pine St, Chicago, IL 60601');

-- Insert sample order items
INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES
-- Order #1001
(1, 'WH-001', 'Wireless Headphones', 2, 149.99),
-- Order #1002
(2, 'SW-002', 'Smart Watch', 1, 189.99),
-- Order #1003
(3, 'PC-003', 'Phone Case', 3, 15.33);

-- Insert sample sales fulfillment (FIFO cost tracking)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
-- Order #1001 - 2 Wireless Headphones (using FIFO from oldest inventory)
(1, 1, 2, 75.00),  -- 2 units from PO-2024-001
-- Order #1002 - 1 Smart Watch
(2, 2, 1, 120.00), -- 1 unit from PO-2024-001
-- Order #1003 - 3 Phone Cases
(3, 5, 3, 15.00);  -- 3 units from PO-2024-001

-- Update inventory quantities after sales
UPDATE inventory SET quantity_available = 23 WHERE id = 1; -- Wireless Headphones from PO-2024-001
UPDATE inventory SET quantity_available = 11 WHERE id = 2; -- Smart Watch from PO-2024-001
UPDATE inventory SET quantity_available = 153 WHERE id = 5; -- Phone Case from PO-2024-001
