-- Create database schema for Warehouse Management System

-- Purchase Orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier VARCHAR(255) NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchase Order Items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
    delivery_cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (delivery_cost_per_unit >= 0),
    total_cost DECIMAL(12,2) NOT NULL CHECK (total_cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Inventory Items table
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    reserved_stock INTEGER NOT NULL DEFAULT 0 CHECK (reserved_stock >= 0),
    available_stock INTEGER GENERATED ALWAYS AS (current_stock - reserved_stock) STORED,
    reorder_point INTEGER NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
    reorder_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reorder_quantity >= 0),
    average_cost DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (average_cost >= 0),
    location VARCHAR(100),
    supplier VARCHAR(255),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory Transactions table (for tracking stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('purchase', 'sale', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    reference VARCHAR(255), -- Reference to PO, SO, etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopify Stores table
CREATE TABLE IF NOT EXISTS shopify_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    access_token TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_sku ON purchase_order_items(sku);

CREATE INDEX idx_po_items_sku ON po_items(sku);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_shopify_orders_date ON shopify_orders(order_date);
CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);
CREATE INDEX idx_sales_fulfillment_order_item ON sales_fulfillment(order_item_id);
CREATE INDEX idx_shopify_stores_status ON shopify_stores(status);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_items_supplier ON inventory_items(supplier);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id ON inventory_transactions(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_at ON inventory_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_shopify_stores_domain ON shopify_stores(domain);
CREATE INDEX IF NOT EXISTS idx_shopify_stores_is_active ON shopify_stores(is_active);

-- Create views for reporting
CREATE VIEW product_inventory_summary AS
SELECT 
    p.sku,
    p.name,
    COALESCE(SUM(i.quantity_available), 0) as current_stock,
    COALESCE(AVG(i.unit_cost), 0) as avg_cost,
    COALESCE(SUM(i.quantity_available * i.unit_cost), 0) as total_value,
    p.min_stock,
    p.max_stock,
    CASE 
        WHEN COALESCE(SUM(i.quantity_available), 0) <= p.min_stock THEN 'Low Stock'
        WHEN COALESCE(SUM(i.quantity_available), 0) >= p.max_stock THEN 'Overstock'
        ELSE 'Normal'
    END as stock_status
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
    SUM(soi.total_price) - COALESCE(SUM(sf.quantity_used * sf.unit_cost), 0) as gross_profit,
    CASE 
        WHEN SUM(soi.total_price) > 0 THEN 
            ((SUM(soi.total_price) - COALESCE(SUM(sf.quantity_used * sf.unit_cost), 0)) / SUM(soi.total_price)) * 100
        ELSE 0 
    END as profit_margin_percent
FROM shopify_order_items soi
LEFT JOIN sales_fulfillment sf ON soi.id = sf.order_item_id
GROUP BY soi.sku, soi.product_name;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_inventory_last_updated()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopify_stores_updated_at BEFORE UPDATE ON shopify_stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update inventory last_updated
CREATE TRIGGER update_inventory_items_last_updated BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_inventory_last_updated();

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;

-- Show table creation summary
SELECT 'Database schema created successfully!' as status;
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
