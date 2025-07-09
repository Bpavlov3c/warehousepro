import { Pool } from "pg"

// Create a connection pool with environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
})

// Test the connection on startup
pool.on("connect", (client) => {
  console.log("🔗 New database client connected")
})

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle database client:", err)
})

// Export a query function that uses the pool
export async function query(text: string, params?: any[]) {
  const start = Date.now()

  try {
    console.log(`🔍 Executing query: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`)
    if (params && params.length > 0) {
      console.log(`📝 Query params:`, params)
    }

    const result = await pool.query(text, params)
    const duration = Date.now() - start

    console.log(`✅ Query executed successfully in ${duration}ms, returned ${result.rowCount} rows`)
    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`❌ Query failed after ${duration}ms:`, error)
    console.error(`📝 Failed query: ${text}`)
    if (params && params.length > 0) {
      console.error(`📝 Failed params:`, params)
    }
    throw error
  }
}

// Export the pool for advanced usage
export { pool }

// Graceful shutdown handlers
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

// Health check function
export async function checkDatabaseHealth() {
  try {
    const result = await query("SELECT NOW() as current_time, version() as version")
    return {
      status: "healthy",
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version,
      poolSize: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingClients: pool.waitingCount,
    }
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
