-- Drop existing database and recreate
DROP DATABASE IF EXISTS warehouse_management;
DROP USER IF EXISTS warehouse_user;

-- Create user and database
CREATE USER warehouse_user WITH PASSWORD '1';
CREATE DATABASE warehouse_management OWNER warehouse_user;

-- Connect to the new database
\c warehouse_management;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE warehouse_management TO warehouse_user;
GRANT ALL ON SCHEMA public TO warehouse_user;

-- Create tables
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'units',
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    po_id INTEGER REFERENCES purchase_orders(id),
    batch_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL,
    quantity_remaining INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    location VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopify_stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    shop_domain VARCHAR(255) NOT NULL,
    access_token VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopify_orders (
    id SERIAL PRIMARY KEY,
    shopify_order_id BIGINT NOT NULL,
    store_id INTEGER REFERENCES shopify_stores(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    fulfillment_status VARCHAR(50),
    financial_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(store_id, shopify_order_id)
);

CREATE TABLE shopify_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES shopify_orders(id) ON DELETE CASCADE,
    shopify_variant_id BIGINT,
    sku VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_movements (
    id SERIAL PRIMARY KEY,
    inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
    movement_type VARCHAR(50) NOT NULL, -- 'IN', 'OUT', 'ADJUSTMENT'
    quantity INTEGER NOT NULL,
    reference_type VARCHAR(50), -- 'PURCHASE_ORDER', 'SHOPIFY_ORDER', 'ADJUSTMENT'
    reference_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_po_items_sku ON po_items(sku);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_po_id ON inventory(po_id);
CREATE INDEX idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);
CREATE INDEX idx_inventory_movements_inventory_id ON inventory_movements(inventory_id);

-- Create views for reporting
CREATE OR REPLACE VIEW product_inventory_summary AS
SELECT 
    p.sku,
    p.product_name,
    p.category,
    p.reorder_level,
    COALESCE(SUM(i.quantity_remaining), 0) as current_stock,
    COALESCE(AVG(i.unit_cost), 0) as avg_unit_cost,
    COALESCE(SUM(i.quantity_remaining * i.unit_cost), 0) as total_value,
    COUNT(i.id) as batch_count
FROM products p
LEFT JOIN inventory i ON p.sku = i.sku
GROUP BY p.id, p.sku, p.product_name, p.category, p.reorder_level;

CREATE OR REPLACE VIEW profit_analysis AS
SELECT 
    soi.sku,
    soi.product_name,
    SUM(soi.quantity) as total_sold,
    AVG(soi.unit_price) as avg_selling_price,
    AVG(i.unit_cost) as avg_cost_price,
    AVG(soi.unit_price - i.unit_cost) as avg_profit_per_unit,
    SUM(soi.total_price) as total_revenue,
    SUM(soi.quantity * i.unit_cost) as total_cost,
    SUM(soi.total_price - (soi.quantity * i.unit_cost)) as total_profit
FROM shopify_order_items soi
LEFT JOIN inventory i ON soi.sku = i.sku
WHERE soi.sku IS NOT NULL
GROUP BY soi.sku, soi.product_name;

-- Insert sample data
INSERT INTO products (sku, product_name, description, category, unit_of_measure, reorder_level) VALUES
('WIDGET-001', 'Premium Widget', 'High-quality widget for industrial use', 'Widgets', 'pieces', 50),
('GADGET-002', 'Smart Gadget', 'IoT-enabled smart gadget', 'Electronics', 'pieces', 25),
('TOOL-003', 'Professional Tool', 'Heavy-duty professional tool', 'Tools', 'pieces', 15),
('PART-004', 'Replacement Part', 'Universal replacement part', 'Parts', 'pieces', 100),
('ACCESSORY-005', 'Premium Accessory', 'High-end accessory item', 'Accessories', 'pieces', 30),
('COMPONENT-006', 'Electronic Component', 'Specialized electronic component', 'Electronics', 'pieces', 75),
('MATERIAL-007', 'Raw Material', 'Industrial raw material', 'Materials', 'kg', 200);

INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Widget Suppliers Inc', '2024-01-15', 25.00, 'Delivered', 'First order of the year'),
('PO-2024-002', 'Tech Components Ltd', '2024-01-20', 15.50, 'Delivered', 'Electronics restock'),
('PO-2024-003', 'Industrial Tools Co', '2024-02-01', 35.00, 'Approved', 'Tool maintenance stock'),
('PO-2024-004', 'Parts Warehouse', '2024-02-10', 12.75, 'Pending', 'Replacement parts order'),
('PO-2024-005', 'Premium Supplies', '2024-02-15', 28.25, 'Delivered', 'Accessory restock');

INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(1, 'WIDGET-001', 'Premium Widget', 100, 12.50),
(1, 'PART-004', 'Replacement Part', 200, 3.25),
(2, 'GADGET-002', 'Smart Gadget', 50, 45.00),
(2, 'COMPONENT-006', 'Electronic Component', 150, 8.75),
(3, 'TOOL-003', 'Professional Tool', 25, 85.00),
(4, 'PART-004', 'Replacement Part', 300, 3.15),
(4, 'MATERIAL-007', 'Raw Material', 500, 2.50),
(5, 'ACCESSORY-005', 'Premium Accessory', 75, 22.00),
(5, 'WIDGET-001', 'Premium Widget', 50, 12.75);

INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location) VALUES
('WIDGET-001', 'Premium Widget', 1, '2024-01-18', 100, 85, 12.50, 'A-01-01'),
('WIDGET-001', 'Premium Widget', 5, '2024-02-18', 50, 50, 12.75, 'A-01-02'),
('PART-004', 'Replacement Part', 1, '2024-01-18', 200, 180, 3.25, 'B-02-01'),
('PART-004', 'Replacement Part', 4, '2024-02-12', 300, 300, 3.15, 'B-02-02'),
('GADGET-002', 'Smart Gadget', 2, '2024-01-23', 50, 42, 45.00, 'C-03-01'),
('COMPONENT-006', 'Electronic Component', 2, '2024-01-23', 150, 135, 8.75, 'D-04-01'),
('TOOL-003', 'Professional Tool', 3, '2024-02-05', 25, 25, 85.00, 'E-05-01'),
('MATERIAL-007', 'Raw Material', 4, '2024-02-12', 500, 450, 2.50, 'F-06-01'),
('ACCESSORY-005', 'Premium Accessory', 5, '2024-02-18', 75, 68, 22.00, 'G-07-01');

INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active) VALUES
('Main Store', 'mystore.myshopify.com', 'shpat_xxxxxxxxxxxxxxxxxxxxx', true),
('Wholesale Store', 'wholesale.myshopify.com', 'shpat_yyyyyyyyyyyyyyyyyyyyy', true),
('International Store', 'international.myshopify.com', 'shpat_zzzzzzzzzzzzzzzzzzzzz', false);

INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, order_date, total_amount, currency, fulfillment_status, financial_status) VALUES
(1001, 1, '#1001', 'customer1@example.com', 'John Smith', '2024-01-25 10:30:00', 157.50, 'USD', 'fulfilled', 'paid'),
(1002, 1, '#1002', 'customer2@example.com', 'Jane Doe', '2024-01-28 14:15:00', 90.00, 'USD', 'fulfilled', 'paid'),
(1003, 2, '#2001', 'wholesale@company.com', 'ABC Company', '2024-02-02 09:00:00', 525.00, 'USD', 'fulfilled', 'paid'),
(1004, 1, '#1003', 'customer3@example.com', 'Bob Johnson', '2024-02-05 16:45:00', 262.50, 'USD', 'pending', 'paid'),
(1005, 1, '#1004', 'customer4@example.com', 'Alice Brown', '2024-02-08 11:20:00', 66.00, 'USD', 'fulfilled', 'paid');

INSERT INTO shopify_order_items (order_id, shopify_variant_id, sku, product_name, quantity, unit_price) VALUES
(1, 10001, 'WIDGET-001', 'Premium Widget', 5, 18.75),
(1, 10002, 'PART-004', 'Replacement Part', 10, 4.88),
(1, 10003, 'GADGET-002', 'Smart Gadget', 1, 67.50),
(2, 10001, 'WIDGET-001', 'Premium Widget', 3, 18.75),
(2, 10004, 'COMPONENT-006', 'Electronic Component', 2, 13.13),
(3, 10001, 'WIDGET-001', 'Premium Widget', 20, 18.75),
(3, 10003, 'GADGET-002', 'Smart Gadget', 2, 67.50),
(3, 10005, 'TOOL-003', 'Professional Tool', 1, 127.50),
(4, 10002, 'PART-004', 'Replacement Part', 25, 4.88),
(4, 10006, 'ACCESSORY-005', 'Premium Accessory', 3, 33.00),
(5, 10004, 'COMPONENT-006', 'Electronic Component', 3, 13.13),
(5, 10006, 'ACCESSORY-005', 'Premium Accessory', 1, 33.00);

-- Grant all permissions to warehouse_user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO warehouse_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO warehouse_user;

-- Display success message
SELECT 'Database reset completed successfully!' as message;
SELECT 'Sample data inserted:' as info;
SELECT COUNT(*) as products FROM products;
SELECT COUNT(*) as purchase_orders FROM purchase_orders;
SELECT COUNT(*) as po_items FROM po_items;
SELECT COUNT(*) as inventory_records FROM inventory;
SELECT COUNT(*) as shopify_stores FROM shopify_stores;
SELECT COUNT(*) as shopify_orders FROM shopify_orders;
SELECT COUNT(*) as shopify_order_items FROM shopify_order_items;
