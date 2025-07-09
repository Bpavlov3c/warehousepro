import { Pool } from "pg"
import * as fs from "fs"
import * as path from "path"

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "warehouse_management",
  password: process.env.DB_PASSWORD || "password",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
}

async function resetDatabase() {
  const pool = new Pool(dbConfig)

  try {
    console.log("🔄 Starting database reset...")
    console.log(`📍 Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`)

    // Test connection
    const client = await pool.connect()
    console.log("✅ Database connection established")

    // Read and execute the SQL reset script
    const sqlPath = path.join(__dirname, "reset-database.sql")
    const sqlContent = fs.readFileSync(sqlPath, "utf8")

    console.log("🗑️ Dropping existing tables and views...")
    console.log("🏗️ Creating new database structure...")
    console.log("📊 Inserting sample data...")

    await client.query(sqlContent)

    console.log("✅ Database reset completed successfully!")

    // Verify the reset by checking table counts
    const verificationQueries = [
      "SELECT COUNT(*) as count FROM products",
      "SELECT COUNT(*) as count FROM purchase_orders",
      "SELECT COUNT(*) as count FROM po_items",
      "SELECT COUNT(*) as count FROM inventory",
      "SELECT COUNT(*) as count FROM shopify_stores",
      "SELECT COUNT(*) as count FROM shopify_orders",
      "SELECT COUNT(*) as count FROM shopify_order_items",
      "SELECT COUNT(*) as count FROM sales_fulfillment",
    ]

    const tableNames = [
      "Products",
      "Purchase Orders",
      "PO Items",
      "Inventory Records",
      "Shopify Stores",
      "Shopify Orders",
      "Order Items",
      "Fulfillment Records",
    ]

    console.log("\n📊 Database Summary:")
    console.log("==================")

    for (let i = 0; i < verificationQueries.length; i++) {
      const result = await client.query(verificationQueries[i])
      const count = result.rows[0].count
      console.log(`${tableNames[i]}: ${count}`)
    }

    // Test the views
    console.log("\n🔍 Testing Views:")
    console.log("================")

    const inventorySummary = await client.query("SELECT COUNT(*) as count FROM product_inventory_summary")
    console.log(`Product Inventory Summary: ${inventorySummary.rows[0].count} products`)

    const profitAnalysis = await client.query("SELECT COUNT(*) as count FROM profit_analysis")
    console.log(`Profit Analysis: ${profitAnalysis.rows[0].count} products with sales`)

    client.release()

    console.log("\n🎉 Database is ready for use!")
    console.log("You can now start the application and test all features.")
  } catch (error) {
    console.error("❌ Database reset failed:", error)

    if (error instanceof Error) {
      console.error("Error details:", error.message)

      // Provide helpful error messages for common issues
      if (error.message.includes("ECONNREFUSED")) {
        console.error("\n💡 Troubleshooting:")
        console.error("- Make sure PostgreSQL is running")
        console.error("- Check your database connection settings in .env.local")
        console.error("- Verify the database exists")
      } else if (error.message.includes("authentication failed")) {
        console.error("\n💡 Troubleshooting:")
        console.error("- Check your database username and password")
        console.error("- Verify the user has necessary permissions")
      } else if (error.message.includes("database") && error.message.includes("does not exist")) {
        console.error("\n💡 Troubleshooting:")
        console.error("- Create the database first: CREATE DATABASE warehouse_management;")
        console.error("- Or update DB_NAME in .env.local to match an existing database")
      }
    }

    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the reset if this script is executed directly
if (require.main === module) {
  resetDatabase()
}

export { resetDatabase }
