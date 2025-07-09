import { executeQuery } from "../lib/database"

async function seedData() {
  console.log("🌱 Seeding warehouse management database with sample data...")

  try {
    // Clear existing data (in dependency order)
    await executeQuery("DELETE FROM sales_fulfillment")
    await executeQuery("DELETE FROM shopify_order_items")
    await executeQuery("DELETE FROM shopify_orders")
    await executeQuery("DELETE FROM shopify_stores")
    await executeQuery("DELETE FROM inventory")
    await executeQuery("DELETE FROM po_items")
    await executeQuery("DELETE FROM purchase_orders")
    await executeQuery("DELETE FROM products")
    console.log("🧹 Cleared existing data")

    // Reset sequences
    await executeQuery("ALTER SEQUENCE purchase_orders_id_seq RESTART WITH 1")
    await executeQuery("ALTER SEQUENCE po_items_id_seq RESTART WITH 1")
    await executeQuery("ALTER SEQUENCE products_id_seq RESTART WITH 1")
    await executeQuery("ALTER SEQUENCE inventory_id_seq RESTART WITH 1")
    await executeQuery("ALTER SEQUENCE shopify_stores_id_seq RESTART WITH 1")
    await executeQuery("ALTER SEQUENCE shopify_orders_id_seq RESTART WITH 1")
    await executeQuery("ALTER SEQUENCE shopify_order_items_id_seq RESTART WITH 1")
    await executeQuery("ALTER SEQUENCE sales_fulfillment_id_seq RESTART WITH 1")
    console.log("🔄 Reset sequences")

    // Insert sample products
    const products = [
      ["WH-001", "Wireless Headphones", "High-quality wireless headphones with noise cancellation", 10, 100],
      ["SW-002", "Smart Watch", "Fitness tracking smartwatch with heart rate monitor", 5, 50],
      ["PC-003", "Phone Case", "Protective case for smartphones - universal fit", 25, 200],
      ["BS-004", "Bluetooth Speaker", "Portable wireless speaker with premium sound", 8, 80],
      ["CB-005", "USB Cable", "High-speed USB-C charging cable - 6ft", 50, 500],
      ["TB-006", "Tablet Stand", "Adjustable tablet stand for desk use", 15, 100],
      ["KD-007", "Wireless Keyboard", "Bluetooth keyboard with backlight", 10, 60],
    ]

    for (const [sku, name, description, min_stock, max_stock] of products) {
      await executeQuery(
        `INSERT INTO products (sku, name, description, min_stock, max_stock) VALUES ($1, $2, $3, $4, $5)`,
        [sku, name, description, min_stock, max_stock],
      )
    }
    console.log("✅ Seeded products")

    // Insert sample purchase orders
    const purchaseOrders = [
      ["PO-2024-001", "Tech Supplies Co.", "2024-01-15", 150.0, "Delivered", "Initial stock order for Q1"],
      ["PO-2024-002", "Electronics Hub", "2024-01-18", 75.0, "Delivered", "Restocking popular items"],
      ["PO-2024-003", "Global Gadgets", "2024-01-22", 200.0, "Pending", "Large order for new product line"],
      ["PO-2024-004", "Premium Tech", "2024-01-25", 125.0, "Approved", "Rush order for high-demand items"],
    ]

    for (const [po_number, supplier_name, po_date, delivery_cost, status, notes] of purchaseOrders) {
      await executeQuery(
        `INSERT INTO purchase_orders (po_number, supplier_name, po_date, delivery_cost, status, notes) VALUES ($1, $2, $3, $4, $5, $6)`,
        [po_number, supplier_name, po_date, delivery_cost, status, notes],
      )
    }
    console.log("✅ Seeded purchase orders")

    // Insert PO items
    const poItems = [
      // PO-2024-001 items
      [1, "WH-001", "Wireless Headphones", 50, 75.0],
      [1, "SW-002", "Smart Watch", 25, 120.0],
      [1, "PC-003", "Phone Case", 100, 15.0],
      // PO-2024-002 items
      [2, "BS-004", "Bluetooth Speaker", 30, 85.0],
      [2, "CB-005", "USB Cable", 200, 8.5],
      [2, "WH-001", "Wireless Headphones", 25, 72.0],
      // PO-2024-003 items (pending)
      [3, "TB-006", "Tablet Stand", 40, 28.0],
      [3, "KD-007", "Wireless Keyboard", 35, 45.0],
      [3, "SW-002", "Smart Watch", 20, 118.0],
      // PO-2024-004 items (approved)
      [4, "PC-003", "Phone Case", 150, 14.5],
      [4, "CB-005", "USB Cable", 100, 8.75],
      [4, "BS-004", "Bluetooth Speaker", 20, 82.0],
    ]

    for (const [po_id, sku, product_name, quantity, unit_cost] of poItems) {
      await executeQuery(
        `INSERT INTO po_items (po_id, sku, product_name, quantity, unit_cost) VALUES ($1, $2, $3, $4, $5)`,
        [po_id, sku, product_name, quantity, unit_cost],
      )
    }
    console.log("✅ Seeded PO items")

    // Insert inventory for delivered orders (FIFO tracking)
    const inventoryItems = [
      // From PO-2024-001 (delivered)
      [1, 1, 45, 75.0, "2024-01-15"], // WH-001: 45 remaining (5 sold)
      [2, 2, 22, 120.0, "2024-01-15"], // SW-002: 22 remaining (3 sold)
      [3, 3, 95, 15.0, "2024-01-15"], // PC-003: 95 remaining (5 sold)
      // From PO-2024-002 (delivered)
      [4, 4, 28, 85.0, "2024-01-18"], // BS-004: 28 remaining (2 sold)
      [5, 5, 180, 8.5, "2024-01-18"], // CB-005: 180 remaining (20 sold)
      [1, 6, 23, 72.0, "2024-01-18"], // WH-001: 23 remaining (2 sold from newer batch)
    ]

    for (const [product_id, po_item_id, quantity_available, unit_cost, purchase_date] of inventoryItems) {
      await executeQuery(
        `INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date) VALUES ($1, $2, $3, $4, $5)`,
        [product_id, po_item_id, quantity_available, unit_cost, purchase_date],
      )
    }
    console.log("✅ Seeded inventory")

    // Insert sample Shopify stores
    const shopifyStores = [
      [
        "Main Electronics Store",
        "main-electronics.myshopify.com",
        "shpat_***************",
        "https://yourapp.com/webhook/store1",
        "Active",
        "2024-01-26 10:30:00",
      ],
      [
        "EU Electronics Hub",
        "eu-electronics.myshopify.com",
        "shpat_***************",
        "https://yourapp.com/webhook/store2",
        "Active",
        "2024-01-26 09:15:00",
      ],
      [
        "Mobile Accessories Store",
        "mobile-accessories.myshopify.com",
        "shpat_***************",
        "https://yourapp.com/webhook/store3",
        "Inactive",
        "2024-01-25 16:45:00",
      ],
    ]

    for (const [name, shopify_domain, access_token, webhook_url, status, last_sync] of shopifyStores) {
      await executeQuery(
        `INSERT INTO shopify_stores (name, shopify_domain, access_token, webhook_url, status, last_sync) VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, shopify_domain, access_token, webhook_url, status, last_sync],
      )
    }
    console.log("✅ Seeded Shopify stores")

    // Insert sample Shopify orders
    const shopifyOrders = [
      [
        1,
        "5234567890123",
        "#1001",
        "John Doe",
        "john@example.com",
        "2024-01-20 14:30:00",
        "fulfilled",
        299.99,
        9.99,
        24.0,
        0.0,
        "123 Main St, New York, NY 10001",
      ],
      [
        1,
        "5234567890124",
        "#1002",
        "Jane Smith",
        "jane@example.com",
        "2024-01-21 10:15:00",
        "pending",
        189.99,
        12.99,
        15.2,
        5.0,
        "456 Oak Ave, Los Angeles, CA 90210",
      ],
      [
        2,
        "5234567890125",
        "#2001",
        "Bob Johnson",
        "bob@example.com",
        "2024-01-22 16:20:00",
        "shipped",
        159.99,
        7.99,
        12.8,
        0.0,
        "789 Pine St, Chicago, IL 60601",
      ],
      [
        1,
        "5234567890126",
        "#1003",
        "Alice Brown",
        "alice@example.com",
        "2024-01-23 11:45:00",
        "fulfilled",
        89.99,
        8.99,
        7.2,
        10.0,
        "321 Elm Rd, Houston, TX 77001",
      ],
      [
        3,
        "5234567890127",
        "#3001",
        "Charlie Wilson",
        "charlie@example.com",
        "2024-01-24 13:30:00",
        "cancelled",
        45.99,
        5.99,
        3.68,
        0.0,
        "654 Maple Dr, Phoenix, AZ 85001",
      ],
    ]

    for (const [
      store_id,
      shopify_order_id,
      order_number,
      customer_name,
      customer_email,
      order_date,
      status,
      total_amount,
      shipping_cost,
      tax_amount,
      discount_amount,
      shipping_address,
    ] of shopifyOrders) {
      await executeQuery(
        `INSERT INTO shopify_orders (store_id, shopify_order_id, order_number, customer_name, customer_email, order_date, status, total_amount, shipping_cost, tax_amount, discount_amount, shipping_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          store_id,
          shopify_order_id,
          order_number,
          customer_name,
          customer_email,
          order_date,
          status,
          total_amount,
          shipping_cost,
          tax_amount,
          discount_amount,
          shipping_address,
        ],
      )
    }
    console.log("✅ Seeded Shopify orders")

    // Insert Shopify order items
    const orderItems = [
      // Order #1001
      [1, "WH-001", "Wireless Headphones", 2, 149.99],
      // Order #1002
      [2, "SW-002", "Smart Watch", 1, 189.99],
      // Order #2001
      [3, "BS-004", "Bluetooth Speaker", 1, 129.99],
      [3, "PC-003", "Phone Case", 2, 15.0],
      // Order #1003
      [4, "CB-005", "USB Cable", 3, 12.99],
      [4, "PC-003", "Phone Case", 2, 16.99],
      // Order #3001 (cancelled)
      [5, "PC-003", "Phone Case", 3, 15.33],
    ]

    for (const [order_id, sku, product_name, quantity, unit_price] of orderItems) {
      await executeQuery(
        `INSERT INTO shopify_order_items (order_id, sku, product_name, quantity, unit_price) VALUES ($1, $2, $3, $4, $5)`,
        [order_id, sku, product_name, quantity, unit_price],
      )
    }
    console.log("✅ Seeded Shopify order items")

    // Insert sales fulfillment records (FIFO cost tracking)
    const fulfillmentRecords = [
      // Order #1001: 2x WH-001
      [1, 1, 2, 75.0],
      // Order #1002: 1x SW-002
      [2, 2, 1, 120.0],
      // Order #2001: 1x BS-004, 2x PC-003
      [3, 4, 1, 85.0],
      [4, 3, 2, 15.0],
      // Order #1003: 3x CB-005, 2x PC-003
      [5, 5, 3, 8.5],
      [6, 3, 2, 15.0],
    ]

    for (const [order_item_id, inventory_id, quantity_used, unit_cost] of fulfillmentRecords) {
      await executeQuery(
        `INSERT INTO sales_fulfillment (order_item_id, inventory_id, quantity_used, unit_cost) VALUES ($1, $2, $3, $4)`,
        [order_item_id, inventory_id, quantity_used, unit_cost],
      )
    }
    console.log("✅ Seeded sales fulfillment records")

    console.log("🎉 Sample data seeded successfully!")
  } catch (error) {
    console.error("❌ Error seeding data:", error)
    process.exit(1)
  }
}

seedData().catch((error) => {
  console.error("❌ Script error:", error)
  process.exit(1)
})
