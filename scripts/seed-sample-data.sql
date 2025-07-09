-- Seed sample data for Warehouse Management System

-- Clear existing data (in correct order due to foreign key constraints)
TRUNCATE TABLE sales_fulfillment, shopify_order_items, shopify_orders, shopify_stores, inventory, po_items, purchase_orders, products RESTART IDENTITY CASCADE;

-- Insert sample products
INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES
('WH-001', 'Wireless Headphones', 'Premium wireless headphones with noise cancellation', 10, 100),
('SW-002', 'Smart Watch', 'Fitness tracking smart watch with heart rate monitor', 5, 50),
('PC-003', 'Phone Case', 'Protective phone case for various models', 20, 200),
('BS-004', 'Bluetooth Speaker', 'Portable bluetooth speaker with premium sound', 8, 80),
('CB-005', 'USB Cable', 'High-speed USB charging cable', 50, 500),
('TB-006', 'Tablet', '10-inch tablet with high-resolution display', 3, 30),
('KD-007', 'Keyboard', 'Mechanical keyboard with RGB lighting', 10, 100),
('MS-008', 'Mouse', 'Wireless optical mouse', 15, 150),
('HD-009', 'Hard Drive', '1TB External hard drive', 5, 50),
('CM-010', 'Camera', 'Digital camera with 4K video', 2, 20);

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Tech Supplies Co.', '2024-01-15', 250.00, 'Delivered', 'Initial stock order for Q1'),
('PO-2024-002', 'Electronics Hub', '2024-01-18', 150.00, 'Delivered', 'Restocking popular items'),
('PO-2024-003', 'Global Gadgets', '2024-01-20', 200.00, 'In Transit', 'New product line introduction'),
('PO-2024-004', 'Tech Supplies Co.', '2024-01-22', 180.00, 'Pending', 'Reorder for high-demand items'),
('PO-2024-005', 'Digital World', '2024-01-25', 300.00, 'Draft', 'Camera and accessories order');

-- Insert sample PO items
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
-- PO-2024-001 items (Delivered)
(1, 'WH-001', 'Wireless Headphones', 50, 75.00),
(1, 'SW-002', 'Smart Watch', 25, 120.00),
(1, 'PC-003', 'Phone Case', 100, 15.00),
-- PO-2024-002 items (Delivered)
(2, 'BS-004', 'Bluetooth Speaker', 30, 85.00),
(2, 'CB-005', 'USB Cable', 200, 8.50),
(2, 'MS-008', 'Mouse', 40, 25.00),
-- PO-2024-003 items (In Transit)
(3, 'TB-006', 'Tablet', 15, 280.00),
(3, 'KD-007', 'Keyboard', 40, 45.00),
(3, 'HD-009', 'Hard Drive', 20, 120.00),
-- PO-2024-004 items (Pending)
(4, 'WH-001', 'Wireless Headphones', 30, 76.00),
(4, 'SW-002', 'Smart Watch', 20, 118.00),
-- PO-2024-005 items (Draft)
(5, 'CM-010', 'Camera', 10, 450.00),
(5, 'TB-006', 'Tablet', 5, 285.00);

-- Insert inventory records (only for delivered POs)
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
-- From PO-2024-001 (Delivered) - with delivery cost distributed
(1, 1, 45, 77.50, '2024-01-15'), -- WH-001: 50 ordered, 5 sold, delivery cost added
(2, 2, 20, 122.50, '2024-01-15'), -- SW-002: 25 ordered, 5 sold, delivery cost added
(3, 3, 156, 16.25, '2024-01-15'), -- PC-003: 100 ordered, some manual additions
-- From PO-2024-002 (Delivered) - with delivery cost distributed
(4, 4, 28, 86.75, '2024-01-18'), -- BS-004: 30 ordered, 2 sold
(5, 5, 180, 9.25, '2024-01-18'), -- CB-005: 200 ordered, 20 sold
(8, 6, 38, 26.25, '2024-01-18'); -- MS-008: 40 ordered, 2 sold

-- Insert sample Shopify stores
INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES
('Main Store', 'main-store.myshopify.com', 'shpat_***************main', 'https://yourapp.com/webhook/store1', 'Active', NOW() - INTERVAL '2 hours'),
('EU Store', 'eu-store.myshopify.com', 'shpat_***************eu', 'https://yourapp.com/webhook/store2', 'Active', NOW() - INTERVAL '1 hour'),
('US Store', 'us-store.myshopify.com', 'shpat_***************us', 'https://yourapp.com/webhook/store3', 'Active', NOW() - INTERVAL '30 minutes'),
('Test Store', 'test-store.myshopify.com', 'shpat_***************test', NULL, 'Error', NOW() - INTERVAL '2 days'),
('Mobile Store', 'mobile-store.myshopify.com', 'shpat_***************mobile', 'https://yourapp.com/webhook/store5', 'Inactive', NOW() - INTERVAL '1 week');

-- Insert sample Shopify orders
INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, tax_amount, discount_amount, shipping_address) VALUES
(1, '5234567890123', '#1001', 'John Doe', 'john@example.com', '2024-01-20 14:30:00', 'Fulfilled', 299.99, 9.99, 24.00, 0, '123 Main St, New York, NY 10001'),
(2, '5234567890124', '#1002', 'Jane Smith', 'jane@example.com', '2024-01-20 15:45:00', 'Processing', 189.99, 12.99, 15.20, 10.00, '456 Oak Ave, Los Angeles, CA 90210'),
(1, '5234567890125', '#1003', 'Bob Johnson', 'bob@example.com', '2024-01-19 16:20:00', 'Shipped', 45.99, 7.99, 3.68, 0, '789 Pine St, Chicago, IL 60601'),
(1, '5234567890126', '#1004', 'Alice Brown', 'alice@example.com', '2024-01-21 10:15:00', 'Fulfilled', 425.98, 15.99, 34.08, 25.00, '321 Elm St, Miami, FL 33101'),
(2, '5234567890127', '#1005', 'Charlie Wilson', 'charlie@example.com', '2024-01-21 11:30:00', 'Processing', 85.00, 8.99, 6.80, 0, '654 Maple Ave, Seattle, WA 98101'),
(3, '5234567890128', '#1006', 'Diana Prince', 'diana@example.com', '2024-01-22 09:20:00', 'Fulfilled', 150.00, 10.00, 12.00, 0, '987 Broadway, Boston, MA 02101'),
(1, '5234567890129', '#1007', 'Edward Norton', 'edward@example.com', '2024-01-22 16:45:00', 'Cancelled', 75.50, 5.99, 6.04, 0, '147 Cedar St, Portland, OR 97201'),
(2, '5234567890130', '#1008', 'Fiona Green', 'fiona@example.com', '2024-01-23 12:30:00', 'Shipped', 320.00, 14.99, 25.60, 15.00, '258 Willow Dr, Austin, TX 78701');

-- Insert sample order items
INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES
-- Order #1001
(1, 'WH-001', 'Wireless Headphones', 2, 149.99),
-- Order #1002
(2, 'SW-002', 'Smart Watch', 1, 189.99),
-- Order #1003
(3, 'PC-003', 'Phone Case', 3, 15.33),
-- Order #1004
(4, 'WH-001', 'Wireless Headphones', 1, 149.99),
(4, 'SW-002', 'Smart Watch', 2, 189.99),
-- Order #1005
(5, 'BS-004', 'Bluetooth Speaker', 1, 85.00),
-- Order #1006
(6, 'CB-005', 'USB Cable', 10, 15.00),
-- Order #1007 (Cancelled)
(7, 'PC-003', 'Phone Case', 5, 15.10),
-- Order #1008
(8, 'MS-008', 'Mouse', 2, 35.00),
(8, 'WH-001', 'Wireless Headphones', 1, 149.99),
(8, 'CB-005', 'USB Cable', 5, 17.00);

-- Insert sample sales fulfillment (FIFO cost tracking for fulfilled orders only)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
-- Order #1001 - WH-001 (2 units) - Fulfilled
(1, 1, 2, 77.50),
-- Order #1002 - SW-002 (1 unit) - Processing (no fulfillment yet)
-- Order #1003 - PC-003 (3 units) - Shipped
(3, 3, 3, 16.25),
-- Order #1004 - WH-001 (1 unit), SW-002 (2 units) - Fulfilled
(4, 1, 1, 77.50),
(5, 2, 2, 122.50),
-- Order #1005 - BS-004 (1 unit) - Processing (no fulfillment yet)
-- Order #1006 - CB-005 (10 units) - Fulfilled
(6, 5, 10, 9.25),
-- Order #1007 - Cancelled (no fulfillment)
-- Order #1008 - MS-008 (2 units), WH-001 (1 unit), CB-005 (5 units) - Shipped
(9, 6, 2, 26.25),
(10, 1, 1, 77.50),
(11, 5, 5, 9.25);

-- Update inventory quantities after sales (subtract fulfilled quantities)
UPDATE inventory SET quantity_available = 41 WHERE id = 1; -- WH-001: 45 - 4 sold
UPDATE inventory SET quantity_available = 18 WHERE id = 2; -- SW-002: 20 - 2 sold
UPDATE inventory SET quantity_available = 153 WHERE id = 3; -- PC-003: 156 - 3 sold
UPDATE inventory SET quantity_available = 28 WHERE id = 4; -- BS-004: 28 - 0 sold (processing)
UPDATE inventory SET quantity_available = 165 WHERE id = 5; -- CB-005: 180 - 15 sold
UPDATE inventory SET quantity_available = 36 WHERE id = 6; -- MS-008: 38 - 2 sold

-- Add some additional manual inventory entries (simulating manual stock additions)
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
(3, NULL, 50, 14.50, '2024-01-10'), -- PC-003: Manual entry (older stock)
(5, NULL, 100, 8.00, '2024-01-12'); -- CB-005: Manual entry (older stock)

-- Show data insertion summary
SELECT 'Sample data inserted successfully!' as status;
SELECT 
    'Products' as table_name, COUNT(*) as record_count FROM products
UNION ALL
SELECT 'Purchase Orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'PO Items', COUNT(*) FROM po_items
UNION ALL
SELECT 'Inventory Records', COUNT(*) FROM inventory
UNION ALL
SELECT 'Shopify Stores', COUNT(*) FROM shopify_stores
UNION ALL
SELECT 'Shopify Orders', COUNT(*) FROM shopify_orders
UNION ALL
SELECT 'Order Items', COUNT(*) FROM shopify_order_items
UNION ALL
SELECT 'Sales Fulfillment', COUNT(*) FROM sales_fulfillment;
