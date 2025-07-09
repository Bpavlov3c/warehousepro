import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

// Add CORS headers
function addCorsHeaders(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return response
}

export async function OPTIONS() {
  return addCorsHeaders(new NextResponse(null, { status: 200 }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    console.log(`📦 Fetching inventory - page: ${page}, limit: ${limit}`)

    // Get total count from products table
    const countResult = await query("SELECT COUNT(*) FROM products")
    const total = Number.parseInt(countResult.rows[0].count)

    // Fixed query - inventory table structure: id, sku, product_name, po_id, batch_date, quantity_received, quantity_remaining, unit_cost, location, expiry_date
    const result = await query(
      `
      SELECT 
        p.sku,
        p.product_name as name,
        p.category,
        p.reorder_level as min_stock,
        100 as max_stock,
        COALESCE(SUM(i.quantity_remaining), 0) as current_stock,
        COALESCE(AVG(i.unit_cost), 0) as avg_cost,
        COALESCE(SUM(i.quantity_remaining * i.unit_cost), 0) as total_value,
        COUNT(i.id) as batch_count
      FROM products p
      LEFT JOIN inventory i ON p.sku = i.sku
      GROUP BY p.id, p.sku, p.product_name, p.category, p.reorder_level
      ORDER BY p.product_name ASC
      LIMIT $1 OFFSET $2
    `,
      [limit, offset],
    )

    // Format the data to ensure numbers are properly typed
    const formattedData = result.rows.map((row) => ({
      ...row,
      current_stock: Number.parseInt(row.current_stock) || 0,
      avg_cost: Number.parseFloat(row.avg_cost) || 0,
      total_value: Number.parseFloat(row.total_value) || 0,
      min_stock: Number.parseInt(row.min_stock) || 0,
      max_stock: Number.parseInt(row.max_stock) || 100,
      batch_count: Number.parseInt(row.batch_count) || 0,
    }))

    console.log(`✅ Retrieved ${formattedData.length} inventory items`)

    const response = NextResponse.json({
      data: formattedData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })

    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching inventory:", error)
    const response = NextResponse.json(
      {
        error: "Failed to fetch inventory",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📦 Creating inventory item:", body)

    const { sku, product_name, po_id, batch_date, quantity_received, unit_cost, location, expiry_date } = body

    // Validate required fields
    if (!sku || !product_name || !quantity_received || !unit_cost) {
      return NextResponse.json(
        { error: "Missing required fields: sku, product_name, quantity_received, unit_cost" },
        { status: 400 },
      )
    }

    // Insert inventory item
    const result = await query(
      `
      INSERT INTO inventory (
        sku, product_name, po_id, batch_date, quantity_received, 
        quantity_remaining, unit_cost, location, expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        sku,
        product_name,
        po_id || null,
        batch_date || new Date().toISOString().split("T")[0],
        quantity_received,
        unit_cost,
        location || null,
        expiry_date || null,
      ],
    )

    console.log("✅ Created inventory item:", result.rows[0].id)
    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error("❌ Error creating inventory item:", error)

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "Inventory item with this SKU and batch already exists" }, { status: 409 })
    }

    return NextResponse.json(
      {
        error: "Failed to create inventory item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
