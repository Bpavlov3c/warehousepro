-- Supabase schema for Warehouse Management System
-- Run this in your Supabase SQL editor

-- Enable Row Level Security (RLS) for all tables
-- Note: You may want to configure RLS policies based on your authentication needs

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    unit_of_measure VARCHAR(50) DEFAULT 'units',
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(255) NOT NULL,
    po_date DATE NOT NULL,
    delivery_cost DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Delivered', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create po_items table
CREATE TABLE IF NOT EXISTS po_items (
    id BIGSERIAL PRIMARY KEY,
    po_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(100) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    po_id BIGINT REFERENCES purchase_orders(id) ON DELETE SET NULL,
    batch_date DATE NOT NULL,
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    quantity_remaining INTEGER NOT NULL CHECK (quantity_remaining >= 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    location VARCHAR(100),
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_remaining_not_greater_than_received 
        CHECK (quantity_remaining <= quantity_received)
);

-- Create shopify_stores table
CREATE TABLE IF NOT EXISTS shopify_stores (
    id BIGSERIAL PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    shop_domain VARCHAR(255) NOT NULL UNIQUE,
    access_token VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopify_orders table
CREATE TABLE IF NOT EXISTS shopify_orders (
    id BIGSERIAL PRIMARY KEY,
    shopify_order_id BIGINT NOT NULL,
    store_id BIGINT REFERENCES shopify_stores(id) ON DELETE CASCADE,
    order_number VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_name VARCHAR(255),
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    fulfillment_status VARCHAR(50),
    financial_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(shopify_order_id, store_id)
);

-- Create shopify_order_items table
CREATE TABLE IF NOT EXISTS shopify_order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT REFERENCES shopify_orders(id) ON DELETE CASCADE,
    shopify_variant_id BIGINT,
    sku VARCHAR(100),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON po_items(po_id);
CREATE INDEX IF NOT EXISTS idx_po_items_sku ON po_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_po_id ON inventory(po_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batch_date ON inventory(batch_date);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_id ON shopify_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_shopify_orders_order_date ON shopify_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_order_id ON shopify_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_shopify_order_items_sku ON shopify_order_items(sku);

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

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at 
    BEFORE UPDATE ON purchase_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at 
    BEFORE UPDATE ON inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_stores_updated_at 
    BEFORE UPDATE ON shopify_stores 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_orders_updated_at 
    BEFORE UPDATE ON shopify_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO products (sku, product_name, description, category, unit_of_measure, reorder_level) VALUES
('WIDGET-001', 'Premium Widget', 'High-quality widget for industrial use', 'Widgets', 'pieces', 50),
('GADGET-002', 'Smart Gadget', 'IoT-enabled smart gadget', 'Electronics', 'pieces', 25),
('TOOL-003', 'Professional Tool', 'Heavy-duty professional tool', 'Tools', 'pieces', 15),
('PART-004', 'Replacement Part', 'Universal replacement part', 'Parts', 'pieces', 100),
('ACCESSORY-005', 'Premium Accessory', 'High-end accessory item', 'Accessories', 'pieces', 30),
('COMPONENT-006', 'Electronic Component', 'Specialized electronic component', 'Electronics', 'pieces', 75),
('MATERIAL-007', 'Raw Material', 'Industrial raw material', 'Materials', 'kg', 200)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
('PO-2024-001', 'Widget Suppliers Inc', '2024-01-15', 25.00, 'Delivered', 'First order of the year'),
('PO-2024-002', 'Tech Components Ltd', '2024-01-20', 15.50, 'Delivered', 'Electronics restock'),
('PO-2024-003', 'Industrial Tools Co', '2024-02-01', 35.00, 'Approved', 'Tool maintenance stock'),
('PO-2024-004', 'Parts Warehouse', '2024-02-10', 12.75, 'Pending', 'Replacement parts order'),
('PO-2024-005', 'Premium Supplies', '2024-02-15', 28.25, 'Delivered', 'Accessory restock')
ON CONFLICT (po_number) DO NOTHING;

INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
(1, 'WIDGET-001', 'Premium Widget', 100, 12.50),
(1, 'PART-004', 'Replacement Part', 200, 3.25),
(2, 'GADGET-002', 'Smart Gadget', 50, 45.00),
(2, 'COMPONENT-006', 'Electronic Component', 150, 8.75),
(3, 'TOOL-003', 'Professional Tool', 25, 85.00),
(4, 'PART-004', 'Replacement Part', 300, 3.15),
(4, 'MATERIAL-007', 'Raw Material', 500, 2.50),
(5, 'ACCESSORY-005', 'Premium Accessory', 75, 22.00),
(5, 'WIDGET-001', 'Premium Widget', 50, 12.75)
ON CONFLICT DO NOTHING;

INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location) VALUES
('WIDGET-001', 'Premium Widget', 1, '2024-01-18', 100, 85, 12.50, 'A-01-01'),
('WIDGET-001', 'Premium Widget', 5, '2024-02-18', 50, 50, 12.75, 'A-01-02'),
('PART-004', 'Replacement Part', 1, '2024-01-18', 200, 180, 3.25, 'B-02-01'),
('PART-004', 'Replacement Part', 4, '2024-02-12', 300, 300, 3.15, 'B-02-02'),
('GADGET-002', 'Smart Gadget', 2, '2024-01-23', 50, 42, 45.00, 'C-03-01'),
('COMPONENT-006', 'Electronic Component', 2, '2024-01-23', 150, 135, 8.75, 'D-04-01'),
('TOOL-003', 'Professional Tool', 3, '2024-02-05', 25, 25, 85.00, 'E-05-01'),
('MATERIAL-007', 'Raw Material', 4, '2024-02-12', 500, 450, 2.50, 'F-06-01'),
('ACCESSORY-005', 'Premium Accessory', 5, '2024-02-18', 75, 68, 22.00, 'G-07-01')
ON CONFLICT DO NOTHING;

INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active) VALUES
('Main Store', 'mystore.myshopify.com', 'shpat_xxxxxxxxxxxxxxxxxxxxx', true),
('Wholesale Store', 'wholesale.myshopify.com', 'shpat_yyyyyyyyyyyyyyyyyyyyy', true),
('International Store', 'international.myshopify.com', 'shpat_zzzzzzzzzzzzzzzzzzzzz', false)
ON CONFLICT (shop_domain) DO NOTHING;

INSERT INTO shopify_orders (shopify_order_id, store_id, order_number, customer_email, customer_name, order_date, total_amount, currency, fulfillment_status, financial_status) VALUES
(1001, 1, '#1001', 'customer1@example.com', 'John Smith', '2024-01-25 10:30:00', 157.50, 'USD', 'fulfilled', 'paid'),
(1002, 1, '#1002', 'customer2@example.com', 'Jane Doe', '2024-01-28 14:15:00', 90.00, 'USD', 'fulfilled', 'paid'),
(1003, 2, '#2001', 'wholesale@company.com', 'ABC Company', '2024-02-02 09:00:00', 525.00, 'USD', 'fulfilled', 'paid'),
(1004, 1, '#1003', 'customer3@example.com', 'Bob Johnson', '2024-02-05 16:45:00', 262.50, 'USD', 'pending', 'paid'),
(1005, 1, '#1004', 'customer4@example.com', 'Alice Brown', '2024-02-08 11:20:00', 66.00, 'USD', 'fulfilled', 'paid')
ON CONFLICT (shopify_order_id, store_id) DO NOTHING;

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
(5, 10006, 'ACCESSORY-005', 'Premium Accessory', 1, 33.00)
ON CONFLICT DO NOTHING;

-- Enable RLS (Row Level Security) - Configure policies as needed
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_stores ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shopify_order_items ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (uncomment and modify as needed)
-- CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
-- CREATE POLICY "Enable insert for authenticated users only" ON products FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Display success message
SELECT 'Supabase schema setup completed successfully!' as message;
