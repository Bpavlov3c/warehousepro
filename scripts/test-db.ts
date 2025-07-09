import { testConnection, healthCheck } from "../lib/database"

async function runDatabaseTest() {
  console.log("🧪 Running database connection test...\n")

  // Test basic connection
  const connected = await testConnection()

  if (!connected) {
    console.log("\n❌ Database test failed!")
    process.exit(1)
  }

  console.log("\n🔍 Running health check...")
  const health = await healthCheck()

  if (health.status === "healthy") {
    console.log("✅ Database health check passed!")
    console.log(`📊 Tables found: ${health.table_count}`)
    console.log(`👤 Connected as: ${health.user}`)
    console.log(`🗄️  Database: ${health.database}`)
    console.log(`⏰ Server time: ${health.server_time}`)
  } else {
    console.log("❌ Database health check failed!")
    console.log(`Error: ${health.error}`)
  }

  console.log("\n🎉 Database test completed!")
}

// Run the test
runDatabaseTest()
