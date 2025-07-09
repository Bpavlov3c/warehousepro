import { type NextRequest, NextResponse } from "next/server"
import { InventoryStore } from "@/lib/db-store"

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

export async function GET() {
  try {
    console.log("📋 Fetching inventory items...")
    const inventoryItems = await InventoryStore.getAll()
    console.log(`✅ Found ${inventoryItems.length} inventory items`)

    const response = NextResponse.json(inventoryItems)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching inventory items:", error)
    const response = NextResponse.json(
      { error: "Failed to fetch inventory items", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Creating inventory item:", body)

    // Validate required fields
    if (!body.sku || !body.name || !body.category || body.unit_price === undefined) {
      const response = NextResponse.json(
        { error: "Missing required fields: sku, name, category, unit_price" },
        { status: 400 },
      )
      return addCorsHeaders(response)
    }

    const inventoryItem = await InventoryStore.create({
      sku: body.sku,
      name: body.name,
      description: body.description,
      category: body.category,
      quantity: body.quantity || 0,
      unit_price: body.unit_price,
      reorder_level: body.reorder_level || 10,
      supplier: body.supplier || "",
    })

    console.log("✅ Inventory item created:", inventoryItem.id)
    const response = NextResponse.json(inventoryItem, { status: 201 })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error creating inventory item:", error)
    const response = NextResponse.json(
      { error: "Failed to create inventory item", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
