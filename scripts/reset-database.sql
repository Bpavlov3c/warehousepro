-- Complete database reset script for Warehouse Management System
-- This script will drop and recreate everything from scratch

-- Drop existing tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS sales_fulfillment CASCADE;
DROP TABLE IF EXISTS shopify_order_items CASCADE;
DROP TABLE IF EXISTS shopify_orders CASCADE;
DROP TABLE IF EXISTS shopify_stores CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS po_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS profit_analysis CASCADE;
DROP VIEW IF EXISTS product_inventory_summary CASCADE;

-- Create Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Purchase Orders table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    po_date DATE NOT NULL,
    delivery_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Purchase Order Items table
CREATE TABLE po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Inventory table (FIFO tracking)
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES po_items(id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    purchase_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Shopify Stores table
CREATE TABLE shopify_stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    shopify_domain VARCHAR(255) NOT NULL,
    access_token VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'Active',
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Shopify Orders table
CREATE TABLE shopify_orders (
    id SERIAL PRIMARY KEY,
    store_id INTEGER REFERENCES shopify_stores(id) ON DELETE CASCADE,
    shopify_order_id VARCHAR(100) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    order_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, shopify_order_id)
);

-- Create Shopify Order Items table
CREATE TABLE shopify_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES shopify_orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Sales Fulfillment table (FIFO cost tracking)
CREATE TABLE sales_fulfillment (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER REFERENCES shopify_order_items(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    quantity_used INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_po_items_sku ON po_items(sku);
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_po_item_id ON inventory(po_item_id);
CREATE INDEX idx_shopify_orders_date ON shopify_orders(order_date);
CREATE INDEX idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);
CREATE INDEX idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX idx_sales_fulfillment_order_item ON sales_fulfillment(order_item_id);
CREATE INDEX idx_sales_fulfillment_inventory ON sales_fulfillment(inventory_id);

-- Create views for reporting
CREATE VIEW product_inventory_summary AS
SELECT 
    p.id,
    p.sku,
    p.name,
    p.description,
    COALESCE(SUM(i.quantity_available), 0) as current_stock,
    COALESCE(AVG(i.unit_cost), 0) as avg_cost,
    COALESCE(SUM(i.quantity_available * i.unit_cost), 0) as total_value,
    p.min_stock,
    p.max_stock,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.sku, p.name, p.description, p.min_stock, p.max_stock, p.created_at, p.updated_at;

CREATE VIEW profit_analysis AS
SELECT 
    soi.sku,
    soi.product_name,
    SUM(soi.quantity) as total_sold,
    AVG(soi.unit_price) as avg_sale_price,
    SUM(soi.total_price) as total_revenue,
    COALESCE(AVG(sf.unit_cost), 0) as avg_cost,
    COALESCE(SUM(sf.quantity_used * sf.unit_cost), 0) as total_cost,
    SUM(soi.total_price) - COALESCE(SUM(sf.quantity_used * sf.unit_cost), 0) as gross_profit
FROM shopify_order_items soi
LEFT JOIN sales_fulfillment sf ON soi.id = sf.order_item_id
GROUP BY soi.sku, soi.product_name;

-- Insert sample data

-- Sample products
INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES
('WH-001', 'Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 10, 100),
('SW-002', 'Smart Watch', 'Fitness tracking smartwatch with heart rate monitor', 5, 50),
('PC-003', 'Phone Case', 'Protective case for smartphones - universal fit', 25, 200),
('BS-004', 'Bluetooth Speaker', 'Portable wireless speaker with premium sound', 8, 80),
('CB-005', 'USB Cable', 'High-speed USB-C charging cable - 6ft', 50, 500),
('TB-006', 'Tablet Stand', 'Adjustable tablet stand for desk use', 15, 100),
('KD-007', 'Wireless Keyboard', 'Bluetooth keyboard with backlight', 10, 60);

-- Sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Tech Supplies Co.', '2024-01-15', 150.00, 'Delivered', 'Initial stock order for Q1'),
('PO-2024-002', 'Electronics Hub', '2024-01-18', 75.00, 'Delivered', 'Restocking popular items'),
('PO-2024-003', 'Global Gadgets', '2024-01-22', 200.00, 'Pending', 'Large order for new product line'),
('PO-2024-004', 'Premium Tech', '2024-01-25', 125.00, 'Approved', 'Rush order for high-demand items'),
('PO-2024-005', 'Wholesale Electronics', '2024-01-28', 100.00, 'Pending', 'Monthly restock order');

-- Sample PO items
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
-- PO-2024-001 items
(1, 'WH-001', 'Wireless Headphones', 50, 75.00),
(1, 'SW-002', 'Smart Watch', 25, 120.00),
(1, 'PC-003', 'Phone Case', 100, 15.00),
-- PO-2024-002 items
(2, 'BS-004', 'Bluetooth Speaker', 30, 85.00),
(2, 'CB-005', 'USB Cable', 200, 8.50),
(2, 'WH-001', 'Wireless Headphones', 25, 72.00),
-- PO-2024-003 items
(3, 'TB-006', 'Tablet Stand', 40, 28.00),
(3, 'KD-007', 'Wireless Keyboard', 35, 45.00),
(3, 'SW-002', 'Smart Watch', 20, 118.00),
-- PO-2024-004 items
(4, 'PC-003', 'Phone Case', 150, 14.50),
(4, 'CB-005', 'USB Cable', 100, 8.75),
(4, 'BS-004', 'Bluetooth Speaker', 20, 82.00),
-- PO-2024-005 items
(5, 'WH-001', 'Wireless Headphones', 30, 74.00),
(5, 'TB-006', 'Tablet Stand', 25, 27.50),
(5, 'KD-007', 'Wireless Keyboard', 15, 44.00);

-- Sample inventory (only for delivered orders)
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
-- From PO-2024-001 (Delivered)
(1, 1, 45, 75.00, '2024-01-15'), -- Wireless Headphones (5 sold)
(2, 2, 22, 120.00, '2024-01-15'), -- Smart Watch (3 sold)
(3, 3, 95, 15.00, '2024-01-15'), -- Phone Case (5 sold)
-- From PO-2024-002 (Delivered)
(4, 4, 28, 85.00, '2024-01-18'), -- Bluetooth Speaker (2 sold)
(5, 5, 180, 8.50, '2024-01-18'), -- USB Cable (20 sold)
(1, 6, 23, 72.00, '2024-01-18'), -- More Wireless Headphones (2 sold)
-- Additional inventory batches
(6, 7, 35, 28.00, '2024-01-22'), -- Tablet Stand
(7, 8, 30, 45.00, '2024-01-22'), -- Wireless Keyboard
(2, 9, 18, 118.00, '2024-01-22'); -- More Smart Watches

-- Sample Shopify stores
INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES
('Main Electronics Store', 'main-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store1', 'Active', '2024-01-26 10:30:00'),
('EU Electronics Hub', 'eu-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store2', 'Active', '2024-01-26 09:15:00'),
('Mobile Accessories Store', 'mobile-accessories.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store3', 'Inactive', '2024-01-25 16:45:00');

-- Sample Shopify orders
INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, tax_amount, discount_amount, shipping_address) VALUES
(1, '5001', '#1001', 'John Smith', 'john@example.com', '2024-01-20 14:30:00', 'fulfilled', 299.99, 15.00, 24.00, 0.00, '123 Main St, New York, NY 10001'),
(1, '5002', '#1002', 'Sarah Johnson', 'sarah@example.com', '2024-01-21 09:15:00', 'fulfilled', 189.50, 10.00, 15.16, 20.00, '456 Oak Ave, Los Angeles, CA 90210'),
(2, '5003', '#2001', 'Mike Wilson', 'mike@example.com', '2024-01-22 16:45:00', 'pending', 425.00, 25.00, 34.00, 0.00, '789 Pine St, London, UK'),
(1, '5004', '#1003', 'Emily Davis', 'emily@example.com', '2024-01-23 11:20:00', 'fulfilled', 95.99, 8.00, 7.68, 10.00, '321 Elm St, Chicago, IL 60601'),
(2, '5005', '#2002', 'David Brown', 'david@example.com', '2024-01-24 13:10:00', 'shipped', 340.00, 20.00, 27.20, 0.00, '654 Maple Dr, Toronto, ON, Canada');

-- Sample Shopify order items
INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES
-- Order #1001
(1, 'WH-001', 'Wireless Headphones', 2, 149.99),
-- Order #1002
(2, 'SW-002', 'Smart Watch', 1, 199.50),
-- Order #2001
(3, 'WH-001', 'Wireless Headphones', 1, 149.99),
(3, 'BS-004', 'Bluetooth Speaker', 2, 125.00),
(3, 'PC-003', 'Phone Case', 1, 25.00),
-- Order #1003
(4, 'CB-005', 'USB Cable', 5, 19.99),
-- Order #2002
(5, 'SW-002', 'Smart Watch', 1, 199.50),
(5, 'TB-006', 'Tablet Stand', 2, 70.25);

-- Sample sales fulfillment (FIFO cost tracking)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
-- Fulfillment for order items using FIFO
(1, 1, 2, 75.00), -- 2 Wireless Headphones from first batch
(2, 2, 1, 120.00), -- 1 Smart Watch
(3, 1, 1, 75.00), -- 1 Wireless Headphones from first batch
(4, 4, 2, 85.00), -- 2 Bluetooth Speakers
(5, 3, 1, 15.00), -- 1 Phone Case
(6, 5, 5, 8.50), -- 5 USB Cables
(7, 9, 1, 118.00), -- 1 Smart Watch from newer batch
(8, 7, 2, 28.00); -- 2 Tablet Stands

-- Display success message
SELECT 'Database reset completed successfully!' as message,
       'Tables created: 8' as tables,
       'Views created: 2' as views,
       'Sample products: 7' as products,
       'Sample purchase orders: 5' as purchase_orders,
       'Sample inventory records: 9' as inventory_records,
       'Sample Shopify orders: 5' as shopify_orders;
