-- Seed sample data for Warehouse Management System

-- Clear existing data (in correct order due to foreign key constraints)
TRUNCATE TABLE sales_fulfillment, shopify_order_items, shopify_orders, shopify_stores, inventory, po_items, purchase_orders, products, stores, purchase_order_items, inventory_transactions RESTART IDENTITY CASCADE;

-- Insert sample products
INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES
('WH-001', 'Wireless Headphones', 'Bluetooth wireless headphones with noise cancellation', 10, 100),
('SW-002', 'Smart Watch', 'Fitness tracking smartwatch with heart rate monitor', 5, 50),
('PC-003', 'Phone Case', 'Protective phone case for iPhone 14', 20, 200),
('KB-004', 'Mechanical Keyboard', 'RGB mechanical gaming keyboard', 8, 80),
('MS-005', 'Wireless Mouse', 'Ergonomic wireless mouse with precision tracking', 15, 150);

-- Insert sample stores
INSERT INTO stores (name, shopify_domain, access_token) VALUES
('Main Store', 'main-store.myshopify.com', 'sample_access_token_1'),
('Secondary Store', 'secondary-store.myshopify.com', 'sample_access_token_2');

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'TechSupply Co', '2024-01-15', 250.00, 'Delivered', 'First quarter electronics order'),
('PO-2024-002', 'GadgetWorld Inc', '2024-01-20', 150.00, 'Delivered', 'Smart devices bulk order'),
('PO-2024-003', 'Global Gadgets', '2024-01-20', 200.00, 'In Transit', 'New product line introduction'),
('PO-2024-004', 'Tech Supplies Co.', '2024-01-22', 180.00, 'Pending', 'Reorder for high-demand items'),
('PO-2024-005', 'Digital World', '2024-01-25', 300.00, 'Draft', 'Camera and accessories order'),
('PO-2024-006', 'AccessoryHub', '2024-02-01', 75.00, 'In Transit', 'Phone accessories restock'),
('PO-2024-007', 'ElectroMart', '2024-02-10', 300.00, 'Pending', 'Gaming peripherals order'),
('PO-2024-008', 'ComponentSource', '2024-02-15', 125.00, 'Draft', 'Computer accessories draft order'),
('PO-20241201-001', 'TechCorp', '2024-11-15', 25.00, 'Delivered', 'Rush order for holiday season'),
('PO-20241201-002', 'ToolMaster', '2024-11-20', 15.00, 'Sent', 'Standard delivery'),
('PO-20241201-003', 'PartsCo', '2024-12-01', 10.00, 'Draft', 'Restock order');

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
(5, 'TB-006', 'Tablet', 5, 285.00),
-- PO-2024-006 items
(6, 'PC-003', 'Phone Case', 150, 14.50),
(6, 'MS-005', 'Wireless Mouse', 40, 35.00),
-- PO-2024-007 items
(7, 'KB-004', 'Mechanical Keyboard', 25, 85.00),
(7, 'MS-005', 'Wireless Mouse', 50, 32.00),
-- PO-2024-008 items
(8, 'WH-001', 'Wireless Headphones', 30, 78.00);

-- Insert sample products with additional fields
INSERT INTO products (sku, name, category, supplier, unit_cost, current_stock, reorder_point) VALUES
('WIDGET-001', 'Premium Widget', 'Electronics', 'TechCorp', 25.50, 100, 20),
('GADGET-002', 'Smart Gadget', 'Electronics', 'TechCorp', 45.00, 75, 15),
('TOOL-003', 'Professional Tool', 'Tools', 'ToolMaster', 89.99, 50, 10),
('PART-004', 'Replacement Part', 'Parts', 'PartsCo', 12.75, 200, 50),
('CABLE-005', 'USB Cable', 'Accessories', 'CableCorp', 8.99, 150, 30);

-- Insert inventory records (only for delivered POs)
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
-- From PO-2024-001 (Delivered) - with delivery cost distributed
(1, 1, 45, 80.00, '2024-01-15'), -- WH-001: 50 ordered, 5 sold, delivery cost added
(2, 2, 20, 130.00, '2024-01-15'), -- SW-002: 25 ordered, 5 sold, delivery cost added
(3, 3, 156, 16.25, '2024-01-15'), -- PC-003: 100 ordered, some manual additions
-- From PO-2024-002 (Delivered) - with delivery cost distributed
(4, 4, 28, 86.75, '2024-01-18'), -- BS-004: 30 ordered, 2 sold
(5, 5, 180, 9.25, '2024-01-18'), -- CB-005: 200 ordered, 20 sold
(8, 6, 38, 26.25, '2024-01-18'), -- MS-008: 40 ordered, 2 sold
-- From PO-2024-006 (In Transit)
(3, 7, 95, 16.50, '2024-02-01'), -- PC-003: 150 ordered, some manual additions
(8, 8, 38, 36.25, '2024-02-01'); -- MS-005: 40 ordered, some manual additions

-- Insert purchase order items for new POs
DO $$
DECLARE
    po1_id UUID;
    po2_id UUID;
    po3_id UUID;
    widget_id UUID;
    gadget_id UUID;
    tool_id UUID;
    part_id UUID;
    cable_id UUID;
BEGIN
    -- Get purchase order IDs
    SELECT id INTO po1_id FROM purchase_orders WHERE po_number = 'PO-20241201-001';
    SELECT id INTO po2_id FROM purchase_orders WHERE po_number = 'PO-20241201-002';
    SELECT id INTO po3_id FROM purchase_orders WHERE po_number = 'PO-20241201-003';
    
    -- Get product IDs
    SELECT id INTO widget_id FROM products WHERE sku = 'WIDGET-001';
    SELECT id INTO gadget_id FROM products WHERE sku = 'GADGET-002';
    SELECT id INTO tool_id FROM products WHERE sku = 'TOOL-003';
    SELECT id INTO part_id FROM products WHERE sku = 'PART-004';
    SELECT id INTO cable_id FROM products WHERE sku = 'CABLE-005';
    
    -- Insert purchase order items for PO1 (delivered)
    INSERT INTO purchase_order_items (po_id, product_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
    (po1_id, widget_id, 'WIDGET-001', 'Premium Widget', 50, 25.50, 0.50, 1300.00),
    (po1_id, gadget_id, 'GADGET-002', 'Smart Gadget', 25, 45.00, 0.50, 1137.50);
    
    -- Insert purchase order items for PO2 (sent)
    INSERT INTO purchase_order_items (po_id, product_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
    (po2_id, tool_id, 'TOOL-003', 'Professional Tool', 20, 89.99, 0.75, 1814.80);
    
    -- Insert purchase order items for PO3 (draft)
    INSERT INTO purchase_order_items (po_id, product_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
    (po3_id, part_id, 'PART-004', 'Replacement Part', 100, 12.75, 0.10, 1285.00),
    (po3_id, cable_id, 'CABLE-005', 'USB Cable', 50, 8.99, 0.10, 454.50);
    
    -- Insert inventory transactions for delivered PO
    INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_id, reference_type) VALUES
    (widget_id, 'purchase', 50, 26.00, po1_id, 'purchase_order'),
    (gadget_id, 'purchase', 25, 45.50, po1_id, 'purchase_order');
    
    -- Insert sample Shopify orders
    INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_email, total_amount, status) VALUES
    ((SELECT id FROM stores WHERE name = 'Main Store'), '12345678901', '#1001', 'customer1@example.com', 156.48, 'fulfilled'),
    ((SELECT id FROM stores WHERE name = 'Main Store'), '12345678902', '#1002', 'customer2@example.com', 98.99, 'pending'),
    ((SELECT id FROM stores WHERE name = 'Secondary Store'), '12345678903', '#2001', 'customer3@example.com', 71.49, 'fulfilled');
    
    -- Insert Shopify order items
    INSERT INTO shopify_order_items (order_id, product_id, sku, product_name, quantity, price) VALUES
    ((SELECT id FROM shopify_orders WHERE order_number = '#1001'), widget_id, 'WIDGET-001', 'Premium Widget', 2, 29.99),
    ((SELECT id FROM shopify_orders WHERE order_number = '#1001'), gadget_id, 'GADGET-002', 'Smart Gadget', 2, 49.99),
    ((SELECT id FROM shopify_orders WHERE order_number = '#1002'), tool_id, 'TOOL-003', 'Professional Tool', 1, 99.99),
    ((SELECT id FROM shopify_orders WHERE order_number = '#2001'), cable_id, 'CABLE-005', 'USB Cable', 3, 12.99),
    ((SELECT id FROM shopify_orders WHERE order_number = '#2001'), part_id, 'PART-004', 'Replacement Part', 2, 15.99);
    
    -- Create inventory transactions for sales
    INSERT INTO inventory_transactions (product_id, transaction_type, quantity, unit_cost, reference_id, reference_type) VALUES
    (widget_id, 'sale', -2, 29.99, (SELECT id FROM shopify_orders WHERE order_number = '#1001'), 'shopify_order'),
    (gadget_id, 'sale', -2, 49.99, (SELECT id FROM shopify_orders WHERE order_number = '#1001'), 'shopify_order'),
    (tool_id, 'sale', -1, 99.99, (SELECT id FROM shopify_orders WHERE order_number = '#1002'), 'shopify_order'),
    (cable_id, 'sale', -3, 12.99, (SELECT id FROM shopify_orders WHERE order_number = '#2001'), 'shopify_order'),
    (part_id, 'sale', -2, 15.99, (SELECT id FROM shopify_orders WHERE order_number = '#2001'), 'shopify_order');
    
END $$;

-- Update current stock based on transactions
UPDATE products SET current_stock = current_stock - 2 WHERE sku = 'WIDGET-001'; -- Sales
UPDATE products SET current_stock = current_stock - 2 WHERE sku = 'GADGET-002'; -- Sales  
UPDATE products SET current_stock = current_stock - 1 WHERE sku = 'TOOL-003'; -- Sales
UPDATE products SET current_stock = current_stock - 3 WHERE sku = 'CABLE-005'; -- Sales
UPDATE products SET current_stock = current_stock - 2 WHERE sku = 'PART-004'; -- Sales

-- Insert sample Shopify stores
INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES
('Main Store', 'mystore.myshopify.com', 'shpat_example_token_123', 'https://yourapp.com/webhook/store1', 'Active', NOW() - INTERVAL '2 hours'),
('EU Store', 'mystore-eu.myshopify.com', 'shpat_example_token_456', 'https://yourapp.com/webhook/store2', 'Active', NOW() - INTERVAL '1 day'),
('US Store', 'us-store.myshopify.com', 'shpat_example_token_789', 'https://yourapp.com/webhook/store3', 'Active', NOW() - INTERVAL '30 minutes'),
('Test Store', 'test-store.myshopify.com', 'shpat_example_token_789', NULL, 'Inactive', NOW() - INTERVAL '1 week'),
('Mobile Store', 'mobile-store.myshopify.com', 'shpat_example_token_789', 'https://yourapp.com/webhook/store5', 'Inactive', NOW() - INTERVAL '1 week');

-- Insert sample Shopify orders
INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, tax_amount, discount_amount, shipping_address) VALUES
(1, '5234567890123', '#1001', 'John Smith', 'john@example.com', '2024-02-01 10:30:00', 'fulfilled', 299.99, 15.00, 24.00, 0, '123 Main St, New York, NY 10001'),
(1, '5234567890124', '#1002', 'Sarah Johnson', 'sarah@example.com', '2024-02-02 14:15:00', 'fulfilled', 149.99, 10.00, 12.00, 0, '456 Oak Ave, Los Angeles, CA 90210'),
(1, '5234567890125', '#1003', 'Bob Johnson', 'bob@example.com', '2024-01-19 16:20:00', 'Shipped', 45.99, 7.99, 3.68, 0, '789 Pine St, Chicago, IL 60601'),
(1, '5234567890126', '#1004', 'Alice Brown', 'alice@example.com', '2024-01-21 10:15:00', 'Fulfilled', 425.98, 15.99, 34.08, 25.00, '321 Elm St, Miami, FL 33101'),
(2, '5234567890127', '#1005', 'Charlie Wilson', 'charlie@example.com', '2024-01-21 11:30:00', 'Processing', 85.00, 8.99, 6.80, 0, '654 Maple Ave, Seattle, WA 98101'),
(3, '5234567890128', '#1006', 'Diana Prince', 'diana@example.com', '2024-01-22 09:20:00', 'Fulfilled', 150.00, 10.00, 12.00, 0, '987 Broadway, Boston, MA 02101'),
(1, '5234567890129', '#1007', 'Edward Norton', 'edward@example.com', '2024-01-22 16:45:00', 'Cancelled', 75.50, 5.99, 6.04, 0, '147 Cedar St, Portland, OR 97201'),
(2, '5234567890130', '#1008', 'Fiona Green', 'fiona@example.com', '2024-01-23 12:30:00', 'Shipped', 320.00, 14.99, 25.60, 15.00, '258 Willow Dr, Austin, TX 78701'),
(1, '5001234567890', '#2001', 'Mike Wilson', 'mike@example.com', '2024-02-03 09:45:00', 'pending', 89.99, 8.00, 7.20, '789 Pine St, London, UK'),
(1, '5001234567891', '#2002', 'Emily Davis', 'emily@example.com', '2024-02-04 16:20:00', 'fulfilled', 199.99, 12.00, 16.00, '321 Elm St, Chicago, IL 60601');

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
(8, 'CB-005', 'USB Cable', 5, 17.00),
-- Order #2001
(9, 'PC-003', 'Phone Case', 3, 29.99),
-- Order #2002
(10, 'KB-004', 'Mechanical Keyboard', 1, 129.99),
(10, 'MS-005', 'Wireless Mouse', 2, 34.99);

-- Insert sample sales fulfillment (FIFO cost tracking for fulfilled orders only)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
-- Order #1001 - WH-001 (2 units) - Fulfilled
(1, 1, 2, 80.00),
-- Order #1002 - SW-002 (1 unit) - Processing (no fulfillment yet)
-- Order #1003 - PC-003 (3 units) - Shipped
(3, 3, 3, 16.25),
-- Order #1004 - WH-001 (1 unit), SW-002 (2 units) - Fulfilled
(4, 1, 1, 80.00),
(5, 2, 2, 130.00),
-- Order #1005 - BS-004 (1 unit) - Processing (no fulfillment yet)
-- Order #1006 - CB-005 (10 units) - Fulfilled
(6, 5, 10, 9.25),
-- Order #1007 - Cancelled (no fulfillment)
-- Order #1008 - MS-008 (2 units), WH-001 (1 unit), CB-005 (5 units) - Shipped
(9, 6, 2, 26.25),
(10, 1, 1, 80.00),
(11, 5, 5, 9.25),
-- Order #2001 fulfillment
(12, 7, 3, 16.50), -- 3 phone cases from inventory lot 3
-- Order #2002 fulfillment
(13, 1, 1, 80.00), -- 1 keyboard (using headphone cost as placeholder)
(14, 1, 2, 80.00); -- 2 mice (using headphone cost as placeholder)

-- Update inventory quantities after sales (subtract fulfilled quantities)
UPDATE inventory SET quantity_available = 43 WHERE id = 1; -- WH-001: 45 - 2 sold
UPDATE inventory SET quantity_available = 19 WHERE id = 2; -- SW-002 lot 1: 20 - 1 sold
UPDATE inventory SET quantity_available = 24 WHERE id = 3; -- SW-002 lot 2: 25 - 1 sold
UPDATE inventory SET quantity_available = 153 WHERE id = 4; -- PC-003: 156 - 3 sold
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
SELECT 'Sales Fulfillment', COUNT(*) FROM sales_fulfillment
UNION ALL
SELECT 'Stores', COUNT(*) FROM stores
UNION ALL
SELECT 'Purchase Order Items', COUNT(*) FROM purchase_order_items
UNION ALL
SELECT 'Inventory Transactions', COUNT(*) FROM inventory_transactions;
