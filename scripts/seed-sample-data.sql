-- Seed sample data for Warehouse Management System
-- This will populate the postgres database with test data

-- Clear existing data (in correct order due to foreign key constraints)
DELETE FROM purchase_order_items;
DELETE FROM purchase_orders;
DELETE FROM shopify_orders;
DELETE FROM shopify_stores;
DELETE FROM inventory;

-- Reset sequences
SELECT setval(pg_get_serial_sequence('purchase_orders', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('purchase_order_items', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('inventory', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('shopify_stores', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('shopify_orders', 'id'), 1, false);

-- Insert sample inventory items
INSERT INTO inventory (sku, product_name, description, category, quantity_on_hand, quantity_reserved, reorder_point, unit_cost, selling_price, location) VALUES
('SKU-001', 'Wireless Bluetooth Headphones', 'Premium noise-cancelling wireless headphones', 'Electronics', 150, 25, 20, 45.00, 89.99, 'A1-B2'),
('SKU-002', 'Organic Cotton T-Shirt', 'Comfortable organic cotton t-shirt in various colors', 'Apparel', 300, 50, 30, 8.50, 24.99, 'B2-C3'),
('SKU-003', 'Stainless Steel Water Bottle', 'Insulated stainless steel water bottle 32oz', 'Home & Garden', 200, 15, 25, 12.00, 29.99, 'C3-D4'),
('SKU-004', 'LED Desk Lamp', 'Adjustable LED desk lamp with USB charging port', 'Electronics', 75, 10, 15, 22.50, 49.99, 'A2-B3'),
('SKU-005', 'Yoga Mat Premium', 'Non-slip premium yoga mat with carrying strap', 'Sports & Fitness', 120, 20, 20, 15.00, 39.99, 'D4-E5'),
('SKU-006', 'Coffee Mug Set', 'Set of 4 ceramic coffee mugs with gift box', 'Home & Garden', 80, 5, 10, 18.00, 44.99, 'B3-C4'),
('SKU-007', 'Wireless Phone Charger', 'Fast wireless charging pad for smartphones', 'Electronics', 100, 15, 20, 16.50, 34.99, 'A3-B4'),
('SKU-008', 'Running Shoes', 'Lightweight running shoes with breathable mesh', 'Apparel', 60, 8, 12, 35.00, 79.99, 'E5-F6'),
('SKU-009', 'Bluetooth Speaker', 'Portable waterproof bluetooth speaker', 'Electronics', 90, 12, 18, 28.00, 59.99, 'A4-B5'),
('SKU-010', 'Kitchen Knife Set', 'Professional 6-piece kitchen knife set with block', 'Home & Garden', 45, 3, 8, 42.00, 89.99, 'C4-D5');

-- Insert sample Shopify stores
INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active, last_sync) VALUES
('TechGadgets Pro', 'techgadgets-pro.myshopify.com', 'shpat_example_token_1', true, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('Fashion Forward', 'fashion-forward.myshopify.com', 'shpat_example_token_2', true, CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('Home Essentials', 'home-essentials.myshopify.com', 'shpat_example_token_3', true, CURRENT_TIMESTAMP - INTERVAL '30 minutes'),
('Sports Central', 'sports-central.myshopify.com', 'shpat_example_token_4', false, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, order_date, expected_delivery, status, notes) VALUES
('PO-2024-001', 'Electronics Wholesale Inc.', '2024-01-15', '2024-01-25', 'delivered', 'First quarter electronics restock'),
('PO-2024-002', 'Apparel Distributors LLC', '2024-01-18', '2024-01-28', 'pending', 'Spring collection pre-order'),
('PO-2024-003', 'Home & Garden Supplies', '2024-01-20', '2024-01-30', 'shipped', 'Kitchen and bathroom essentials'),
('PO-2024-004', 'Tech Innovations Corp', '2024-01-22', '2024-02-01', 'pending', 'Latest wireless charging technology'),
('PO-2024-005', 'Fitness Equipment Pro', '2024-01-25', '2024-02-05', 'confirmed', 'Yoga and fitness accessories');

-- Insert sample purchase order items
INSERT INTO purchase_order_items (purchase_order_id, product_name, sku, quantity, unit_cost) VALUES
-- PO-2024-001 items
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001'), 'Wireless Bluetooth Headphones', 'SKU-001', 50, 42.00),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001'), 'LED Desk Lamp', 'SKU-004', 25, 20.00),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-001'), 'Wireless Phone Charger', 'SKU-007', 30, 15.00),

-- PO-2024-002 items
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-002'), 'Organic Cotton T-Shirt', 'SKU-002', 100, 7.50),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-002'), 'Running Shoes', 'SKU-008', 20, 32.00),

-- PO-2024-003 items
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-003'), 'Stainless Steel Water Bottle', 'SKU-003', 75, 10.50),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-003'), 'Coffee Mug Set', 'SKU-006', 40, 16.00),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-003'), 'Kitchen Knife Set', 'SKU-010', 15, 38.00),

-- PO-2024-004 items
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-004'), 'Wireless Phone Charger', 'SKU-007', 50, 14.50),
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-004'), 'Bluetooth Speaker', 'SKU-009', 35, 25.00),

-- PO-2024-005 items
((SELECT id FROM purchase_orders WHERE po_number = 'PO-2024-005'), 'Yoga Mat Premium', 'SKU-005', 60, 13.50);

-- Insert sample Shopify orders
INSERT INTO shopify_orders (
    shopify_order_id, 
    store_id, 
    order_number, 
    customer_email, 
    customer_name, 
    total_price, 
    currency, 
    fulfillment_status, 
    financial_status, 
    order_date,
    shipping_address,
    line_items
) VALUES
(1001, (SELECT id FROM shopify_stores WHERE store_name = 'TechGadgets Pro'), '#TG-1001', 'john.doe@email.com', 'John Doe', 149.98, 'USD', 'fulfilled', 'paid', '2024-01-20 10:30:00',
 '{"first_name": "John", "last_name": "Doe", "address1": "123 Main St", "city": "New York", "province": "NY", "zip": "10001", "country": "United States"}',
 '[{"sku": "SKU-001", "title": "Wireless Bluetooth Headphones", "quantity": 1, "price": "89.99"}, {"sku": "SKU-004", "title": "LED Desk Lamp", "quantity": 1, "price": "49.99"}]'),

(1002, (SELECT id FROM shopify_stores WHERE store_name = 'Fashion Forward'), '#FF-1002', 'jane.smith@email.com', 'Jane Smith', 104.97, 'USD', 'pending', 'paid', '2024-01-21 14:15:00',
 '{"first_name": "Jane", "last_name": "Smith", "address1": "456 Oak Ave", "city": "Los Angeles", "province": "CA", "zip": "90210", "country": "United States"}',
 '[{"sku": "SKU-002", "title": "Organic Cotton T-Shirt", "quantity": 3, "price": "24.99"}, {"sku": "SKU-008", "title": "Running Shoes", "quantity": 1, "price": "79.99"}]'),

(1003, (SELECT id FROM shopify_stores WHERE store_name = 'Home Essentials'), '#HE-1003', 'bob.wilson@email.com', 'Bob Wilson', 74.98, 'USD', 'fulfilled', 'paid', '2024-01-22 09:45:00',
 '{"first_name": "Bob", "last_name": "Wilson", "address1": "789 Pine St", "city": "Chicago", "province": "IL", "zip": "60601", "country": "United States"}',
 '[{"sku": "SKU-003", "title": "Stainless Steel Water Bottle", "quantity": 1, "price": "29.99"}, {"sku": "SKU-006", "title": "Coffee Mug Set", "quantity": 1, "price": "44.99"}]'),

(1004, (SELECT id FROM shopify_stores WHERE store_name = 'TechGadgets Pro'), '#TG-1004', 'alice.brown@email.com', 'Alice Brown', 94.98, 'USD', 'pending', 'pending', '2024-01-23 16:20:00',
 '{"first_name": "Alice", "last_name": "Brown", "address1": "321 Elm St", "city": "Miami", "province": "FL", "zip": "33101", "country": "United States"}',
 '[{"sku": "SKU-007", "title": "Wireless Phone Charger", "quantity": 1, "price": "34.99"}, {"sku": "SKU-009", "title": "Bluetooth Speaker", "quantity": 1, "price": "59.99"}]'),

(1005, (SELECT id FROM shopify_stores WHERE store_name = 'Sports Central'), '#SC-1005', 'mike.davis@email.com', 'Mike Davis', 39.99, 'USD', 'fulfilled', 'paid', '2024-01-24 11:10:00',
 '{"first_name": "Mike", "last_name": "Davis", "address1": "654 Maple Dr", "city": "Denver", "province": "CO", "zip": "80201", "country": "United States"}',
 '[{"sku": "SKU-005", "title": "Yoga Mat Premium", "quantity": 1, "price": "39.99"}]');

-- Verify data insertion
SELECT 'Sample data inserted successfully!' as status;
SELECT 'Inventory items: ' || COUNT(*) as inventory_count FROM inventory;
SELECT 'Purchase orders: ' || COUNT(*) as po_count FROM purchase_orders;
SELECT 'Purchase order items: ' || COUNT(*) as poi_count FROM purchase_order_items;
SELECT 'Shopify stores: ' || COUNT(*) as stores_count FROM shopify_stores;
SELECT 'Shopify orders: ' || COUNT(*) as orders_count FROM shopify_orders;
