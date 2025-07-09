-- Seed sample data for Warehouse Management System

-- Insert sample products
INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES
('WH-001', 'Wireless Headphones', 'Premium wireless headphones with noise cancellation', 10, 100),
('SW-002', 'Smart Watch', 'Fitness tracking smart watch with heart rate monitor', 5, 50),
('PC-003', 'Phone Case', 'Protective phone case for various models', 20, 200),
('BS-004', 'Bluetooth Speaker', 'Portable bluetooth speaker with premium sound', 8, 80),
('CB-005', 'USB Cable', 'High-speed USB charging cable', 50, 500),
('TB-006', 'Tablet', '10-inch tablet with high-resolution display', 3, 30),
('KD-007', 'Keyboard', 'Mechanical keyboard with RGB lighting', 10, 100);

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Tech Supplies Co.', '2024-01-15', 250.00, 'Delivered', 'Initial stock order'),
('PO-2024-002', 'Electronics Hub', '2024-01-18', 150.00, 'In Transit', 'Restocking popular items'),
('PO-2024-003', 'Global Gadgets', '2024-01-20', 200.00, 'Pending', 'New product line introduction');

-- Insert sample PO items
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
-- PO-2024-001 items
(1, 'WH-001', 'Wireless Headphones', 50, 75.00),
(1, 'SW-002', 'Smart Watch', 25, 120.00),
(1, 'PC-003', 'Phone Case', 100, 15.00),
-- PO-2024-002 items
(2, 'BS-004', 'Bluetooth Speaker', 30, 85.00),
(2, 'CB-005', 'USB Cable', 200, 8.50),
-- PO-2024-003 items
(3, 'TB-006', 'Tablet', 15, 280.00),
(3, 'KD-007', 'Keyboard', 40, 45.00);

-- Insert sample inventory (for delivered PO only)
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
-- From PO-2024-001 (Delivered)
(1, 1, 45, 76.67, '2024-01-15'), -- WH-001: 50 ordered, 5 sold
(2, 2, 12, 123.33, '2024-01-15'), -- SW-002: 25 ordered, 13 sold
(3, 3, 156, 16.67, '2024-01-15'); -- PC-003: 100 ordered, but some manual additions

-- Insert sample Shopify stores
INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES
('Main Store', 'main-store.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store1', 'Active', NOW() - INTERVAL '2 hours'),
('EU Store', 'eu-store.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store2', 'Active', NOW() - INTERVAL '1 hour'),
('Test Store', 'test-store.myshopify.com', 'shpat_***************', NULL, 'Error', NOW() - INTERVAL '2 days');

-- Insert sample Shopify orders
INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, tax_amount, shipping_address) VALUES
(1, '5234567890123', '#1001', 'John Doe', 'john@example.com', '2024-01-20 14:30:00', 'Fulfilled', 299.99, 9.99, 24.00, '123 Main St, New York, NY 10001'),
(2, '5234567890124', '#1002', 'Jane Smith', 'jane@example.com', '2024-01-20 15:45:00', 'Processing', 189.99, 12.99, 15.20, '456 Oak Ave, Los Angeles, CA 90210'),
(1, '5234567890125', '#1003', 'Bob Johnson', 'bob@example.com', '2024-01-19 16:20:00', 'Shipped', 45.99, 7.99, 3.68, '789 Pine St, Chicago, IL 60601'),
(1, '5234567890126', '#1004', 'Alice Brown', 'alice@example.com', '2024-01-21 10:15:00', 'Fulfilled', 425.98, 15.99, 34.08, '321 Elm St, Miami, FL 33101'),
(2, '5234567890127', '#1005', 'Charlie Wilson', 'charlie@example.com', '2024-01-21 11:30:00', 'Processing', 85.00, 8.99, 6.80, '654 Maple Ave, Seattle, WA 98101');

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
(5, 'BS-004', 'Bluetooth Speaker', 1, 85.00);

-- Insert sample sales fulfillment (FIFO cost tracking)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
-- Order #1001 - WH-001 (2 units)
(1, 1, 2, 76.67),
-- Order #1002 - SW-002 (1 unit)
(2, 2, 1, 123.33),
-- Order #1003 - PC-003 (3 units)
(3, 3, 3, 16.67),
-- Order #1004 - WH-001 (1 unit), SW-002 (2 units)
(4, 1, 1, 76.67),
(5, 2, 2, 123.33),
-- Order #1005 - BS-004 (1 unit) - Note: This would be from incoming inventory
(6, 1, 1, 85.00); -- Using placeholder inventory record

-- Update inventory quantities after sales
UPDATE inventory SET quantity_available = 42 WHERE id = 1; -- WH-001: 45 - 3 sold
UPDATE inventory SET quantity_available = 9 WHERE id = 2;  -- SW-002: 12 - 3 sold
UPDATE inventory SET quantity_available = 153 WHERE id = 3; -- PC-003: 156 - 3 sold

-- Add some manual inventory adjustments
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
(4, NULL, 8, 87.00, '2024-01-10'), -- BS-004: Manual entry
(5, NULL, 180, 9.00, '2024-01-12'); -- CB-005: Manual entry

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
