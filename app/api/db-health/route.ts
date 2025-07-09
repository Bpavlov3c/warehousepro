import { NextResponse } from "next/server"
import { testConnection, executeQuery } from "@/lib/database"

export async function GET() {
  try {
    console.log("🏥 Health check: Testing database connection...")

    // Test basic connection
    const isConnected = await testConnection()
    if (!isConnected) {
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection failed",
          timestamp: new Date().toISOString(),
        },
        { status: 500 },
      )
    }

    // Test tables exist
    const tablesResult = await executeQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('purchase_orders', 'inventory_items', 'shopify_stores')
      ORDER BY table_name
    `)

    const tables = tablesResult.rows.map((row) => row.table_name)
    const expectedTables = ["inventory_items", "purchase_orders", "shopify_stores"]
    const missingTables = expectedTables.filter((table) => !tables.includes(table))

    // Get record counts
    const counts = {}
    for (const table of tables) {
      try {
        const countResult = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`)
        counts[table] = Number.parseInt(countResult.rows[0].count)
      } catch (error) {
        counts[table] = "error"
      }
    }

    const healthStatus = {
      status: missingTables.length === 0 ? "healthy" : "warning",
      database: {
        connected: true,
        tables: {
          found: tables,
          missing: missingTables,
          counts: counts,
        },
      },
      environment: {
        db_host: process.env.DB_HOST || "not set",
        db_name: process.env.DB_NAME || "not set",
        db_user: process.env.DB_USER || "not set",
        db_port: process.env.DB_PORT || "not set",
      },
      timestamp: new Date().toISOString(),
    }

    console.log("✅ Health check completed:", healthStatus.status)

    return NextResponse.json(healthStatus, {
      status: healthStatus.status === "healthy" ? 200 : 206,
    })
  } catch (error) {
    console.error("❌ Health check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
