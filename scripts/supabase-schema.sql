-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create products table
CREATE TABLE IF NOT EXISTS products (
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
CREATE TABLE IF NOT EXISTS purchase_orders (
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
CREATE TABLE IF NOT EXISTS po_items (
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
CREATE TABLE IF NOT EXISTS inventory (
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
CREATE TABLE IF NOT EXISTS shopify_stores (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    shop_domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopify_orders table
CREATE TABLE IF NOT EXISTS shopify_orders (
    id SERIAL PRIMARY KEY,
    shopify_order_id BIGINT UNIQUE NOT NULL,
    store_id INTEGER REFERENCES shopify_stores(id),
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
CREATE TABLE IF NOT EXISTS shopify_order_items (
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
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_po_id ON inventory(po_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_order_id ON shopify_order_items(order_id);

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

-- Create profit_analysis view
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
('WIDGET-001', 'Premium Widget', 'High-quality widget for industrial use', 'Widgets', 'each', 50),
('GADGET-002', 'Smart Gadget', 'IoT-enabled smart gadget', 'Electronics', 'each', 25),
('TOOL-003', 'Professional Tool', 'Heavy-duty professional tool', 'Tools', 'each', 10),
('PART-004', 'Replacement Part', 'Universal replacement part', 'Parts', 'each', 100),
('SUPPLY-005', 'Office Supply', 'Essential office supply item', 'Supplies', 'box', 200)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Widget Suppliers Inc', '2024-01-15', 25.00, 'Delivered', 'First quarter order'),
('PO-2024-002', 'Tech Gadgets Ltd', '2024-01-20', 15.50, 'Pending', 'Rush order for new product line'),
('PO-2024-003', 'Tool Masters Co', '2024-01-25', 35.75, 'In Transit', 'Bulk order with discount'),
('PO-2024-004', 'Parts Warehouse', '2024-02-01', 12.25, 'Delivered', 'Regular monthly order'),
('PO-2024-005', 'Office Depot Pro', '2024-02-05', 8.00, 'Processing', 'Office supplies restock')
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(1, 'WIDGET-001', 'Premium Widget', 100, 12.50),
(1, 'PART-004', 'Replacement Part', 200, 3.25),
(2, 'GADGET-002', 'Smart Gadget', 50, 45.00),
(3, 'TOOL-003', 'Professional Tool', 25, 89.99),
(4, 'PART-004', 'Replacement Part', 500, 3.00),
(5, 'SUPPLY-005', 'Office Supply', 100, 15.75);

INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location) VALUES
('WIDGET-001', 'Premium Widget', 1, '2024-01-20', 100, 85, 12.50, 'A-1-01'),
('PART-004', 'Replacement Part', 1, '2024-01-20', 200, 150, 3.25, 'B-2-03'),
('GADGET-002', 'Smart Gadget', 2, '2024-01-25', 50, 45, 45.00, 'C-1-02'),
('TOOL-003', 'Professional Tool', 3, '2024-02-01', 25, 20, 89.99, 'A-3-01'),
('PART-004', 'Replacement Part', 4, '2024-02-05', 500, 425, 3.00, 'B-2-04'),
('SUPPLY-005', 'Office Supply', 5, '2024-02-10', 100, 90, 15.75, 'D-1-01');

INSERT INTO shopify_stores (store_name, shop_domain, is_active) VALUES
('Main Store', 'mystore.myshopify.com', true),
('Wholesale Store', 'wholesale.myshopify.com', true),
('Outlet Store', 'outlet.myshopify.com', false)
ON CONFLICT (shop_domain) DO NOTHING;

INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, order_date, total_amount, fulfillment_status, financial_status) VALUES
(1001, 1, '#1001', 'customer1@example.com', 'John Smith', '2024-01-22 10:30:00', 87.50, 'fulfilled', 'paid'),
(1002, 1, '#1002', 'customer2@example.com', 'Jane Doe', '2024-01-23 14:15:00', 135.00, 'fulfilled', 'paid'),
(1003, 2, '#2001', 'wholesale@company.com', 'ABC Company', '2024-01-24 09:00:00', 450.00, 'partial', 'paid'),
(1004, 1, '#1003', 'customer3@example.com', 'Bob Johnson', '2024-01-25 16:45:00', 179.98, 'unfulfilled', 'pending')
ON CONFLICT (shopify_order_id) DO NOTHING;

INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES
(1, 'WIDGET-001', 'Premium Widget', 2, 25.00),
(1, 'PART-004', 'Replacement Part', 5, 7.50),
(2, 'GADGET-002', 'Smart Gadget', 3, 45.00),
(3, 'TOOL-003', 'Professional Tool', 5, 90.00),
(4, 'WIDGET-001', 'Premium Widget', 4, 25.00),
(4, 'TOOL-003', 'Professional Tool', 1, 89.99);

-- Enable Row Level Security (optional, for production)
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for production)
-- CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
-- CREATE POLICY "Enable all access for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');
