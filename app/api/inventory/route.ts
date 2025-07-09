import { type NextRequest, NextResponse } from "next/server"
import { InventoryStore } from "@/lib/db-store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(`📦 Fetching inventory items - Page: ${page}, Limit: ${limit}`)

    const result = await InventoryStore.getAll(page, limit)
    console.log(`✅ Found ${result.data.length} inventory items (${result.total} total)`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error fetching inventory items:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch inventory items",
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
    if (!body.sku || !body.name || !body.category || !body.supplier) {
      return NextResponse.json({ error: "Missing required fields: sku, name, category, supplier" }, { status: 400 })
    }

    const inventoryItem = await InventoryStore.create({
      sku: body.sku,
      name: body.name,
      description: body.description,
      category: body.category,
      quantity: Number.parseInt(body.quantity) || 0,
      unit_price: Number.parseFloat(body.unit_price) || 0,
      reorder_level: Number.parseInt(body.reorder_level) || 0,
      supplier: body.supplier,
    })

    console.log("✅ Inventory item created:", inventoryItem.id)
    return NextResponse.json(inventoryItem, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating inventory item:", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 })
    }

    return NextResponse.json(
      { error: "Failed to create inventory item", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
