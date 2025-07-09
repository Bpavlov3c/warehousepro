-- Complete Database Reset Script for Warehouse Management System
-- This script will drop all existing tables and recreate them with sample data

-- Drop existing tables in correct order (reverse dependency order)
DROP TABLE IF EXISTS sales_fulfillment CASCADE;
DROP TABLE IF EXISTS shopify_order_items CASCADE;
DROP TABLE IF EXISTS shopify_orders CASCADE;
DROP TABLE IF EXISTS shopify_stores CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS po_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop views if they exist
DROP VIEW IF EXISTS product_inventory_summary CASCADE;
DROP VIEW IF EXISTS profit_analysis CASCADE;

-- Create Products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'pcs',
    reorder_level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Purchase Orders table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    po_date DATE NOT NULL,
    delivery_cost DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Delivered', 'Cancelled')),
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
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Inventory table (FIFO tracking)
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    po_id INTEGER REFERENCES purchase_orders(id),
    batch_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    location VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_remaining_not_greater_than_received 
        CHECK (quantity_remaining <= quantity_received)
);

-- Create Shopify Stores table
CREATE TABLE shopify_stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Shopify Orders table
CREATE TABLE shopify_orders (
    id SERIAL PRIMARY KEY,
    shopify_order_id BIGINT UNIQUE NOT NULL,
    store_id INTEGER REFERENCES shopify_stores(id),
    order_number VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    order_date TIMESTAMP NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    fulfillment_status VARCHAR(50) DEFAULT 'unfulfilled',
    financial_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Shopify Order Items table
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

-- Create Sales Fulfillment table (tracks inventory deductions)
CREATE TABLE sales_fulfillment (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER REFERENCES shopify_order_items(id),
    inventory_id INTEGER REFERENCES inventory(id),
    sku VARCHAR(100) NOT NULL,
    quantity_fulfilled INTEGER NOT NULL CHECK (quantity_fulfilled > 0),
    unit_cost DECIMAL(10,2) NOT NULL,
    fulfillment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
CREATE INDEX idx_shopify_orders_date ON shopify_orders(order_date);
CREATE INDEX idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);
CREATE INDEX idx_sales_fulfillment_sku ON sales_fulfillment(sku);

-- Insert sample data first, then create views

-- Sample Products
INSERT INTO products (sku, product_name, description, category, reorder_level) VALUES
('WIDGET-001', 'Premium Widget A', 'High-quality widget for industrial use', 'Widgets', 50),
('WIDGET-002', 'Standard Widget B', 'Standard widget for general use', 'Widgets', 30),
('GADGET-001', 'Smart Gadget Pro', 'Advanced smart gadget with AI features', 'Electronics', 20),
('GADGET-002', 'Basic Gadget', 'Simple gadget for everyday use', 'Electronics', 40),
('TOOL-001', 'Professional Tool Set', 'Complete professional tool set', 'Tools', 10),
('ACCESSORY-001', 'Universal Accessory', 'Compatible with all widget models', 'Accessories', 100);

-- Sample Purchase Orders
INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Widget Suppliers Inc', '2024-01-15', 25.50, 'Delivered', 'First order of the year'),
('PO-2024-002', 'Electronics Wholesale', '2024-01-20', 45.00, 'Delivered', 'Bulk electronics order'),
('PO-2024-003', 'Tool Masters Ltd', '2024-02-01', 15.75, 'Approved', 'Professional tools restock'),
('PO-2024-004', 'Accessory World', '2024-02-10', 30.00, 'Pending', 'Monthly accessory order'),
('PO-2024-005', 'Widget Suppliers Inc', '2024-02-15', 28.25, 'Delivered', 'Reorder of popular items');

-- Sample PO Items
INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
-- PO-2024-001 items
(1, 'WIDGET-001', 'Premium Widget A', 100, 12.50),
(1, 'WIDGET-002', 'Standard Widget B', 150, 8.75),
-- PO-2024-002 items
(2, 'GADGET-001', 'Smart Gadget Pro', 50, 45.00),
(2, 'GADGET-002', 'Basic Gadget', 75, 15.50),
-- PO-2024-003 items
(3, 'TOOL-001', 'Professional Tool Set', 25, 125.00),
-- PO-2024-004 items
(4, 'ACCESSORY-001', 'Universal Accessory', 200, 3.25),
-- PO-2024-005 items
(5, 'WIDGET-001', 'Premium Widget A', 80, 12.75),
(5, 'WIDGET-002', 'Standard Widget B', 120, 9.00);

-- Sample Inventory (only for delivered POs)
INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location) VALUES
-- From PO-2024-001 (Delivered)
('WIDGET-001', 'Premium Widget A', 1, '2024-01-18', 100, 85, 12.50, 'A-1-01'),
('WIDGET-002', 'Standard Widget B', 1, '2024-01-18', 150, 120, 8.75, 'A-1-02'),
-- From PO-2024-002 (Delivered)
('GADGET-001', 'Smart Gadget Pro', 2, '2024-01-25', 50, 35, 45.00, 'B-2-01'),
('GADGET-002', 'Basic Gadget', 2, '2024-01-25', 75, 60, 15.50, 'B-2-02'),
-- From PO-2024-005 (Delivered)
('WIDGET-001', 'Premium Widget A', 5, '2024-02-18', 80, 75, 12.75, 'A-1-03'),
('WIDGET-002', 'Standard Widget B', 5, '2024-02-18', 120, 110, 9.00, 'A-1-04');

-- Sample Shopify Stores
INSERT INTO shopify_stores (store_name, shop_domain, is_active) VALUES
('Main Store', 'mystore.myshopify.com', true),
('Wholesale Store', 'wholesale.myshopify.com', true),
('Test Store', 'test-store.myshopify.com', false);

-- Sample Shopify Orders
INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, order_date, total_amount, fulfillment_status, financial_status) VALUES
(1001, 1, '#1001', 'customer1@example.com', 'John Smith', '2024-01-20 10:30:00', 156.25, 'fulfilled', 'paid'),
(1002, 1, '#1002', 'customer2@example.com', 'Jane Doe', '2024-01-22 14:15:00', 93.00, 'fulfilled', 'paid'),
(1003, 2, '#2001', 'wholesale@company.com', 'ABC Company', '2024-01-25 09:00:00', 450.00, 'fulfilled', 'paid'),
(1004, 1, '#1003', 'customer3@example.com', 'Bob Johnson', '2024-02-01 16:45:00', 78.50, 'partial', 'paid'),
(1005, 1, '#1004', 'customer4@example.com', 'Alice Brown', '2024-02-05 11:20:00', 225.75, 'unfulfilled', 'pending');

-- Sample Shopify Order Items
INSERT INTO shopify_order_items (order_id, shopify_variant_id, sku, product_name, quantity, unit_price) VALUES
-- Order #1001
(1, 101, 'WIDGET-001', 'Premium Widget A', 5, 18.75),
(1, 102, 'WIDGET-002', 'Standard Widget B', 8, 13.12),
-- Order #1002
(2, 103, 'GADGET-002', 'Basic Gadget', 3, 31.00),
-- Order #2001 (Wholesale)
(3, 101, 'WIDGET-001', 'Premium Widget A', 10, 15.00),
(3, 104, 'GADGET-001', 'Smart Gadget Pro', 5, 60.00),
-- Order #1003
(4, 102, 'WIDGET-002', 'Standard Widget B', 6, 13.08),
-- Order #1004
(5, 101, 'WIDGET-001', 'Premium Widget A', 12, 18.81);

-- Sample Sales Fulfillment (for fulfilled orders)
INSERT INTO sales_fulfillment (order_item_id, inventory_id, sku, quantity_fulfilled, unit_cost) VALUES
-- Fulfillment for Order #1001
(1, 1, 'WIDGET-001', 5, 12.50), -- 5 units from first batch
(2, 2, 'WIDGET-002', 8, 8.75),  -- 8 units from first batch
-- Fulfillment for Order #1002
(3, 4, 'GADGET-002', 3, 15.50), -- 3 units from gadget batch
-- Fulfillment for Order #2001
(4, 1, 'WIDGET-001', 10, 12.50), -- 10 more units from first batch
(5, 3, 'GADGET-001', 5, 45.00), -- 5 units from gadget pro batch
-- Fulfillment for Order #1003
(6, 2, 'WIDGET-002', 6, 8.75);  -- 6 units from first batch

-- Now create views AFTER data is inserted
CREATE VIEW product_inventory_summary AS
SELECT 
    p.sku,
    p.product_name,
    p.category,
    COALESCE(SUM(i.quantity_remaining), 0) as current_stock,
    COALESCE(AVG(i.unit_cost), 0) as avg_cost,
    COALESCE(SUM(i.quantity_remaining * i.unit_cost), 0) as total_value,
    p.reorder_level,
    CASE 
        WHEN COALESCE(SUM(i.quantity_remaining), 0) <= p.reorder_level THEN 'Low Stock'
        WHEN COALESCE(SUM(i.quantity_remaining), 0) = 0 THEN 'Out of Stock'
        ELSE 'In Stock'
    END as stock_status,
    COUNT(DISTINCT i.po_id) as supplier_count,
    MAX(i.batch_date) as last_received_date
FROM products p
LEFT JOIN inventory i ON p.sku = i.sku AND i.quantity_remaining > 0
GROUP BY p.id, p.sku, p.product_name, p.category, p.reorder_level;

CREATE VIEW profit_analysis AS
SELECT 
    soi.sku,
    soi.product_name,
    SUM(soi.quantity) as total_sold,
    SUM(soi.total_price) as total_revenue,
    SUM(sf.quantity_fulfilled * sf.unit_cost) as total_cost,
    SUM(soi.total_price) - SUM(sf.quantity_fulfilled * sf.unit_cost) as total_profit,
    CASE 
        WHEN SUM(sf.quantity_fulfilled * sf.unit_cost) > 0 
        THEN ((SUM(soi.total_price) - SUM(sf.quantity_fulfilled * sf.unit_cost)) / SUM(sf.quantity_fulfilled * sf.unit_cost)) * 100
        ELSE 0 
    END as profit_margin_percent
FROM shopify_order_items soi
JOIN sales_fulfillment sf ON soi.id = sf.order_item_id
GROUP BY soi.sku, soi.product_name
HAVING SUM(soi.quantity) > 0;

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_stores_updated_at BEFORE UPDATE ON shopify_stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_orders_updated_at BEFORE UPDATE ON shopify_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Display summary
SELECT 'Database reset completed successfully!' as status;
SELECT 'Products: ' || COUNT(*) as count FROM products
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
SELECT 'Order Items: ' || COUNT(*) FROM shopify_order_items
UNION ALL
SELECT 'Fulfillment Records: ' || COUNT(*) FROM sales_fulfillment;
