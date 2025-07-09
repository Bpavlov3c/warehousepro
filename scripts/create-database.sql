-- Create database schema for Warehouse Management System

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
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_shopify_stores_status ON shopify_stores(status);

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
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_purchase_orders_updated_at 
    BEFORE UPDATE ON purchase_orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Show table creation summary
SELECT 'Database schema created successfully!' as status;
SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
