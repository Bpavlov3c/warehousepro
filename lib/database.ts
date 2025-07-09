import { Pool } from "pg"

// Create a connection pool
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "warehouse_management",
  user: process.env.DB_USER || "warehouse_user",
  password: process.env.DB_PASSWORD || "1",
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
})

// Test the connection
pool.on("connect", (client) => {
  console.log("✅ Connected to PostgreSQL database")
})

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err)
  process.exit(-1)
})

// Query function with error handling and logging
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    console.log("🔄 Executing query:", text.substring(0, 100) + "...")
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    console.log(`✅ Query executed in ${duration}ms, returned ${result.rowCount} rows`)
    return result
  } catch (error) {
    const duration = Date.now() - start
    console.error(`❌ Query failed after ${duration}ms:`, error)
    console.error("Query:", text)
    console.error("Params:", params)
    throw error
  }
}

// Get a client from the pool for transactions
export async function getClient() {
  return await pool.connect()
}

// Close the pool (for graceful shutdown)
export async function closePool() {
  await pool.end()
  console.log("🔒 Database pool closed")
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    const result = await query("SELECT NOW() as current_time, version() as version")
    return {
      status: "healthy",
      timestamp: result.rows[0].current_time,
      version: result.rows[0].version,
    }
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🛑 Received SIGINT, closing database pool...")
  await closePool()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("🛑 Received SIGTERM, closing database pool...")
  await closePool()
  process.exit(0)
})

export default pool
