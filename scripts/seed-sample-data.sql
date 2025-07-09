-- Seed sample data for Warehouse Management System

-- Clear existing data (in dependency order)
DELETE FROM sales_fulfillment;
DELETE FROM shopify_order_items;
DELETE FROM shopify_orders;
DELETE FROM shopify_stores;
DELETE FROM inventory;
DELETE FROM po_items;
DELETE FROM purchase_orders;
DELETE FROM products;

-- Reset sequences
ALTER SEQUENCE purchase_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE po_items_id_seq RESTART WITH 1;
ALTER SEQUENCE products_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_id_seq RESTART WITH 1;
ALTER SEQUENCE shopify_stores_id_seq RESTART WITH 1;
ALTER SEQUENCE shopify_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE shopify_order_items_id_seq RESTART WITH 1;
ALTER SEQUENCE sales_fulfillment_id_seq RESTART WITH 1;

-- Insert sample products
INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES
('WH-001', 'Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 10, 100),
('SW-002', 'Smart Watch', 'Fitness tracking smartwatch with heart rate monitor', 5, 50),
('PC-003', 'Phone Case', 'Protective case for smartphones - universal fit', 25, 200),
('BS-004', 'Bluetooth Speaker', 'Portable wireless speaker with premium sound', 8, 80),
('CB-005', 'USB Cable', 'High-speed USB-C charging cable - 6ft', 50, 500),
('TB-006', 'Tablet Stand', 'Adjustable tablet stand for desk use', 15, 100),
('KD-007', 'Wireless Keyboard', 'Bluetooth keyboard with backlight', 10, 60);

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Tech Supplies Co.', '2024-01-15', 150.00, 'Delivered', 'Initial stock order for Q1'),
('PO-2024-002', 'Electronics Hub', '2024-01-18', 75.00, 'Delivered', 'Restocking popular items'),
('PO-2024-003', 'Global Gadgets', '2024-01-22', 200.00, 'Pending', 'Large order for new product line'),
('PO-2024-004', 'Premium Tech', '2024-01-25', 125.00, 'Approved', 'Rush order for high-demand items');

-- Insert PO items for PO-2024-001 (Delivered)
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(1, 'WH-001', 'Wireless Headphones', 50, 75.00),
(1, 'SW-002', 'Smart Watch', 25, 120.00),
(1, 'PC-003', 'Phone Case', 100, 15.00);

-- Insert PO items for PO-2024-002 (Delivered)
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(2, 'BS-004', 'Bluetooth Speaker', 30, 85.00),
(2, 'CB-005', 'USB Cable', 200, 8.50),
(2, 'WH-001', 'Wireless Headphones', 25, 72.00);

-- Insert PO items for PO-2024-003 (Pending)
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(3, 'TB-006', 'Tablet Stand', 40, 28.00),
(3, 'KD-007', 'Wireless Keyboard', 35, 45.00),
(3, 'SW-002', 'Smart Watch', 20, 118.00);

-- Insert PO items for PO-2024-004 (Approved)
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(4, 'PC-003', 'Phone Case', 150, 14.50),
(4, 'CB-005', 'USB Cable', 100, 8.75),
(4, 'BS-004', 'Bluetooth Speaker', 20, 82.00);

-- Insert inventory for delivered orders (FIFO tracking)
-- From PO-2024-001
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
(1, 1, 45, 75.00, '2024-01-15'), -- WH-001: 45 remaining (5 sold)
(2, 2, 22, 120.00, '2024-01-15'), -- SW-002: 22 remaining (3 sold)
(3, 3, 95, 15.00, '2024-01-15'); -- PC-003: 95 remaining (5 sold)

-- From PO-2024-002
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
(4, 4, 28, 85.00, '2024-01-18'), -- BS-004: 28 remaining (2 sold)
(5, 5, 180, 8.50, '2024-01-18'), -- CB-005: 180 remaining (20 sold)
(1, 6, 23, 72.00, '2024-01-18'); -- WH-001: 23 remaining (2 sold from newer batch)

-- Insert sample Shopify stores
INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES
('Main Electronics Store', 'main-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store1', 'Active', '2024-01-26 10:30:00'),
('EU Electronics Hub', 'eu-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store2', 'Active', '2024-01-26 09:15:00'),
('Mobile Accessories Store', 'mobile-accessories.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store3', 'Inactive', '2024-01-25 16:45:00');

-- Insert sample Shopify orders
INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, tax_amount, discount_amount, shipping_address) VALUES
(1, '5234567890123', '#1001', 'John Doe', 'john@example.com', '2024-01-20 14:30:00', 'fulfilled', 299.99, 9.99, 24.00, 0.00, '123 Main St, New York, NY 10001'),
(1, '5234567890124', '#1002', 'Jane Smith', 'jane@example.com', '2024-01-21 10:15:00', 'pending', 189.99, 12.99, 15.20, 5.00, '456 Oak Ave, Los Angeles, CA 90210'),
(2, '5234567890125', '#2001', 'Bob Johnson', 'bob@example.com', '2024-01-22 16:20:00', 'shipped', 159.99, 7.99, 12.80, 0.00, '789 Pine St, Chicago, IL 60601'),
(1, '5234567890126', '#1003', 'Alice Brown', 'alice@example.com', '2024-01-23 11:45:00', 'fulfilled', 89.99, 8.99, 7.20, 10.00, '321 Elm Rd, Houston, TX 77001'),
(3, '5234567890127', '#3001', 'Charlie Wilson', 'charlie@example.com', '2024-01-24 13:30:00', 'cancelled', 45.99, 5.99, 3.68, 0.00, '654 Maple Dr, Phoenix, AZ 85001');

-- Insert Shopify order items
INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES
-- Order #1001
(1, 'WH-001', 'Wireless Headphones', 2, 149.99),
-- Order #1002  
(2, 'SW-002', 'Smart Watch', 1, 189.99),
-- Order #2001
(3, 'BS-004', 'Bluetooth Speaker', 1, 129.99),
(3, 'PC-003', 'Phone Case', 2, 15.00),
-- Order #1003
(4, 'CB-005', 'USB Cable', 3, 12.99),
(4, 'PC-003', 'Phone Case', 2, 16.99),
-- Order #3001 (cancelled)
(5, 'PC-003', 'Phone Case', 3, 15.33);

-- Insert sales fulfillment records (FIFO cost tracking)
-- Order #1001: 2x WH-001 (fulfilled from oldest inventory first)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
(1, 1, 2, 75.00), -- Used 2 from first batch at $75.00 each
-- 3x WH-001 more were used from various orders, reducing inventory

-- Order #1002: 1x SW-002
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
(2, 2, 1, 120.00); -- Used 1 from first batch at $120.00
-- 2x SW-002 more were used from various orders

-- Order #2001: 1x BS-004, 2x PC-003
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
(3, 4, 1, 85.00), -- BS-004 from first batch
(4, 3, 2, 15.00); -- PC-003 from first batch
-- 1x BS-004 more was used, 3x PC-003 more were used

-- Order #1003: 3x CB-005, 2x PC-003 (fulfilled)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
(5, 5, 3, 8.50), -- CB-005 from first batch
(6, 3, 2, 15.00); -- PC-003 from first batch
-- 17x CB-005 more were used from various orders

-- Create summary view refresh (for PostgreSQL)
REFRESH MATERIALIZED VIEW IF EXISTS product_inventory_summary;

SELECT 'Sample data inserted successfully!' as message;
