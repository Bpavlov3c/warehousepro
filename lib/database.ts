import { Pool, type PoolClient } from "pg"

// Database configuration from environment variables
const dbConfig = {
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "warehouse_management",
  password: process.env.DB_PASSWORD || "password",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  // Connection pool settings
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
}

// Create a single pool instance
let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)

    // Handle pool errors
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err)
      process.exit(-1)
    })

    // Log pool events in development
    if (process.env.NODE_ENV === "development") {
      pool.on("connect", () => {
        console.log("🔗 New database connection established")
      })

      pool.on("remove", () => {
        console.log("🔌 Database connection removed from pool")
      })
    }
  }

  return pool
}

// Get a client from the pool
export async function getClient(): Promise<PoolClient> {
  const pool = getPool()
  return await pool.connect()
}

// Execute a query with automatic connection management
export async function query(text: string, params?: any[]): Promise<any> {
  const pool = getPool()
  const start = Date.now()

  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start

    if (process.env.NODE_ENV === "development") {
      console.log("📊 Query executed:", { text: text.substring(0, 100), duration, rows: result.rowCount })
    }

    return result
  } catch (error) {
    console.error("❌ Database query error:", error)
    console.error("Query:", text)
    console.error("Params:", params)
    throw error
  }
}

// Execute a transaction
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient()

  try {
    await client.query("BEGIN")
    const result = await callback(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    const result = await query("SELECT NOW() as current_time, version() as version")
    console.log("✅ Database connection successful")
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

// Close all connections (useful for graceful shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log("🔒 Database pool closed")
  }
}

// Health check function
export async function healthCheck(): Promise<{
  status: "healthy" | "unhealthy"
  details: {
    connected: boolean
    totalConnections?: number
    idleConnections?: number
    waitingConnections?: number
    error?: string
  }
}> {
  try {
    const pool = getPool()

    // Test basic connectivity
    await query("SELECT 1")

    return {
      status: "healthy",
      details: {
        connected: true,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingConnections: pool.waitingCount,
      },
    }
  } catch (error) {
    return {
      status: "unhealthy",
      details: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    }
  }
}

// Export the pool for advanced usage
export { getPool }

// Default export for convenience
export default {
  query,
  getClient,
  transaction,
  testConnection,
  closePool,
  healthCheck,
  getPool,
}
