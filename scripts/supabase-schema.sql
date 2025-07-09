-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS shopify_order_items CASCADE;
DROP TABLE IF EXISTS shopify_orders CASCADE;
DROP TABLE IF EXISTS shopify_stores CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS po_items CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;

-- Drop existing views if they exist
DROP VIEW IF EXISTS product_inventory_summary CASCADE;
DROP VIEW IF EXISTS profit_analysis CASCADE;

-- Create products table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'each',
    reorder_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_orders table
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    po_date DATE NOT NULL,
    delivery_cost DECIMAL(10,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create po_items table
CREATE TABLE po_items (
    id SERIAL PRIMARY KEY,
    po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopify_stores table
CREATE TABLE shopify_stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopify_orders table
CREATE TABLE shopify_orders (
    id SERIAL PRIMARY KEY,
    shopify_order_id BIGINT UNIQUE NOT NULL,
    store_id INTEGER REFERENCES shopify_stores(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    fulfillment_status VARCHAR(50),
    financial_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopify_order_items table
CREATE TABLE shopify_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES shopify_orders(id) ON DELETE CASCADE,
    shopify_variant_id BIGINT,
    sku VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_po_items_po_id ON po_items(po_id);
CREATE INDEX idx_po_items_sku ON po_items(sku);
CREATE INDEX idx_inventory_sku ON inventory(sku);
CREATE INDEX idx_inventory_po_id ON inventory(po_id);
CREATE INDEX idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX idx_shopify_orders_order_date ON shopify_orders(order_date);
CREATE INDEX idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_stores_updated_at BEFORE UPDATE ON shopify_stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_orders_updated_at BEFORE UPDATE ON shopify_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create product_inventory_summary view
CREATE VIEW product_inventory_summary AS
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

-- Create profit_analysis view
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
WHERE soi.sku IS NOT NULL
GROUP BY soi.sku, soi.product_name;

-- Insert sample data
INSERT INTO products (sku, product_name, description, category, unit_of_measure, reorder_level) VALUES
('WIDGET-001', 'Premium Widget', 'High-quality widget for industrial use', 'Widgets', 'each', 50),
('GADGET-002', 'Smart Gadget', 'IoT-enabled smart gadget', 'Electronics', 'each', 25),
('TOOL-003', 'Professional Tool', 'Heavy-duty professional tool', 'Tools', 'each', 10),
('SUPPLY-004', 'Office Supplies Pack', 'Complete office supplies package', 'Supplies', 'pack', 100),
('PART-005', 'Replacement Part', 'Universal replacement part', 'Parts', 'each', 75);

INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Widget Suppliers Inc.', '2024-01-15', 25.00, 'Delivered', 'First order of the year'),
('PO-2024-002', 'Tech Gadgets Ltd.', '2024-01-20', 15.50, 'Pending', 'Rush order for new product launch'),
('PO-2024-003', 'Tool Masters Co.', '2024-01-25', 30.00, 'Approved', 'Bulk order for Q1'),
('PO-2024-004', 'Office Plus', '2024-02-01', 12.75, 'Delivered', 'Monthly supplies replenishment'),
('PO-2024-005', 'Parts Warehouse', '2024-02-05', 20.00, 'Pending', 'Emergency stock replenishment');

INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(1, 'WIDGET-001', 'Premium Widget', 100, 12.50),
(2, 'GADGET-002', 'Smart Gadget', 50, 45.00),
(3, 'TOOL-003', 'Professional Tool', 25, 89.99),
(4, 'SUPPLY-004', 'Office Supplies Pack', 200, 8.75),
(5, 'PART-005', 'Replacement Part', 150, 15.25);

INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location) VALUES
('WIDGET-001', 'Premium Widget', 1, '2024-01-20', 100, 85, 12.50, 'A-1-01'),
('GADGET-002', 'Smart Gadget', 2, '2024-01-25', 50, 42, 45.00, 'B-2-03'),
('TOOL-003', 'Professional Tool', 3, '2024-02-01', 25, 23, 89.99, 'C-1-05'),
('SUPPLY-004', 'Office Supplies Pack', 4, '2024-02-05', 200, 175, 8.75, 'D-3-02'),
('PART-005', 'Replacement Part', 5, '2024-02-10', 150, 140, 15.25, 'A-2-04');

INSERT INTO shopify_stores (store_name, shop_domain, is_active) VALUES
('Main Store', 'mystore.myshopify.com', true),
('Outlet Store', 'outlet.myshopify.com', true),
('B2B Store', 'wholesale.myshopify.com', false);

INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, order_date, total_amount, fulfillment_status, financial_status) VALUES
(1001, 1, '#1001', 'customer1@example.com', 'John Doe', '2024-01-22 10:30:00', 187.50, 'fulfilled', 'paid'),
(1002, 1, '#1002', 'customer2@example.com', 'Jane Smith', '2024-01-23 14:15:00', 270.00, 'fulfilled', 'paid'),
(1003, 2, '#1003', 'customer3@example.com', 'Bob Johnson', '2024-01-24 09:45:00', 179.98, 'pending', 'paid'),
(1004, 1, '#1004', 'customer4@example.com', 'Alice Brown', '2024-01-25 16:20:00', 52.50, 'fulfilled', 'paid'),
(1005, 1, '#1005', 'customer5@example.com', 'Charlie Wilson', '2024-01-26 11:10:00', 91.50, 'pending', 'pending');

INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES
(1, 'WIDGET-001', 'Premium Widget', 15, 12.50),
(2, 'GADGET-002', 'Smart Gadget', 6, 45.00),
(3, 'TOOL-003', 'Professional Tool', 2, 89.99),
(4, 'SUPPLY-004', 'Office Supplies Pack', 6, 8.75),
(5, 'PART-005', 'Replacement Part', 6, 15.25);

-- Enable Row Level Security (RLS) - Optional for development
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (development only)
-- CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
-- CREATE POLICY "Enable all access for all users" ON purchase_orders FOR ALL USING (true);
-- CREATE POLICY "Enable all access for all users" ON po_items FOR ALL USING (true);
-- CREATE POLICY "Enable all access for all users" ON inventory FOR ALL USING (true);
-- CREATE POLICY "Enable all access for all users" ON shopify_stores FOR ALL USING (true);
-- CREATE POLICY "Enable all access for all users" ON shopify_orders FOR ALL USING (true);
-- CREATE POLICY "Enable all access for all users" ON shopify_order_items FOR ALL USING (true);

COMMIT;
