import { Pool } from "pg"

async function resetDatabase() {
  console.log("🔄 Starting complete database reset...")

  // Connect to postgres database first to drop/create warehouse_management
  const postgresPool = new Pool({
    user: process.env.DB_USER || "warehouse_user",
    host: process.env.DB_HOST || "localhost",
    database: "postgres", // Connect to postgres database first
    password: process.env.DB_PASSWORD || "1",
    port: Number.parseInt(process.env.DB_PORT || "5432"),
  })

  try {
    console.log("🔌 Connecting to PostgreSQL...")

    // Terminate all connections to warehouse_management database
    console.log("🔌 Terminating existing connections...")
    await postgresPool.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'warehouse_management' AND pid <> pg_backend_pid();
    `)

    // Drop database if exists
    console.log("🗑️ Dropping existing database...")
    await postgresPool.query("DROP DATABASE IF EXISTS warehouse_management;")

    // Drop user if exists
    console.log("👤 Dropping existing user...")
    await postgresPool.query("DROP USER IF EXISTS warehouse_user;")

    // Create user
    console.log("👤 Creating warehouse_user...")
    await postgresPool.query("CREATE USER warehouse_user WITH PASSWORD '1';")

    // Create database
    console.log("🗄️ Creating warehouse_management database...")
    await postgresPool.query("CREATE DATABASE warehouse_management OWNER warehouse_user;")

    // Grant privileges on database
    console.log("🔐 Granting database privileges...")
    await postgresPool.query("GRANT ALL PRIVILEGES ON DATABASE warehouse_management TO warehouse_user;")

    await postgresPool.end()

    // Now connect to the new database to create tables
    const warehousePool = new Pool({
      user: process.env.DB_USER || "warehouse_user",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "warehouse_management",
      password: process.env.DB_PASSWORD || "1",
      port: Number.parseInt(process.env.DB_PORT || "5432"),
    })

    console.log("🔌 Connecting to warehouse_management database...")

    // Grant schema privileges
    console.log("🔐 Setting up schema privileges...")
    await warehousePool.query("GRANT ALL ON SCHEMA public TO warehouse_user;")
    await warehousePool.query("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO warehouse_user;")
    await warehousePool.query("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO warehouse_user;")
    await warehousePool.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO warehouse_user;")
    await warehousePool.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO warehouse_user;")

    // Create tables
    console.log("🏗️ Creating tables...")

    // Purchase Orders table
    await warehousePool.query(`
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
    `)
    console.log("✅ Created purchase_orders table")

    // Purchase Order Items table
    await warehousePool.query(`
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
    `)
    console.log("✅ Created po_items table")

    // Products table
    await warehousePool.query(`
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
    `)
    console.log("✅ Created products table")

    // Inventory table
    await warehousePool.query(`
      CREATE TABLE inventory (
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
    await warehousePool.query(`
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
    `)
    console.log("✅ Created shopify_stores table")

    // Shopify Orders table
    await warehousePool.query(`
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
    `)
    console.log("✅ Created shopify_orders table")

    // Shopify Order Items table
    await warehousePool.query(`
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
    `)
    console.log("✅ Created shopify_order_items table")

    // Sales Fulfillment table
    await warehousePool.query(`
      CREATE TABLE sales_fulfillment (
        id SERIAL PRIMARY KEY,
        order_item_id INTEGER REFERENCES shopify_order_items(id) ON DELETE CASCADE,
        inventory_id INTEGER REFERENCES inventory(id) ON DELETE CASCADE,
        quantity_used INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    console.log("✅ Created sales_fulfillment table")

    // Create indexes
    console.log("📊 Creating indexes...")
    await warehousePool.query("CREATE INDEX idx_po_items_sku ON po_items(sku);")
    await warehousePool.query("CREATE INDEX idx_products_sku ON products(sku);")
    await warehousePool.query("CREATE INDEX idx_inventory_product_id ON inventory(product_id);")
    await warehousePool.query("CREATE INDEX idx_shopify_orders_date ON shopify_orders(order_date);")
    await warehousePool.query("CREATE INDEX idx_shopify_order_items_sku ON shopify_order_items(sku);")
    await warehousePool.query("CREATE INDEX idx_sales_fulfillment_order_item ON sales_fulfillment(order_item_id);")
    console.log("✅ Created indexes")

    // Create views
    console.log("👁️ Creating views...")
    await warehousePool.query(`
      CREATE VIEW product_inventory_summary AS
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

    await warehousePool.query(`
      CREATE VIEW profit_analysis AS
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
    console.log("✅ Created views")

    // Insert sample data
    console.log("🌱 Inserting sample data...")

    // Sample products
    await warehousePool.query(`
      INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES
      ('WH-001', 'Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 10, 100),
      ('SW-002', 'Smart Watch', 'Fitness tracking smartwatch with heart rate monitor', 5, 50),
      ('PC-003', 'Phone Case', 'Protective case for smartphones - universal fit', 25, 200),
      ('BS-004', 'Bluetooth Speaker', 'Portable wireless speaker with premium sound', 8, 80),
      ('CB-005', 'USB Cable', 'High-speed USB-C charging cable - 6ft', 50, 500),
      ('TB-006', 'Tablet Stand', 'Adjustable tablet stand for desk use', 15, 100),
      ('KD-007', 'Wireless Keyboard', 'Bluetooth keyboard with backlight', 10, 60);
    `)
    console.log("✅ Inserted products")

    // Sample purchase orders
    await warehousePool.query(`
      INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES
      ('PO-2024-001', 'Tech Supplies Co.', '2024-01-15', 150.00, 'Delivered', 'Initial stock order for Q1'),
      ('PO-2024-002', 'Electronics Hub', '2024-01-18', 75.00, 'Delivered', 'Restocking popular items'),
      ('PO-2024-003', 'Global Gadgets', '2024-01-22', 200.00, 'Pending', 'Large order for new product line'),
      ('PO-2024-004', 'Premium Tech', '2024-01-25', 125.00, 'Approved', 'Rush order for high-demand items');
    `)
    console.log("✅ Inserted purchase orders")

    // Sample PO items
    await warehousePool.query(`
      INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES
      (1, 'WH-001', 'Wireless Headphones', 50, 75.00),
      (1, 'SW-002', 'Smart Watch', 25, 120.00),
      (1, 'PC-003', 'Phone Case', 100, 15.00),
      (2, 'BS-004', 'Bluetooth Speaker', 30, 85.00),
      (2, 'CB-005', 'USB Cable', 200, 8.50),
      (2, 'WH-001', 'Wireless Headphones', 25, 72.00),
      (3, 'TB-006', 'Tablet Stand', 40, 28.00),
      (3, 'KD-007', 'Wireless Keyboard', 35, 45.00),
      (3, 'SW-002', 'Smart Watch', 20, 118.00),
      (4, 'PC-003', 'Phone Case', 150, 14.50),
      (4, 'CB-005', 'USB Cable', 100, 8.75),
      (4, 'BS-004', 'Bluetooth Speaker', 20, 82.00);
    `)
    console.log("✅ Inserted PO items")

    // Sample inventory
    await warehousePool.query(`
      INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES
      (1, 1, 45, 75.00, '2024-01-15'),
      (2, 2, 22, 120.00, '2024-01-15'),
      (3, 3, 95, 15.00, '2024-01-15'),
      (4, 4, 28, 85.00, '2024-01-18'),
      (5, 5, 180, 8.50, '2024-01-18'),
      (1, 6, 23, 72.00, '2024-01-18');
    `)
    console.log("✅ Inserted inventory")

    // Sample Shopify stores
    await warehousePool.query(`
      INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES
      ('Main Electronics Store', 'main-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store1', 'Active', '2024-01-26 10:30:00'),
      ('EU Electronics Hub', 'eu-electronics.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store2', 'Active', '2024-01-26 09:15:00'),
      ('Mobile Accessories Store', 'mobile-accessories.myshopify.com', 'shpat_***************', 'https://yourapp.com/webhook/store3', 'Inactive', '2024-01-25 16:45:00');
    `)
    console.log("✅ Inserted Shopify stores")

    await warehousePool.end()

    console.log("🎉 Database reset completed successfully!")
    console.log("📋 Summary:")
    console.log("   - Database: warehouse_management")
    console.log("   - User: warehouse_user")
    console.log("   - Tables: 8 created")
    console.log("   - Views: 2 created")
    console.log("   - Sample data: Inserted")
  } catch (error) {
    console.error("❌ Database reset failed:", error)
    process.exit(1)
  }
}

resetDatabase().catch((error) => {
  console.error("❌ Script error:", error)
  process.exit(1)
})
