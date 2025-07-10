-- Insert sample products
INSERT INTO products (sku, product_name, description, min_stock, max_stock) VALUES
('WH-001', 'Wireless Headphones', 'Premium wireless headphones with noise cancellation', 20, 100),
('SW-002', 'Smart Watch', 'Fitness tracking smart watch', 15, 50),
('PC-003', 'Phone Case', 'Protective phone case for various models', 50, 200),
('BS-004', 'Bluetooth Speaker', 'Portable bluetooth speaker', 10, 40),
('CB-005', 'USB Cable', 'High-speed USB charging cable', 100, 500)
ON CONFLICT (sku) DO NOTHING;

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status) VALUES
('PO-2024-001', 'Tech Supplies Co.', '2024-01-15', 250.00, 'Delivered'),
('PO-2024-002', 'Electronics Hub', '2024-01-18', 150.00, 'In Transit'),
('PO-2024-003', 'Global Gadgets', '2024-01-20', 200.00, 'Pending')
ON CONFLICT (po_number) DO NOTHING;

-- Get PO IDs for reference
DO $$
DECLARE
    po1_id UUID;
    po2_id UUID;
    po3_id UUID;
BEGIN
    SELECT id INTO po1_id FROM purchase_orders WHERE po_number = 'PO-2024-001';
    SELECT id INTO po2_id FROM purchase_orders WHERE po_number = 'PO-2024-002';
    SELECT id INTO po3_id FROM purchase_orders WHERE po_number = 'PO-2024-003';

    -- Insert PO items for PO-2024-001
    INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
    (po1_id, 'WH-001', 'Wireless Headphones', 50, 75.00, 1.43, 3821.50),
    (po1_id, 'SW-002', 'Smart Watch', 25, 120.00, 1.43, 3035.75),
    (po1_id, 'PC-003', 'Phone Case', 100, 15.00, 1.43, 1643.00);

    -- Insert PO items for PO-2024-002
    INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
    (po2_id, 'BS-004', 'Bluetooth Speaker', 30, 85.00, 0.65, 2569.50),
    (po2_id, 'CB-005', 'USB Cable', 200, 8.50, 0.65, 1830.00);

    -- Insert PO items for PO-2024-003
    INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost, delivery_cost_per_unit, total_cost) VALUES
    (po3_id, 'WH-001', 'Wireless Headphones', 30, 76.00, 1.54, 2326.20),
    (po3_id, 'SW-002', 'Smart Watch', 20, 118.00, 1.54, 2390.80);

    -- Insert inventory records for delivered PO
    INSERT INTO inventory (sku, product_name, po_id, quantity_available, unit_cost_with_delivery, purchase_date) VALUES
    ('WH-001', 'Wireless Headphones', po1_id, 45, 76.43, '2024-01-15'),
    ('SW-002', 'Smart Watch', po1_id, 12, 121.43, '2024-01-15'),
    ('PC-003', 'Phone Case', po1_id, 156, 16.43, '2024-01-15');

END $$;
