import { executeQuery } from "../lib/database"

async function seedData() {
  console.log("🌱 Seeding database with sample data...")

  try {
    // Clear existing data
    await executeQuery("DELETE FROM shopify_orders")
    await executeQuery("DELETE FROM shopify_stores")
    await executeQuery("DELETE FROM inventory_items")
    await executeQuery("DELETE FROM purchase_orders")
    console.log("🧹 Cleared existing data")

    // Seed purchase orders
    const purchaseOrders = [
      {
        po_number: "PO-2024-001",
        supplier_name: "Tech Supplies Inc",
        order_date: "2024-01-15",
        expected_delivery: "2024-01-25",
        status: "pending",
        total_amount: 1250.0,
        notes: "Urgent order for Q1 inventory",
      },
      {
        po_number: "PO-2024-002",
        supplier_name: "Office Equipment Co",
        order_date: "2024-01-18",
        expected_delivery: "2024-01-28",
        status: "approved",
        total_amount: 850.5,
        notes: "Standard monthly order",
      },
      {
        po_number: "PO-2024-003",
        supplier_name: "Electronics Wholesale",
        order_date: "2024-01-20",
        status: "received",
        total_amount: 2100.75,
        notes: "Received ahead of schedule",
      },
    ]

    for (const po of purchaseOrders) {
      await executeQuery(
        `
        INSERT INTO purchase_orders (po_number, supplier_name, order_date, expected_delivery, status, total_amount, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          po.po_number,
          po.supplier_name,
          po.order_date,
          po.expected_delivery || null,
          po.status,
          po.total_amount,
          po.notes,
        ],
      )
    }
    console.log("✅ Seeded purchase orders")

    // Seed inventory items
    const inventoryItems = [
      {
        sku: "LAPTOP-001",
        name: "Business Laptop",
        description: "High-performance laptop for business use",
        category: "Electronics",
        quantity: 25,
        unit_price: 899.99,
        reorder_level: 10,
        supplier: "Tech Supplies Inc",
      },
      {
        sku: "MOUSE-001",
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        category: "Electronics",
        quantity: 150,
        unit_price: 29.99,
        reorder_level: 50,
        supplier: "Office Equipment Co",
      },
      {
        sku: "DESK-001",
        name: "Standing Desk",
        description: "Adjustable height standing desk",
        category: "Furniture",
        quantity: 8,
        unit_price: 299.99,
        reorder_level: 5,
        supplier: "Office Equipment Co",
      },
      {
        sku: "PHONE-001",
        name: "Smartphone",
        description: "Latest model smartphone",
        category: "Electronics",
        quantity: 3,
        unit_price: 699.99,
        reorder_level: 10,
        supplier: "Electronics Wholesale",
      },
    ]

    for (const item of inventoryItems) {
      await executeQuery(
        `
        INSERT INTO inventory_items (sku, name, description, category, quantity, unit_price, reorder_level, supplier)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          item.sku,
          item.name,
          item.description,
          item.category,
          item.quantity,
          item.unit_price,
          item.reorder_level,
          item.supplier,
        ],
      )
    }
    console.log("✅ Seeded inventory items")

    // Seed Shopify stores
    const shopifyStores = [
      {
        store_name: "Main Store",
        shop_domain: "main-store.myshopify.com",
        access_token: "sample_access_token_1",
        is_active: true,
      },
      {
        store_name: "Secondary Store",
        shop_domain: "secondary-store.myshopify.com",
        access_token: "sample_access_token_2",
        is_active: false,
      },
    ]

    for (const store of shopifyStores) {
      await executeQuery(
        `
        INSERT INTO shopify_stores (store_name, shop_domain, access_token, is_active)
        VALUES ($1, $2, $3, $4)
      `,
        [store.store_name, store.shop_domain, store.access_token, store.is_active],
      )
    }
    console.log("✅ Seeded Shopify stores")

    console.log("🎉 Database seeded successfully!")
  } catch (error) {
    console.error("❌ Error seeding data:", error)
    process.exit(1)
  }
}

seedData().catch((error) => {
  console.error("❌ Script error:", error)
  process.exit(1)
})
