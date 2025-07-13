-- Insert sample returns
INSERT INTO returns (return_number, customer_name, customer_email, order_number, return_date, status, notes) VALUES
('RET-20240120-123456789', 'John Doe', 'john@example.com', '#1001', '2024-01-20', 'Pending', 'Customer reported defective item'),
('RET-20240121-234567890', 'Jane Smith', 'jane@example.com', '#1002', '2024-01-21', 'Accepted', 'Wrong size ordered'),
('RET-20240122-345678901', 'Bob Johnson', 'bob@example.com', '#1003', '2024-01-22', 'Processing', 'Item damaged during shipping');

-- Insert sample return items
INSERT INTO return_items (return_id, sku, product_name, quantity, condition, reason) VALUES
((SELECT id FROM returns WHERE return_number = 'RET-20240120-123456789'), 'WH-001', 'Wireless Headphones', 1, 'Defective', 'Defective'),
((SELECT id FROM returns WHERE return_number = 'RET-20240121-234567890'), 'SW-002', 'Smart Watch', 1, 'Good', 'Wrong Item'),
((SELECT id FROM returns WHERE return_number = 'RET-20240122-345678901'), 'PC-003', 'Phone Case', 2, 'Damaged', 'Damaged in Transit');

-- Add returned inventory for accepted returns
INSERT INTO inventory (sku, product_name, po_id, quantity_available, unit_cost_with_delivery, purchase_date, return_id) VALUES
('SW-002', 'Smart Watch', NULL, 1, 0, '2024-01-21', (SELECT id FROM returns WHERE return_number = 'RET-20240121-234567890'));
