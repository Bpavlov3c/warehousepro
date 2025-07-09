import { executeQuery } from "../lib/database"

async function createTables() {
  console.log("🏗️ Creating database tables...")

  try {
    // Create purchase_orders table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) NOT NULL UNIQUE,
        supplier_name VARCHAR(255) NOT NULL,
        order_date DATE NOT NULL,
        expected_delivery DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    console.log("✅ Created purchase_orders table")

    // Create inventory_items table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
        reorder_level INTEGER NOT NULL DEFAULT 0,
        supplier VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    console.log("✅ Created inventory_items table")

    // Create shopify_stores table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_stores (
        id SERIAL PRIMARY KEY,
        store_name VARCHAR(255) NOT NULL,
        shop_domain VARCHAR(255) NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    console.log("✅ Created shopify_stores table")

    // Create shopify_orders table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS shopify_orders (
        id SERIAL PRIMARY KEY,
        shopify_order_id BIGINT NOT NULL UNIQUE,
        store_id INTEGER REFERENCES shopify_stores(id),
        order_number VARCHAR(50) NOT NULL,
        customer_email VARCHAR(255),
        customer_name VARCHAR(255),
        total_price NUMERIC(10,2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        fulfillment_status VARCHAR(50),
        financial_status VARCHAR(50),
        order_date TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)
    console.log("✅ Created shopify_orders table")

    console.log("🎉 All tables created successfully!")
  } catch (error) {
    console.error("❌ Error creating tables:", error)
    process.exit(1)
  }
}

createTables().catch((error) => {
  console.error("❌ Script error:", error)
  process.exit(1)
})
