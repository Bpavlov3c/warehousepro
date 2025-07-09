-- Sample data for warehouse management system
-- Run this after creating the database structure

-- Clear existing data
TRUNCATE TABLE inventory_transactions CASCADE;
TRUNCATE TABLE purchase_order_items CASCADE;
TRUNCATE TABLE purchase_orders CASCADE;
TRUNCATE TABLE inventory_items CASCADE;
TRUNCATE TABLE shopify_stores CASCADE;

-- Insert sample inventory items
INSERT INTO inventory_items (id, sku, product_name, category, current_stock, reserved_stock, reorder_point, reorder_quantity, average_cost, location, supplier) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'WH-LAPTOP-001', 'Business Laptop Pro', 'Electronics', 25, 5, 10, 50, 899.99, 'A1-B2', 'TechSupply Co'),
('550e8400-e29b-41d4-a716-446655440002', 'WH-MOUSE-002', 'Wireless Mouse', 'Electronics', 150, 20, 25, 100, 29.99, 'A1-C3', 'TechSupply Co'),
('550e8400-e29b-41d4-a716-446655440003', 'WH-DESK-003', 'Standing Desk', 'Furniture', 8, 2, 5, 20, 299.99, 'B2-A1', 'Office Furniture Ltd'),
('550e8400-e29b-41d4-a716-446655440004', 'WH-CHAIR-004', 'Ergonomic Office Chair', 'Furniture', 12, 3, 8, 25, 199.99, 'B2-B2', 'Office Furniture Ltd'),
('550e8400-e29b-41d4-a716-446655440005', 'WH-MONITOR-005', '27" 4K Monitor', 'Electronics', 18, 4, 12, 30, 349.99, 'A1-D4', 'Display Solutions Inc'),
('550e8400-e29b-41d4-a716-446655440006', 'WH-KEYBOARD-006', 'Mechanical Keyboard', 'Electronics', 45, 8, 15, 60, 89.99, 'A1-C2', 'TechSupply Co'),
('550e8400-e29b-41d4-a716-446655440007', 'WH-TABLET-007', 'Business Tablet', 'Electronics', 30, 6, 20, 40, 449.99, 'A1-B3', 'Mobile Devices Corp'),
('550e8400-e29b-41d4-a716-446655440008', 'WH-PRINTER-008', 'Laser Printer', 'Electronics', 6, 1, 3, 15, 249.99, 'A2-A1', 'Print Solutions Ltd'),
('550e8400-e29b-41d4-a716-446655440009', 'WH-CABLE-009', 'USB-C Cable 6ft', 'Electronics', 200, 25, 50, 200, 12.99, 'A1-E5', 'Cable Co'),
('550e8400-e29b-41d4-a716-446655440010', 'WH-LAMP-010', 'LED Desk Lamp', 'Furniture', 35, 7, 15, 50, 39.99, 'B2-C3', 'Lighting Solutions');

-- Insert sample Shopify stores
INSERT INTO shopify_stores (id, name, domain, access_token, is_active, last_sync) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'Main Store', 'mystore.myshopify.com', 'shpat_1234567890abcdef', true, NOW() - INTERVAL '2 hours'),
('660e8400-e29b-41d4-a716-446655440002', 'EU Store', 'eu-store.myshopify.com', 'shpat_abcdef1234567890', true, NOW() - INTERVAL '1 day'),
('660e8400-e29b-41d4-a716-446655440003', 'B2B Store', 'b2b.myshopify.com', 'shpat_fedcba0987654321', false, NOW() - INTERVAL '1 week');

-- Insert sample purchase orders
INSERT INTO purchase_orders (id, supplier, order_date, expected_delivery, status, total_cost, notes) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'TechSupply Co', '2024-01-15', '2024-01-25', 'delivered', 15749.75, 'Bulk order for Q1 inventory'),
('770e8400-e29b-41d4-a716-446655440002', 'Office Furniture Ltd', '2024-01-20', '2024-02-05', 'shipped', 8999.75, 'Office expansion furniture'),
('770e8400-e29b-41d4-a716-446655440003', 'Display Solutions Inc', '2024-01-25', '2024-02-10', 'confirmed', 10849.70, 'Monitor upgrade project'),
('770e8400-e29b-41d4-a716-446655440004', 'Mobile Devices Corp', '2024-02-01', '2024-02-15', 'pending', 13949.75, 'Tablet deployment for sales team'),
('770e8400-e29b-41d4-a716-446655440005', 'Print Solutions Ltd', '2024-02-05', '2024-02-20', 'pending', 3999.85, 'Printer replacement program');

-- Insert sample purchase order items
-- PO 1: TechSupply Co
INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'Business Laptop Pro', 'WH-LAPTOP-001', 15, 850.00, 8.33, 12874.95),
('770e8400-e29b-41d4-a716-446655440001', 'Wireless Mouse', 'WH-MOUSE-002', 50, 25.00, 0.83, 1291.50),
('770e8400-e29b-41d4-a716-446655440001', 'Mechanical Keyboard', 'WH-KEYBOARD-006', 20, 80.00, 1.67, 1633.40);

-- PO 2: Office Furniture Ltd  
INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
('770e8400-e29b-41d4-a716-446655440002', 'Standing Desk', 'WH-DESK-003', 15, 280.00, 13.33, 4399.95),
('770e8400-e29b-41d4-a716-446655440002', 'Ergonomic Office Chair', 'WH-CHAIR-004', 25, 180.00, 3.20, 4579.80);

-- PO 3: Display Solutions Inc
INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
('770e8400-e29b-41d4-a716-446655440003', '27" 4K Monitor', 'WH-MONITOR-005', 30, 320.00, 8.33, 9849.90);

-- PO 4: Mobile Devices Corp
INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
('770e8400-e29b-41d4-a716-446655440004', 'Business Tablet', 'WH-TABLET-007', 30, 420.00, 11.67, 12949.80);

-- PO 5: Print Solutions Ltd
INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
('770e8400-e29b-41d4-a716-446655440005', 'Laser Printer', 'WH-PRINTER-008', 15, 230.00, 13.33, 3649.95);

-- Insert sample inventory transactions
INSERT INTO inventory_transactions (inventory_item_id, type, quantity, unit_cost, reference, notes) VALUES
-- Laptop transactions
('550e8400-e29b-41d4-a716-446655440001', 'purchase', 15, 858.33, '770e8400-e29b-41d4-a716-446655440001', 'Initial stock from PO-001'),
('550e8400-e29b-41d4-a716-446655440001', 'sale', -5, 899.99, 'SO-2024-001', 'Sold to corporate client'),

-- Mouse transactions  
('550e8400-e29b-41d4-a716-446655440002', 'purchase', 100, 25.83, '770e8400-e29b-41d4-a716-446655440001', 'Bulk purchase from TechSupply'),
('550e8400-e29b-41d4-a716-446655440002', 'sale', -30, 29.99, 'SO-2024-002', 'Office setup order'),

-- Desk transactions
('550e8400-e29b-41d4-a716-446655440003', 'purchase', 10, 293.33, '770e8400-e29b-41d4-a716-446655440002', 'Office furniture delivery'),
('550e8400-e29b-41d4-a716-446655440003', 'sale', -2, 299.99, 'SO-2024-003', 'Executive office setup'),

-- Chair transactions
('550e8400-e29b-41d4-a716-446655440004', 'purchase', 20, 183.20, '770e8400-e29b-41d4-a716-446655440002', 'Ergonomic chair order'),
('550e8400-e29b-41d4-a716-446655440004', 'sale', -8, 199.99, 'SO-2024-004', 'Department chair upgrade'),

-- Monitor transactions
('550e8400-e29b-41d4-a716-446655440005', 'purchase', 25, 328.33, '770e8400-e29b-41d4-a716-446655440003', 'Monitor upgrade project'),
('550e8400-e29b-41d4-a716-446655440005', 'sale', -7, 349.99, 'SO-2024-005', 'Development team monitors'),

-- Keyboard transactions
('550e8400-e29b-41d4-a716-446655440006', 'purchase', 50, 81.67, '770e8400-e29b-41d4-a716-446655440001', 'Mechanical keyboard order'),
('550e8400-e29b-41d4-a716-446655440006', 'sale', -5, 89.99, 'SO-2024-006', 'Premium setup order'),

-- Tablet transactions
('550e8400-e29b-41d4-a716-446655440007', 'purchase', 35, 431.67, '770e8400-e29b-41d4-a716-446655440004', 'Sales team tablet deployment'),
('550e8400-e29b-41d4-a716-446655440007', 'sale', -5, 449.99, 'SO-2024-007', 'Management tablets'),

-- Printer transactions
('550e8400-e29b-41d4-a716-446655440008', 'purchase', 8, 243.33, '770e8400-e29b-41d4-a716-446655440005', 'Printer replacement program'),
('550e8400-e29b-41d4-a716-446655440008', 'sale', -2, 249.99, 'SO-2024-008', 'Department printer setup'),

-- Cable transactions
('550e8400-e29b-41d4-a716-446655440009', 'purchase', 250, 12.99, 'PO-MISC-001', 'Cable inventory restock'),
('550e8400-e29b-41d4-a716-446655440009', 'sale', -50, 12.99, 'SO-2024-009', 'Bulk cable order'),

-- Lamp transactions
('550e8400-e29b-41d4-a716-446655440010', 'purchase', 40, 39.99, 'PO-MISC-002', 'Lighting upgrade project'),
('550e8400-e29b-41d4-a716-446655440010', 'sale', -5, 39.99, 'SO-2024-010', 'Executive office lighting');

-- Update purchase order totals to match items
UPDATE purchase_orders SET total_cost = (
    SELECT SUM(total_cost) FROM purchase_order_items WHERE purchase_order_id = purchase_orders.id
);

\echo 'Sample data inserted successfully!'
\echo 'Purchase Orders: 5'
\echo 'Purchase Order Items: 8' 
\echo 'Inventory Items: 10'
\echo 'Inventory Transactions: 20'
\echo 'Shopify Stores: 3'
