import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    console.log(`📦 Fetching inventory summary - Page: ${page}, Limit: ${limit}`)

    // Get total count from products table
    const countResult = await query("SELECT COUNT(*) FROM products")
    const total = Number.parseInt(countResult.rows[0].count)

    // Fixed query - inventory table has sku column directly, not through join
    const result = await query(
      `
      SELECT 
        p.sku,
        p.product_name as name,
        p.category,
        COALESCE(SUM(inv.quantity_remaining), 0) as current_stock,
        COALESCE(AVG(inv.unit_cost), 0) as avg_cost,
        COALESCE(SUM(inv.quantity_remaining * inv.unit_cost), 0) as total_value,
        p.reorder_level as min_stock,
        100 as max_stock,
        CASE 
          WHEN COALESCE(SUM(inv.quantity_remaining), 0) <= p.reorder_level THEN 'Low Stock'
          WHEN COALESCE(SUM(inv.quantity_remaining), 0) = 0 THEN 'Out of Stock'
          ELSE 'In Stock'
        END as stock_status
      FROM products p
      LEFT JOIN inventory inv ON p.sku = inv.sku AND inv.quantity_remaining > 0
      GROUP BY p.id, p.sku, p.product_name, p.category, p.reorder_level
      ORDER BY p.product_name ASC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    console.log(`✅ Found ${result.rows.length} inventory items`)

    // Convert numeric fields to proper numbers
    const inventoryData = result.rows.map((row) => ({
      ...row,
      current_stock: Number.parseInt(row.current_stock) || 0,
      avg_cost: Number.parseFloat(row.avg_cost) || 0,
      total_value: Number.parseFloat(row.total_value) || 0,
      min_stock: Number.parseInt(row.min_stock) || 0,
      max_stock: Number.parseInt(row.max_stock) || 100,
    }))

    return NextResponse.json({
      data: inventoryData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error("❌ Inventory API Error:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch inventory data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const result = await query(
      `
      INSERT INTO inventory (sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location, expiry_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
      [
        body.sku,
        body.product_name,
        body.po_id,
        body.batch_date,
        body.quantity_received,
        body.quantity_remaining,
        body.unit_cost,
        body.location,
        body.expiry_date,
      ],
    )

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("❌ Create Inventory Error:", error)

    return NextResponse.json(
      {
        error: "Failed to create inventory record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
