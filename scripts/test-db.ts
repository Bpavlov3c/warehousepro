import { testConnection, healthCheck } from "../lib/database"

async function runDatabaseTest() {
  console.log("🔍 Testing database connection...\n")

  try {
    // Test basic connection
    const connectionResult = await testConnection()

    if (!connectionResult) {
      console.error("❌ Database connection failed!")
      process.exit(1)
    }

    // Run health check
    console.log("\n🏥 Running health check...")
    const health = await healthCheck()

    if (health.status === "healthy") {
      console.log("✅ Database health check passed!")
      console.log(`📊 Database: ${health.database}`)
      console.log(`👤 User: ${health.user}`)
      console.log(`📋 Tables: ${health.table_count}`)
      console.log(`⏰ Server Time: ${health.server_time}`)
    } else {
      console.error("❌ Database health check failed:", health.error)
      process.exit(1)
    }

    console.log("\n🎉 All database tests passed!")
    process.exit(0)
  } catch (error) {
    console.error("❌ Database test failed:", error)
    process.exit(1)
  }
}

runDatabaseTest()
