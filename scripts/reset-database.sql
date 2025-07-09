-- Complete database reset script for Warehouse Management System
-- This script will drop and recreate the entire database

-- Connect to postgres database to drop/create the warehouse_management database
\c postgres;

-- Terminate all connections to the warehouse_management database
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'warehouse_management' AND pid <> pg_backend_pid();

-- Drop the database if it exists
DROP DATABASE IF EXISTS warehouse_management;

-- Drop the user if it exists
DROP USER IF EXISTS warehouse_user;

-- Create the user
CREATE USER warehouse_user WITH PASSWORD '1';

-- Create the database
CREATE DATABASE warehouse_management OWNER warehouse_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE warehouse_management TO warehouse_user;

-- Connect to the new database
\c warehouse_management;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;

-- Purchase Orders table
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

-- Purchase Order Items table
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

-- Products table
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

-- Inventory table (FIFO tracking)
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    po_item_id INTEGER REFERENCES po_items(id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    purchase_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shopify Stores table
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

-- Shopify Orders table
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

-- Shopify Order Items table
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

-- Sales Fulfillment table (FIFO cost tracking)
CREATE TABLE sales_fulfillment (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER REFERENCES shopify_order_items(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    quantity_used INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_po_items_sku ON po_items(sku);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_shopify_orders_date ON shopify_orders(order_date);
CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);
CREATE INDEX idx_sales_fulfillment_order_item ON sales_fulfillment(order_item_id);

-- Create views for reporting
CREATE VIEW product_inventory_summary AS
SELECT 
    p.sku,
    p.name,
    COALESCE(SUM(i.quantity_available), 0) as current_stock,
    COALESCE(AVG(i.unit_cost), 0) as avg_cost,
    COALESCE(SUM(i.quantity_available * i.unit_cost), 0) as total_value,
    p.min_stock,
    p.max_stock
FROM products p
LEFT JOIN inventory i ON p.id = i.product_id
GROUP BY p.id, p.sku, p.name, p.min_stock, p.max_stock;

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
('PO-2024-004', 'Premium Tech', '2024-01-25', 125.00, 'Approved', 'Rush order for high-demand items');

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
-- PO-2024-003 items (pending)
(3, 'TB-006', 'Tablet Stand', 40, 28.00),
(3, 'KD-007', 'Wireless Keyboard', 35, 45.00),
(3, 'SW-002', 'Smart Watch', 20, 118.00),
-- PO-2024-004 items (approved)
(4, 'PC-003', 'Phone Case', 150, 14.50),
(4, 'CB-005', 'USB Cable', 100, 8.75),
(4, 'BS-004', 'Bluetooth Speaker', 20, 82.00);

-- Sample inventory for delivered orders
INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
-- From PO-2024-001 (delivered)
(1, 1, 45, 75.00, '2024-01-15'), -- WH-001: 45 remaining (5 sold)
(2, 2, 22, 120.00, '2024-01-15'), -- SW-002: 22 remaining (3 sold)
(3, 3, 95, 15.00, '2024-01-15'), -- PC-003: 95 remaining (5 sold)
-- From PO-2024-002 (delivered)
(4, 4, 28, 85.00, '2024-01-18'), -- BS-004: 28 remaining (2 sold)
(5, 5, 180, 8.50, '2024-01-18'), -- CB-005: 180 remaining (20 sold)
(1, 6, 23, 72.00, '2024-01-18'); -- WH-001: 23 remaining (2 sold from newer batch)

-- Sample Shopify stores
INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES
('Main Electronics Store', 'main-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store1', 'Active', '2024-01-26 10:30:00'),
('EU Electronics Hub', 'eu-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store2', 'Active', '2024-01-26 09:15:00'),
('Mobile Accessories Store', 'mobile-accessories.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store3', 'Inactive', '2024-01-25 16:45:00');

-- Sample Shopify orders
INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, tax_amount, discount_amount, shipping_address) VALUES
(1, '5234567890123', '#1001', 'John Doe', 'john@example.com', '2024-01-20 14:30:00', 'fulfilled', 299.99, 9.99, 24.00, 0.00, '123 Main St, New York, NY 10001'),
(1, '5234567890124', '#1002', 'Jane Smith', 'jane@example.com', '2024-01-21 10:15:00', 'pending', 189.99, 12.99, 15.20, 5.00, '456 Oak Ave, Los Angeles, CA 90210'),
(2, '5234567890125', '#2001', 'Bob Johnson', 'bob@example.com', '2024-01-22 16:20:00', 'shipped', 159.99, 7.99, 12.80, 0.00, '789 Pine St, Chicago, IL 60601'),
(1, '5234567890126', '#1003', 'Alice Brown', 'alice@example.com', '2024-01-23 11:45:00', 'fulfilled', 89.99, 8.99, 7.20, 10.00, '321 Elm Rd, Houston, TX 77001'),
(3, '5234567890127', '#3001', 'Charlie Wilson', 'charlie@example.com', '2024-01-24 13:30:00', 'cancelled', 45.99, 5.99, 3.68, 0.00, '654 Maple Dr, Phoenix, AZ 85001');

-- Sample Shopify order items
INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES
-- Order #1001
(1, 'WH-001', 'Wireless Headphones', 2, 149.99),
-- Order #1002  
(2, 'SW-002', 'Smart Watch', 1, 189.99),
-- Order #2001
(3, 'BS-004', 'Bluetooth Speaker', 1, 129.99),
(3, 'PC-003', 'Phone Case', 2, 15.00),
-- Order #1003
(4, 'CB-005', 'USB Cable', 3, 12.99),
(4, 'PC-003', 'Phone Case', 2, 16.99),
-- Order #3001 (cancelled)
(5, 'PC-003', 'Phone Case', 3, 15.33);

-- Sample sales fulfillment records (FIFO cost tracking)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES
-- Order #1001: 2x WH-001
(1, 1, 2, 75.00),
-- Order #1002: 1x SW-002
(2, 2, 1, 120.00),
-- Order #2001: 1x BS-004, 2x PC-003
(3, 4, 1, 85.00),
(4, 3, 2, 15.00),
-- Order #1003: 3x CB-005, 2x PC-003
(5, 5, 3, 8.50),
(6, 3, 2, 15.00);

-- Final message
SELECT 'Database reset and sample data inserted successfully!' as message;
