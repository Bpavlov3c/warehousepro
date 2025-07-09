import { PurchaseOrderStore, InventoryStore, ShopifyStoreStore } from "../lib/db-store"
import { testConnection } from "../lib/database"

async function seedData() {
  console.log("🌱 Starting database seeding...")

  // Test connection first
  const connected = await testConnection()
  if (!connected) {
    console.error("❌ Database connection failed. Exiting...")
    process.exit(1)
  }

  try {
    // Seed Purchase Orders
    console.log("📦 Seeding purchase orders...")
    const purchaseOrders = [
      {
        po_number: "PO-2024-001",
        supplier_name: "ABC Electronics",
        order_date: "2024-01-15",
        expected_delivery: "2024-01-25",
        status: "pending" as const,
        total_amount: 1250.0,
        notes: "Urgent order for Q1 inventory",
      },
      {
        po_number: "PO-2024-002",
        supplier_name: "Tech Components Ltd",
        order_date: "2024-01-18",
        expected_delivery: "2024-01-28",
        status: "approved" as const,
        total_amount: 2100.5,
        notes: "Regular monthly order",
      },
      {
        po_number: "PO-2024-003",
        supplier_name: "Global Parts Inc",
        order_date: "2024-01-20",
        expected_delivery: "2024-02-01",
        status: "received" as const,
        total_amount: 875.25,
        notes: "Replacement parts for defective items",
      },
    ]

    for (const po of purchaseOrders) {
      await PurchaseOrderStore.create(po)
    }
    console.log(`✅ Created ${purchaseOrders.length} purchase orders`)

    // Seed Inventory Items
    console.log("📋 Seeding inventory items...")
    const inventoryItems = [
      {
        sku: "ELEC-001",
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse with USB receiver",
        category: "Electronics",
        quantity: 150,
        unit_price: 25.99,
        reorder_level: 20,
        supplier: "ABC Electronics",
      },
      {
        sku: "ELEC-002",
        name: "Bluetooth Keyboard",
        description: "Compact bluetooth keyboard for tablets and phones",
        category: "Electronics",
        quantity: 75,
        unit_price: 45.5,
        reorder_level: 15,
        supplier: "Tech Components Ltd",
      },
      {
        sku: "CABLE-001",
        name: "USB-C Cable",
        description: "3ft USB-C to USB-A cable",
        category: "Cables",
        quantity: 200,
        unit_price: 12.99,
        reorder_level: 50,
        supplier: "Global Parts Inc",
      },
      {
        sku: "CASE-001",
        name: "Phone Case",
        description: "Protective case for smartphones",
        category: "Accessories",
        quantity: 100,
        unit_price: 18.75,
        reorder_level: 25,
        supplier: "ABC Electronics",
      },
      {
        sku: "SCREEN-001",
        name: "Screen Protector",
        description: "Tempered glass screen protector",
        category: "Accessories",
        quantity: 300,
        unit_price: 8.99,
        reorder_level: 75,
        supplier: "Tech Components Ltd",
      },
    ]

    for (const item of inventoryItems) {
      await InventoryStore.create(item)
    }
    console.log(`✅ Created ${inventoryItems.length} inventory items`)

    // Seed Shopify Stores
    console.log("🏪 Seeding Shopify stores...")
    const shopifyStores = [
      {
        store_name: "Main Electronics Store",
        shop_domain: "main-electronics.myshopify.com",
        access_token: "shpat_example_token_1234567890abcdef",
        is_active: true,
      },
      {
        store_name: "Mobile Accessories Shop",
        shop_domain: "mobile-accessories.myshopify.com",
        access_token: "shpat_example_token_abcdef1234567890",
        is_active: true,
      },
      {
        store_name: "Tech Gadgets Store",
        shop_domain: "tech-gadgets.myshopify.com",
        access_token: "shpat_example_token_fedcba0987654321",
        is_active: false,
      },
    ]

    for (const store of shopifyStores) {
      await ShopifyStoreStore.create(store)
    }
    console.log(`✅ Created ${shopifyStores.length} Shopify stores`)

    console.log("🎉 Database seeding completed successfully!")
  } catch (error) {
    console.error("❌ Error seeding data:", error)
    process.exit(1)
  }
}

// Run the script
seedData()
