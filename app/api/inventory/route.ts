import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Fetching inventory data...")

    // Query to get inventory with product details
    const inventoryQuery = `
      SELECT 
        p.id as product_id,
        p.sku,
        p.name as product_name,
        p.description,
        p.min_stock,
        p.max_stock,
        COALESCE(SUM(i.quantity_available), 0) as current_stock,
        COALESCE(AVG(i.unit_cost), 0) as avg_cost,
        COALESCE(SUM(i.quantity_available * i.unit_cost), 0) as total_value,
        COUNT(i.id) as inventory_batches
      FROM products p
      LEFT JOIN inventory i ON p.id = i.product_id
      GROUP BY p.id, p.sku, p.name, p.description, p.min_stock, p.max_stock
      ORDER BY p.sku
    `

    const result = await query(inventoryQuery)

    // Convert string numbers to actual numbers
    const inventoryData = result.rows.map((row: any) => ({
      ...row,
      current_stock: Number.parseInt(row.current_stock) || 0,
      avg_cost: Number.parseFloat(row.avg_cost) || 0,
      total_value: Number.parseFloat(row.total_value) || 0,
      min_stock: Number.parseInt(row.min_stock) || 0,
      max_stock: Number.parseInt(row.max_stock) || 0,
      inventory_batches: Number.parseInt(row.inventory_batches) || 0,
    }))

    console.log(`✅ Successfully fetched ${inventoryData.length} inventory items`)

    return NextResponse.json(inventoryData)
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
    const { product_id, po_item_id, quantity_available, unit_cost, purchase_date } = body

    console.log("📦 Creating new inventory record:", body)

    const insertQuery = `
      INSERT INTO inventory (product_id, po_item_id, quantity_available, unit_cost, purchase_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `

    const result = await query(insertQuery, [
      product_id,
      po_item_id,
      Number.parseInt(quantity_available),
      Number.parseFloat(unit_cost),
      purchase_date,
    ])

    console.log("✅ Successfully created inventory record")

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error("❌ Error creating inventory record:", error)

    return NextResponse.json(
      {
        error: "Failed to create inventory record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
