import { Pool, type PoolClient } from "pg"

// Database configuration
const dbConfig = {
  user: process.env.DB_USER || "warehouse_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "postgres",
  password: process.env.DB_PASSWORD || "1",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// Create connection pool
const pool = new Pool(dbConfig)

// Handle pool errors
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err)
})

export { pool }

// Test database connection
export async function testConnection(): Promise<boolean> {
  let client: PoolClient | null = null
  try {
    console.log("🔌 Attempting to connect to database...")
    console.log(`📍 Host: ${dbConfig.host}:${dbConfig.port}`)
    console.log(`🗄️  Database: ${dbConfig.database}`)
    console.log(`👤 User: ${dbConfig.user}`)

    client = await pool.connect()
    const result = await client.query("SELECT NOW() as current_time, version() as version")

    console.log("✅ Database connection successful!")
    console.log(`⏰ Server time: ${result.rows[0].current_time}`)
    console.log(`🔧 Version: ${result.rows[0].version.split(" ")[0]} ${result.rows[0].version.split(" ")[1]}`)

    return true
  } catch (error) {
    console.error("❌ Database connection failed:", error)
    return false
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Health check function
export async function healthCheck() {
  let client: PoolClient | null = null
  try {
    client = await pool.connect()

    // Get basic database info
    const timeResult = await client.query("SELECT NOW() as server_time")
    const dbResult = await client.query("SELECT current_database() as database, current_user as user")

    // Count tables in our schema
    const tableResult = await client.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('purchase_orders', 'inventory_items', 'shopify_stores', 'shopify_orders')
    `)

    return {
      status: "healthy",
      server_time: timeResult.rows[0].server_time,
      database: dbResult.rows[0].database,
      user: dbResult.rows[0].user,
      table_count: Number.parseInt(tableResult.rows[0].table_count),
    }
  } catch (error) {
    return {
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Execute query with error handling
export async function executeQuery(text: string, params?: any[]) {
  let client: PoolClient | null = null
  try {
    client = await pool.connect()
    const result = await client.query(text, params)
    return result
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

// Transaction wrapper
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
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
