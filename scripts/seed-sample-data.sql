-- Seed sample data for Warehouse Management System

-- Clear existing data
TRUNCATE TABLE sales_fulfillment, shopify_order_items, shopify_orders, inventory_transactions, inventory_items, purchase_order_items, purchase_orders, shopify_stores, products CASCADE;

-- Insert sample purchase orders
INSERT INTO purchase_orders (id, supplier, order_date, expected_delivery, status, total_cost, notes) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'ABC Electronics Ltd', '2024-01-15', '2024-01-25', 'delivered', 15750.00, 'Bulk order for Q1 inventory'),
('550e8400-e29b-41d4-a716-446655440002', 'TechSupply Co', '2024-01-20', '2024-02-01', 'shipped', 8920.50, 'Express delivery requested'),
('550e8400-e29b-41d4-a716-446655440003', 'Global Components', '2024-01-25', '2024-02-10', 'confirmed', 12340.75, 'Standard shipping'),
('550e8400-e29b-41d4-a716-446655440004', 'Premium Parts Inc', '2024-02-01', '2024-02-15', 'pending', 6789.25, 'Awaiting supplier confirmation'),
('550e8400-e29b-41d4-a716-446655440005', 'Reliable Supplies', '2024-02-05', '2024-02-20', 'pending', 9876.00, 'Monthly recurring order');

-- Insert sample purchase order items
INSERT INTO purchase_order_items (id, purchase_order_id, product_name, sku, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
-- PO 1 items
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Wireless Mouse Pro', 'WMP-001', 100, 25.00, 2.50, 2750.00),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'USB-C Cable 2m', 'USC-002', 200, 12.00, 1.00, 2600.00),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Bluetooth Headphones', 'BTH-003', 75, 45.00, 5.00, 3750.00),
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Phone Stand Adjustable', 'PSA-004', 150, 18.00, 2.00, 3000.00),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Portable Charger 10000mAh', 'PCH-005', 80, 35.00, 3.00, 3040.00),

-- PO 2 items
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', 'Laptop Stand Aluminum', 'LSA-006', 60, 55.00, 4.50, 3570.00),
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440002', 'Wireless Keyboard', 'WKB-007', 90, 32.00, 3.00, 3150.00),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', 'HD Webcam 1080p', 'HWC-008', 45, 28.00, 2.50, 1372.50),
('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440002', 'USB Hub 4-Port', 'UH4-009', 120, 15.00, 1.00, 1920.00),

-- PO 3 items
('660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440003', 'Gaming Mouse RGB', 'GMR-010', 85, 42.00, 3.50, 3867.50),
('660e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440003', 'Mechanical Keyboard', 'MKB-011', 70, 65.00, 5.00, 4900.00),
('660e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440003', 'Monitor Stand Dual', 'MSD-012', 40, 75.00, 7.50, 3300.00),
('660e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440003', 'Cable Management Kit', 'CMK-013', 100, 8.00, 0.50, 850.00),

-- PO 4 items
('660e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440004', 'Wireless Earbuds Pro', 'WEP-014', 95, 38.00, 4.00, 3990.00),
('660e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440004', 'Phone Case Premium', 'PCP-015', 180, 12.50, 1.50, 2520.00),
('660e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440004', 'Screen Protector Glass', 'SPG-016', 250, 6.00, 0.50, 1625.00),

-- PO 5 items
('660e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440005', 'Tablet Stand Foldable', 'TSF-017', 110, 22.00, 2.50, 2695.00),
('660e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440005', 'Power Bank 20000mAh', 'PB2-018', 65, 48.00, 4.00, 3380.00),
('660e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440005', 'Car Mount Magnetic', 'CMM-019', 140, 16.00, 1.50, 2450.00),
('660e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440005', 'Bluetooth Speaker', 'BTS-020', 55, 28.00, 3.00, 1705.00);

-- Insert sample inventory items
INSERT INTO inventory_items (id, sku, product_name, category, current_stock, reserved_stock, reorder_point, reorder_quantity, average_cost, location, supplier) VALUES
('770e8400-e29b-41d4-a716-446655440001', 'WMP-001', 'Wireless Mouse Pro', 'Computer Accessories', 85, 15, 20, 100, 27.50, 'A1-B2', 'ABC Electronics Ltd'),
('770e8400-e29b-41d4-a716-446655440002', 'USC-002', 'USB-C Cable 2m', 'Cables & Adapters', 180, 20, 50, 200, 13.00, 'A2-C1', 'ABC Electronics Ltd'),
('770e8400-e29b-41d4-a716-446655440003', 'BTH-003', 'Bluetooth Headphones', 'Audio', 65, 10, 15, 75, 50.00, 'B1-A3', 'ABC Electronics Ltd'),
('770e8400-e29b-41d4-a716-446655440004', 'PSA-004', 'Phone Stand Adjustable', 'Phone Accessories', 135, 25, 30, 150, 20.00, 'C1-B2', 'ABC Electronics Ltd'),
('770e8400-e29b-41d4-a716-446655440005', 'PCH-005', 'Portable Charger 10000mAh', 'Power & Charging', 70, 10, 20, 80, 38.00, 'D1-A1', 'ABC Electronics Ltd'),
('770e8400-e29b-41d4-a716-446655440006', 'LSA-006', 'Laptop Stand Aluminum', 'Computer Accessories', 55, 5, 15, 60, 59.50, 'A3-C2', 'TechSupply Co'),
('770e8400-e29b-41d4-a716-446655440007', 'WKB-007', 'Wireless Keyboard', 'Computer Accessories', 80, 10, 25, 90, 35.00, 'B2-D1', 'TechSupply Co'),
('770e8400-e29b-41d4-a716-446655440008', 'HWC-008', 'HD Webcam 1080p', 'Computer Accessories', 40, 5, 10, 45, 30.50, 'C2-A2', 'TechSupply Co'),
('770e8400-e29b-41d4-a716-446655440009', 'UH4-009', 'USB Hub 4-Port', 'Computer Accessories', 110, 10, 30, 120, 16.00, 'D2-B3', 'TechSupply Co'),
('770e8400-e29b-41d4-a716-446655440010', 'GMR-010', 'Gaming Mouse RGB', 'Gaming', 75, 10, 20, 85, 45.50, 'A1-D3', 'Global Components'),
('770e8400-e29b-41d4-a716-446655440011', 'MKB-011', 'Mechanical Keyboard', 'Gaming', 60, 10, 15, 70, 70.00, 'B3-C1', 'Global Components'),
('770e8400-e29b-41d4-a716-446655440012', 'MSD-012', 'Monitor Stand Dual', 'Computer Accessories', 35, 5, 10, 40, 82.50, 'C3-A1', 'Global Components'),
('770e8400-e29b-41d4-a716-446655440013', 'CMK-013', 'Cable Management Kit', 'Organization', 90, 10, 25, 100, 8.50, 'D3-B1', 'Global Components'),
('770e8400-e29b-41d4-a716-446655440014', 'WEP-014', 'Wireless Earbuds Pro', 'Audio', 0, 0, 20, 95, 42.00, 'A2-D2', 'Premium Parts Inc'),
('770e8400-e29b-41d4-a716-446655440015', 'PCP-015', 'Phone Case Premium', 'Phone Accessories', 0, 0, 50, 180, 14.00, 'B1-C3', 'Premium Parts Inc'),
('770e8400-e29b-41d4-a716-446655440016', 'SPG-016', 'Screen Protector Glass', 'Phone Accessories', 0, 0, 75, 250, 6.50, 'C1-D3', 'Premium Parts Inc'),
('770e8400-e29b-41d4-a716-446655440017', 'TSF-017', 'Tablet Stand Foldable', 'Tablet Accessories', 0, 0, 30, 110, 24.50, 'D1-A3', 'Reliable Supplies'),
('770e8400-e29b-41d4-a716-446655440018', 'PB2-018', 'Power Bank 20000mAh', 'Power & Charging', 0, 0, 15, 65, 52.00, 'A3-B1', 'Reliable Supplies'),
('770e8400-e29b-41d4-a716-446655440019', 'CMM-019', 'Car Mount Magnetic', 'Car Accessories', 0, 0, 40, 140, 17.50, 'B2-C3', 'Reliable Supplies'),
('770e8400-e29b-41d4-a716-446655440020', 'BTS-020', 'Bluetooth Speaker', 'Audio', 0, 0, 15, 55, 31.00, 'C2-D1', 'Reliable Supplies');

-- Insert sample Shopify stores
INSERT INTO shopify_stores (id, name, domain, access_token, is_active, last_sync) VALUES
('880e8400-e29b-41d4-a716-446655440001', 'TechGadgets Pro', 'techgadgets-pro.myshopify.com', 'shpat_1234567890abcdef1234567890abcdef', true, '2024-02-07 10:30:00'),
('880e8400-e29b-41d4-a716-446655440002', 'Mobile Accessories Hub', 'mobile-accessories-hub.myshopify.com', 'shpat_abcdef1234567890abcdef1234567890', true, '2024-02-07 09:15:00'),
('880e8400-e29b-41d4-a716-446655440003', 'Gaming Central', 'gaming-central.myshopify.com', 'shpat_567890abcdef1234567890abcdef1234', false, '2024-02-05 14:20:00'),
('880e8400-e29b-41d4-a716-446655440004', 'Office Solutions', 'office-solutions.myshopify.com', 'shpat_def1234567890abcdef1234567890abc', true, '2024-02-07 11:45:00');

-- Insert sample inventory transactions
INSERT INTO inventory_transactions (id, inventory_item_id, type, quantity, unit_cost, reference, notes) VALUES
-- Stock received from PO deliveries
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440001', 'purchase', 100, 27.50, 'PO-001', 'Initial stock from ABC Electronics'),
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440002', 'purchase', 200, 13.00, 'PO-001', 'Initial stock from ABC Electronics'),
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003', 'purchase', 75, 50.00, 'PO-001', 'Initial stock from ABC Electronics'),
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440004', 'purchase', 150, 20.00, 'PO-001', 'Initial stock from ABC Electronics'),
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005', 'purchase', 80, 38.00, 'PO-001', 'Initial stock from ABC Electronics'),

-- Sales transactions
('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440001', 'sale', -15, 27.50, 'SO-001', 'Sold to TechGadgets Pro'),
('990e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440002', 'sale', -20, 13.00, 'SO-002', 'Sold to Mobile Accessories Hub'),
('990e8400-e29b-41d4-a716-446655440008', '770e8400-e29b-41d4-a716-446655440003', 'sale', -10, 50.00, 'SO-003', 'Sold to Gaming Central'),
('990e8400-e29b-41d4-a716-446655440009', '770e8400-e29b-41d4-a716-446655440004', 'sale', -15, 20.00, 'SO-004', 'Sold to Office Solutions'),
('990e8400-e29b-41d4-a716-446655440010', '770e8400-e29b-41d4-a716-446655440005', 'sale', -10, 38.00, 'SO-005', 'Sold to TechGadgets Pro');

-- Show seeding summary
SELECT 'Sample data inserted successfully!' as status;

SELECT 
  'Purchase Orders' as table_name,
  COUNT(*) as record_count
FROM purchase_orders
UNION ALL
SELECT 
  'Purchase Order Items' as table_name,
  COUNT(*) as record_count
FROM purchase_order_items
UNION ALL
SELECT 
  'Inventory Items' as table_name,
  COUNT(*) as record_count
FROM inventory_items
UNION ALL
SELECT 
  'Shopify Stores' as table_name,
  COUNT(*) as record_count
FROM shopify_stores
UNION ALL
SELECT 
  'Inventory Transactions' as table_name,
  COUNT(*) as record_count
FROM inventory_transactions
ORDER BY table_name;
