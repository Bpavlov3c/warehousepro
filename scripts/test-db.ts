import { testConnection, executeQuery } from "../lib/database"

async function testDatabase() {
  console.log("🧪 Testing database connection and setup...")

  try {
    // Test basic connection
    console.log("1. Testing database connection...")
    const isConnected = await testConnection()

    if (!isConnected) {
      throw new Error("Database connection failed")
    }

    console.log("✅ Database connection test passed!")

    // Test tables exist
    console.log("2. Checking if tables exist...")
    const tablesResult = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('purchase_orders', 'inventory_items', 'shopify_stores')
      ORDER BY table_name
    `)

    console.log(
      "📋 Found tables:",
      tablesResult.rows.map((row) => row.table_name),
    )

    if (tablesResult.rows.length === 0) {
      console.log("⚠️ No tables found. Run npm run db:create to create tables.")
      return
    }

    // Test data in each table
    console.log("3. Checking data in tables...")

    const poResult = await executeQuery("SELECT COUNT(*) as count FROM purchase_orders")
    console.log(`📦 Purchase Orders: ${poResult.rows[0].count} records`)

    const inventoryResult = await executeQuery("SELECT COUNT(*) as count FROM inventory_items")
    console.log(`📋 Inventory Items: ${inventoryResult.rows[0].count} records`)

    const storesResult = await executeQuery("SELECT COUNT(*) as count FROM shopify_stores")
    console.log(`🏪 Shopify Stores: ${storesResult.rows[0].count} records`)

    // Test a sample query
    console.log("4. Testing sample queries...")
    const samplePO = await executeQuery("SELECT * FROM purchase_orders LIMIT 1")
    if (samplePO.rows.length > 0) {
      console.log("✅ Sample purchase order:", {
        id: samplePO.rows[0].id,
        po_number: samplePO.rows[0].po_number,
        supplier_name: samplePO.rows[0].supplier_name,
        total_amount: samplePO.rows[0].total_amount,
      })
    }

    console.log("🎉 Database test completed successfully!")
  } catch (error) {
    console.error("❌ Database test failed:", error)

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.error("💡 Tip: Make sure PostgreSQL is running and accessible")
      } else if (error.message.includes("authentication failed")) {
        console.error("💡 Tip: Check your database credentials in .env.local")
      } else if (error.message.includes("database") && error.message.includes("does not exist")) {
        console.error("💡 Tip: Create the database first or check DB_NAME in .env.local")
      }
    }

    process.exit(1)
  }
}

// Run the test
testDatabase().catch((error) => {
  console.error("❌ Test script error:", error)
  process.exit(1)
})
