import { executeQuery, testConnection } from "../lib/database"

async function createTables() {
  console.log("🚀 Starting database table creation...")

  // Test connection first
  const connected = await testConnection()
  if (!connected) {
    console.error("❌ Database connection failed. Exiting...")
    process.exit(1)
  }

  try {
    // Create purchase_orders table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(100) UNIQUE NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        order_date DATE NOT NULL,
        expected_delivery DATE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("✅ Created purchase_orders table")

    // Create inventory_items table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        quantity INTEGER DEFAULT 0,
        unit_price DECIMAL(10,2) NOT NULL,
        reorder_level INTEGER DEFAULT 10,
        supplier VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("✅ Created inventory_items table")

    // Create shopify_stores table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_stores (
        id SERIAL PRIMARY KEY,
        store_name VARCHAR(255) NOT NULL,
        shop_domain VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("✅ Created shopify_stores table")

    // Create shopify_orders table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_orders (
        id SERIAL PRIMARY KEY,
        shopify_order_id BIGINT UNIQUE NOT NULL,
        store_id INTEGER REFERENCES shopify_stores(id) ON DELETE CASCADE,
        order_number VARCHAR(100) NOT NULL,
        customer_email VARCHAR(255),
        customer_name VARCHAR(255),
        total_amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        fulfillment_status VARCHAR(50),
        financial_status VARCHAR(50),
        order_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log("✅ Created shopify_orders table")

    // Create indexes for better performance
    await executeQuery(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_sku ON inventory_items(sku);
      CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
      CREATE INDEX IF NOT EXISTS idx_shopify_orders_store_id ON shopify_orders(store_id);
      CREATE INDEX IF NOT EXISTS idx_shopify_orders_order_date ON shopify_orders(order_date);
    `)
    console.log("✅ Created database indexes")

    console.log("🎉 Database tables created successfully!")
  } catch (error) {
    console.error("❌ Error creating tables:", error)
    process.exit(1)
  }
}

// Run the script
createTables()
