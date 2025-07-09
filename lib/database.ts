import { Pool } from "pg"

// Database configuration for local PostgreSQL
const dbConfig = {
  user: process.env.DB_USER || "warehouse_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "warehouse_management",
  password: process.env.DB_PASSWORD || "1",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
}

console.log("🔧 Database configuration:", {
  user: dbConfig.user,
  host: dbConfig.host,
  database: dbConfig.database,
  port: dbConfig.port,
  // Don't log password for security
})

// Create a connection pool
const pool = new Pool(dbConfig)

// Handle pool events
pool.on("connect", (client) => {
  console.log("🔗 New database client connected to", dbConfig.host)
})

pool.on("error", (err, client) => {
  console.error("❌ Unexpected error on idle database client:", err)
  process.exit(-1)
})

pool.on("remove", (client) => {
  console.log("🔌 Database client removed from pool")
})

// Export a query function that uses the pool
export async function query(text: string, params?: any[]) {
  const start = Date.now()

  try {
    console.log("🔍 Executing query:", text.substring(0, 100) + (text.length > 100 ? "..." : ""))
    if (params && params.length > 0) {
      console.log("📝 Query params:", params)
    }

    const result = await pool.query(text, params)
    const duration = Date.now() - start

    console.log(`✅ Query executed successfully in ${duration}ms, returned ${result.rowCount} rows`)
    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`❌ Query failed after ${duration}ms:`, error)
    console.error("📝 Failed query:", text)
    if (params && params.length > 0) {
      console.error("📝 Failed params:", params)
    }
    throw error
  }
}

// Test database connection
export async function testConnection() {
  try {
    console.log("🔌 Testing database connection...")
    const result = await query("SELECT NOW() as current_time, version() as version")

    console.log("✅ Database connection successful!")
    console.log("📅 Server time:", result.rows[0].current_time)
    console.log(
      "🗄️ PostgreSQL version:",
      result.rows[0].version.split(" ")[0] + " " + result.rows[0].version.split(" ")[1],
    )

    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  }
}

// Get pool stats
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🔄 Gracefully shutting down database connections...")
  pool.end(() => {
    console.log("✅ Database pool has ended")
    process.exit(0)
  })
})

process.on("SIGTERM", () => {
  console.log("🔄 Gracefully shutting down database connections...")
  pool.end(() => {
    console.log("✅ Database pool has ended")
    process.exit(0)
  })
})

// Export the pool for advanced usage
export { pool }

// Default export
export default pool
