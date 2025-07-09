import { Pool } from "pg"

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || "warehouse_user",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "warehouse_management",
  password: process.env.DB_PASSWORD || "your_secure_password_here",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
})

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect()
    const result = await client.query("SELECT NOW()")
    client.release()
    console.log("Database connected successfully:", result.rows[0])
    return true
  } catch (error) {
    console.error("Database connection error:", error)
    return false
  }
}

// Generic query function
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    console.log("Executed query", { text, duration, rows: result.rowCount })
    return result
  } catch (error) {
    console.error("Database query error:", error)
    throw error
  }
}

// Transaction helper
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
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

// Graceful shutdown
export async function closePool() {
  await pool.end()
}

export default pool
