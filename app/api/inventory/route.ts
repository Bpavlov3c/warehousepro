import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Fetching inventory data...")

    // Get inventory summary with proper column references
    const result = await query(`
      SELECT 
        p.sku,
        p.product_name,
        p.category,
        p.reorder_level,
        COALESCE(SUM(i.quantity_remaining), 0) as current_stock,
        COALESCE(AVG(i.unit_cost), 0) as avg_unit_cost,
        COALESCE(SUM(i.quantity_remaining * i.unit_cost), 0) as total_value,
        COUNT(i.id) as batch_count
      FROM products p
      LEFT JOIN inventory i ON p.sku = i.sku
      GROUP BY p.id, p.sku, p.product_name, p.category, p.reorder_level
      ORDER BY p.product_name ASC
    `)

    console.log(`✅ Found ${result.rows.length} inventory items`)

    // Format the data to ensure numbers are properly typed
    const formattedData = result.rows.map((row) => ({
      ...row,
      current_stock: Number.parseInt(row.current_stock) || 0,
      avg_unit_cost: Number.parseFloat(row.avg_unit_cost) || 0,
      total_value: Number.parseFloat(row.total_value) || 0,
      reorder_level: Number.parseInt(row.reorder_level) || 0,
      batch_count: Number.parseInt(row.batch_count) || 0,
    }))

    return NextResponse.json(formattedData)
  } catch (error) {
    console.error("❌ Error fetching inventory:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch inventory",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Creating inventory item:", body)

    // Validate required fields
    if (!body.sku || !body.product_name || !body.quantity_remaining || !body.unit_cost) {
      return NextResponse.json(
        { error: "Missing required fields: sku, product_name, quantity_remaining, unit_cost" },
        { status: 400 },
      )
    }

    const result = await query(
      `
      INSERT INTO inventory (
        sku, product_name, po_id, batch_date, quantity_received, 
        quantity_remaining, unit_cost, location, expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        body.sku,
        body.product_name,
        body.po_id || null,
        body.batch_date || new Date().toISOString().split("T")[0],
        body.quantity_received || body.quantity_remaining,
        body.quantity_remaining,
        body.unit_cost,
        body.location || null,
        body.expiry_date || null,
      ],
    )

    console.log("✅ Inventory item created:", result.rows[0])
    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("❌ Error creating inventory item:", error)
    return NextResponse.json(
      {
        error: "Failed to create inventory item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
