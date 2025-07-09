import { Pool, type PoolClient } from "pg"

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || "warehouse_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "1",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    const result = await client.query("SELECT NOW() as current_time, current_database() as database_name")
    client.release()
    console.log("✅ Database connected successfully:", {
      time: result.rows[0].current_time,
      database: result.rows[0].database_name,
    })
    return true
  } catch (error) {
    console.error("❌ Database connection error:", error)
    return false
  }
}

// Generic query function with logging
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start

    if (process.env.NODE_ENV === "development") {
      console.log("📊 Query executed:", {
        query: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        duration: `${duration}ms`,
        rows: result.rowCount,
      })
    }

    return result
  } catch (error) {
    console.error("❌ Database query error:", {
      query: text,
      params,
      error: error instanceof Error ? error.message : error,
    })
    throw error
  }
}

// Transaction helper with proper error handling
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    console.error("❌ Transaction rolled back:", error)
    throw error
  } finally {
    client.release()
  }
}

// Health check function
export async function healthCheck() {
  try {
    const result = await query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as postgres_version,
        NOW() as server_time
    `)

    const tableCount = await query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `)

    return {
      status: "healthy",
      database: result.rows[0].database,
      user: result.rows[0].user,
      version: result.rows[0].postgres_version,
      server_time: result.rows[0].server_time,
      table_count: tableCount.rows[0].table_count,
    }
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Graceful shutdown
export async function closePool() {
  try {
    await pool.end()
    console.log("🔌 Database pool closed successfully")
  } catch (error) {
    console.error("❌ Error closing database pool:", error)
  }
}

// Handle process termination
process.on("SIGINT", closePool)
process.on("SIGTERM", closePool)

export default pool
