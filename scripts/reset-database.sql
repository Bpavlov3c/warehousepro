-- Drop existing tables and views
DROP VIEW IF EXISTS product_inventory_summary CASCADE;
DROP VIEW IF EXISTS profit_analysis CASCADE;
DROP TABLE IF EXISTS shopify_order_items CASCADE;
DROP TABLE IF EXISTS shopify_orders CASCADE;
DROP TABLE IF EXISTS shopify_stores CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS po_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_orders table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    po_date DATE NOT NULL,
    delivery_cost DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Delivered', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create po_items table
CREATE TABLE po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create inventory table
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
    batch_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    location VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create shopify_stores table
CREATE TABLE shopify_stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    shop_domain VARCHAR(255) NOT NULL UNIQUE,
    access_token VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create shopify_orders table
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
    UNIQUE(shopify_order_id, store_id)
);

-- Create shopify_order_items table
CREATE TABLE shopify_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES shopify_orders(id) ON DELETE CASCADE,
    shopify_variant_id BIGINT,
    sku VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_po_items_sku ON po_items(sku);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_po_id ON inventory(po_id);
CREATE INDEX idx_inventory_batch_date ON inventory(batch_date);
CREATE INDEX idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX idx_shopify_orders_order_date ON shopify_orders(order_date);
CREATE INDEX idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);

-- Create views
CREATE VIEW product_inventory_summary AS
SELECT 
    p.sku,
    p.product_name,
    p.category,
    COALESCE(SUM(i.quantity_remaining), 0) as current_stock,
    COALESCE(AVG(i.unit_cost), 0) as avg_unit_cost,
    COALESCE(SUM(i.quantity_remaining * i.unit_cost), 0) as total_value,
    p.reorder_level,
    CASE 
        WHEN COALESCE(SUM(i.quantity_remaining), 0) <= p.reorder_level THEN 'Low Stock'
        WHEN COALESCE(SUM(i.quantity_remaining), 0) = 0 THEN 'Out of Stock'
        ELSE 'In Stock'
    END as stock_status
FROM products p
LEFT JOIN inventory i ON p.sku = i.sku
GROUP BY p.id, p.sku, p.product_name, p.category, p.reorder_level;

CREATE VIEW profit_analysis AS
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
WHERE soi.sku IS NOT NULL AND i.sku IS NOT NULL
GROUP BY soi.sku, soi.product_name;

-- Insert sample data
INSERT INTO products (sku, product_name, description, category, unit_of_measure, reorder_level) VALUES
('WIDGET-001', 'Premium Widget', 'High-quality widget for professional use', 'Electronics', 'pcs', 20),
('GADGET-002', 'Smart Gadget', 'Innovative gadget with smart features', 'Electronics', 'pcs', 15),
('TOOL-003', 'Multi-Tool Pro', 'Professional multi-purpose tool', 'Tools', 'pcs', 10),
('ACCESSORY-004', 'Universal Accessory', 'Compatible with multiple devices', 'Accessories', 'pcs', 25),
('COMPONENT-005', 'Essential Component', 'Critical component for assembly', 'Components', 'pcs', 30),
('SUPPLY-006', 'Office Supply Pack', 'Complete office supply package', 'Office', 'pack', 5);

INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'TechSupply Inc.', '2024-01-15', 25.00, 'Delivered', 'First quarter electronics order'),
('PO-2024-002', 'GadgetWorld Ltd.', '2024-01-20', 15.50, 'Delivered', 'Smart gadgets bulk order'),
('PO-2024-003', 'ToolMaster Corp.', '2024-02-01', 30.00, 'Approved', 'Professional tools restock'),
('PO-2024-004', 'AccessoryHub', '2024-02-10', 12.75, 'Pending', 'Accessories and components'),
('PO-2024-005', 'OfficeMax Pro', '2024-02-15', 8.25, 'Pending', 'Office supplies monthly order');

INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(1, 'WIDGET-001', 'Premium Widget', 50, 12.50),
(1, 'GADGET-002', 'Smart Gadget', 30, 25.00),
(2, 'GADGET-002', 'Smart Gadget', 25, 24.50),
(2, 'ACCESSORY-004', 'Universal Accessory', 100, 3.75),
(3, 'TOOL-003', 'Multi-Tool Pro', 20, 45.00),
(3, 'COMPONENT-005', 'Essential Component', 75, 8.50),
(4, 'ACCESSORY-004', 'Universal Accessory', 50, 3.50),
(4, 'COMPONENT-005', 'Essential Component', 40, 8.25),
(5, 'SUPPLY-006', 'Office Supply Pack', 15, 22.00);

INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location) VALUES
('WIDGET-001', 'Premium Widget', 1, '2024-01-20', 50, 35, 12.50, 'A-01-01'),
('GADGET-002', 'Smart Gadget', 1, '2024-01-20', 30, 18, 25.00, 'A-01-02'),
('GADGET-002', 'Smart Gadget', 2, '2024-01-25', 25, 22, 24.50, 'A-01-02'),
('ACCESSORY-004', 'Universal Accessory', 2, '2024-01-25', 100, 85, 3.75, 'B-02-01'),
('TOOL-003', 'Multi-Tool Pro', 3, '2024-02-05', 20, 20, 45.00, 'C-03-01'),
('COMPONENT-005', 'Essential Component', 3, '2024-02-05', 75, 60, 8.50, 'B-02-02'),
('ACCESSORY-004', 'Universal Accessory', 4, '2024-02-12', 50, 50, 3.50, 'B-02-01'),
('COMPONENT-005', 'Essential Component', 4, '2024-02-12', 40, 40, 8.25, 'B-02-02'),
('SUPPLY-006', 'Office Supply Pack', 5, '2024-02-18', 15, 12, 22.00, 'D-04-01');

INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active) VALUES
('Main Store', 'mystore.myshopify.com', 'shpat_example_token_123', true),
('Wholesale Store', 'wholesale.myshopify.com', 'shpat_example_token_456', true),
('International Store', 'international.myshopify.com', 'shpat_example_token_789', false);

INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, order_date, total_amount, currency, fulfillment_status, financial_status) VALUES
(1001, 1, '#1001', 'customer1@example.com', 'John Smith', '2024-01-25 10:30:00', 87.50, 'USD', 'fulfilled', 'paid'),
(1002, 1, '#1002', 'customer2@example.com', 'Jane Doe', '2024-01-28 14:15:00', 123.75, 'USD', 'fulfilled', 'paid'),
(1003, 2, '#2001', 'wholesale@company.com', 'ABC Company', '2024-02-01 09:00:00', 450.00, 'USD', 'pending', 'paid'),
(1004, 1, '#1003', 'customer3@example.com', 'Bob Johnson', '2024-02-05 16:45:00', 67.50, 'USD', 'fulfilled', 'paid'),
(1005, 1, '#1004', 'customer4@example.com', 'Alice Brown', '2024-02-10 11:20:00', 156.25, 'USD', 'pending', 'pending');

INSERT INTO shopify_order_items (order_id, shopify_variant_id, sku, product_name, quantity, unit_price) VALUES
(1, 10001, 'WIDGET-001', 'Premium Widget', 2, 18.75),
(1, 10002, 'GADGET-002', 'Smart Gadget', 1, 37.50),
(1, 10003, 'ACCESSORY-004', 'Universal Accessory', 8, 6.25),
(2, 10002, 'GADGET-002', 'Smart Gadget', 2, 37.50),
(2, 10004, 'TOOL-003', 'Multi-Tool Pro', 1, 67.50),
(3, 10003, 'ACCESSORY-004', 'Universal Accessory', 50, 5.00),
(3, 10005, 'COMPONENT-005', 'Essential Component', 25, 12.50),
(4, 10001, 'WIDGET-001', 'Premium Widget', 1, 18.75),
(4, 10003, 'ACCESSORY-004', 'Universal Accessory', 12, 6.25),
(5, 10002, 'GADGET-002', 'Smart Gadget', 3, 37.50),
(5, 10006, 'SUPPLY-006', 'Office Supply Pack', 1, 33.75);

-- Update timestamps
UPDATE purchase_orders SET updated_at = CURRENT_TIMESTAMP;
UPDATE products SET updated_at = CURRENT_TIMESTAMP;
UPDATE inventory SET updated_at = CURRENT_TIMESTAMP;
UPDATE shopify_stores SET updated_at = CURRENT_TIMESTAMP;
UPDATE shopify_orders SET updated_at = CURRENT_TIMESTAMP;

-- Display summary
SELECT 'Database reset completed successfully!' as status;
SELECT 'Products: ' || COUNT(*) as summary FROM products
UNION ALL
SELECT 'Purchase Orders: ' || COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'PO Items: ' || COUNT(*) FROM po_items
UNION ALL
SELECT 'Inventory Records: ' || COUNT(*) FROM inventory
UNION ALL
SELECT 'Shopify Stores: ' || COUNT(*) FROM shopify_stores
UNION ALL
SELECT 'Shopify Orders: ' || COUNT(*) FROM shopify_orders
UNION ALL
SELECT 'Shopify Order Items: ' || COUNT(*) FROM shopify_order_items;
