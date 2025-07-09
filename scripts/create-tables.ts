import { executeQuery } from "../lib/database"

async function createTables() {
  console.log("🏗️ Creating warehouse management database tables...")

  try {
    // Purchase Orders table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
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
    `)
    console.log("✅ Created purchase_orders table")

    // Purchase Order Items table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS po_items (
        id SERIAL PRIMARY KEY,
        po_id INTEGER REFERENCES purchase_orders(id) ON DELETE CASCADE,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("✅ Created po_items table")

    // Products table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,  
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        min_stock INTEGER DEFAULT 0,
        max_stock INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("✅ Created products table")

    // Inventory table (FIFO tracking)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        po_item_id INTEGER REFERENCES po_items(id) ON DELETE CASCADE,
        quantity_available INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        purchase_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("✅ Created inventory table")

    // Shopify Stores table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_stores (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        shopify_domain VARCHAR(255) NOT NULL,
        access_token VARCHAR(255) NOT NULL,
        webhook_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'Active',
        last_sync TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("✅ Created shopify_stores table")

    // Shopify Orders table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_orders (
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
    `)
    console.log("✅ Created shopify_orders table")

    // Shopify Order Items table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES shopify_orders(id) ON DELETE CASCADE,
        sku VARCHAR(100) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("✅ Created shopify_order_items table")

    // Sales Fulfillment table (FIFO cost tracking)
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sales_fulfillment (
        id SERIAL PRIMARY KEY,
        order_item_id INTEGER REFERENCES shopify_order_items(id) ON DELETE CASCADE,
        inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
        quantity_used INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("✅ Created sales_fulfillment table")

    // Create indexes for better performance
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_po_items_sku ON po_items(sku);`)
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);`)
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);`)
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_shopify_orders_date ON shopify_orders(order_date);`)
    await executeQuery(`CREATE INDEX IF NOT EXISTS idx_shopify_order_items_sku ON shopify_order_items(sku);`)
    await executeQuery(
      `CREATE INDEX IF NOT EXISTS idx_sales_fulfillment_order_item ON sales_fulfillment(order_item_id);`,
    )
    console.log("✅ Created database indexes")

    // Create views for reporting
    await executeQuery(`
      CREATE OR REPLACE VIEW product_inventory_summary AS
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
    `)
    console.log("✅ Created product_inventory_summary view")

    await executeQuery(`
      CREATE OR REPLACE VIEW profit_analysis AS
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
    `)
    console.log("✅ Created profit_analysis view")

    console.log("🎉 All warehouse management tables created successfully!")
  } catch (error) {
    console.error("❌ Error creating tables:", error)
    process.exit(1)
  }
}

createTables().catch((error) => {
  console.error("❌ Script error:", error)
  process.exit(1)
})
