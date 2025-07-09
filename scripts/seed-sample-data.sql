-- Seed sample data for Warehouse Management System
-- This will populate the postgres database with test data

-- Connect to the postgres database
\c postgres;

-- Clear existing data (in correct order due to foreign key constraints)
TRUNCATE TABLE purchase_orders, inventory_items, shopify_stores RESTART IDENTITY CASCADE;

-- Reset sequences
ALTER SEQUENCE purchase_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE inventory_items_id_seq RESTART WITH 1;
ALTER SEQUENCE shopify_stores_id_seq RESTART WITH 1;
ALTER SEQUENCE shopify_orders_id_seq RESTART WITH 1;
ALTER SEQUENCE purchase_order_items_id_seq RESTART WITH 1;

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, order_date, expected_delivery, status, total_amount, notes) VALUES
('PO-2024-001', 'ABC Electronics', '2024-01-15', '2024-01-25', 'pending', 1250.00, 'Urgent order for Q1 inventory'),
('PO-2024-002', 'Global Supplies Inc', '2024-01-18', '2024-02-01', 'approved', 850.50, 'Regular monthly order'),
('PO-2024-003', 'Tech Components Ltd', '2024-01-20', '2024-01-30', 'received', 2100.75, 'Special components for new product line'),
('PO-2024-004', 'Office Depot', '2024-01-22', '2024-02-05', 'pending', 450.25, 'Office supplies and stationery'),
('PO-2024-005', 'Industrial Parts Co', '2024-01-25', '2024-02-10', 'cancelled', 0.00, 'Order cancelled due to specification changes');

-- Insert sample inventory items
INSERT INTO inventory_items (sku, name, description, category, quantity, unit_price, reorder_level, supplier) VALUES
('SKU-001', 'Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 'Electronics', 150, 25.99, 20, 'ABC Electronics'),
('SKU-002', 'USB Cable Type-C', '1 meter USB-C charging cable', 'Cables', 200, 12.50, 50, 'Global Supplies Inc'),
('SKU-003', 'Laptop Stand', 'Adjustable aluminum laptop stand', 'Accessories', 75, 45.00, 10, 'Tech Components Ltd'),
('SKU-004', 'Bluetooth Headphones', 'Noise-cancelling over-ear headphones', 'Audio', 50, 89.99, 15, 'ABC Electronics'),
('SKU-005', 'Phone Case iPhone', 'Protective case for iPhone 15', 'Accessories', 120, 19.99, 25, 'Global Supplies Inc'),
('SKU-006', 'Portable Charger', '10000mAh power bank with fast charging', 'Electronics', 80, 35.50, 20, 'Tech Components Ltd'),
('SKU-007', 'Desk Organizer', 'Bamboo desk organizer with compartments', 'Office', 60, 28.75, 15, 'Office Depot'),
('SKU-008', 'LED Desk Lamp', 'Adjustable LED desk lamp with USB charging', 'Lighting', 40, 55.00, 10, 'ABC Electronics');

-- Insert sample Shopify stores
INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active) VALUES
('TechGadgets Pro', 'techgadgets-pro.myshopify.com', 'shpat_dummy_token_1234567890abcdef', true),
('Electronics World', 'electronics-world.myshopify.com', 'shpat_dummy_token_abcdef1234567890', true),
('Mobile Accessories Hub', 'mobile-accessories.myshopify.com', 'shpat_dummy_token_fedcba0987654321', false),
('Office Solutions Store', 'office-solutions.myshopify.com', 'shpat_dummy_token_1357924680acegik', true);

-- Display summary of inserted data
SELECT 'Sample data inserted successfully!' as message;
SELECT 'Purchase Orders: ' || COUNT(*) as purchase_orders_count FROM purchase_orders;
SELECT 'Inventory Items: ' || COUNT(*) as inventory_items_count FROM inventory_items;
SELECT 'Shopify Stores: ' || COUNT(*) as shopify_stores_count FROM shopify_stores;

-- All sample data is inserted via the TypeScript seeding script
-- which provides better error handling and data validation

-- Run: npm run db:seed
-- Or: npm run db:reset (creates tables and seeds data)
