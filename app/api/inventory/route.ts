import { type NextRequest, NextResponse } from "next/server"
import { getAllInventoryItems, createInventoryItem } from "@/lib/db-store"

export async function GET() {
  try {
    const inventoryItems = await getAllInventoryItems()
    return NextResponse.json(inventoryItems)
  } catch (error) {
    console.error("Error fetching inventory items:", error)
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.sku || !body.product_name) {
      return NextResponse.json({ error: "Missing required fields: sku, product_name" }, { status: 400 })
    }

    const inventoryItem = await createInventoryItem({
      sku: body.sku,
      product_name: body.product_name,
      description: body.description,
      category: body.category,
      quantity_on_hand: body.quantity_on_hand || 0,
      quantity_reserved: body.quantity_reserved || 0,
      reorder_point: body.reorder_point || 10,
      unit_cost: body.unit_cost || 0,
      selling_price: body.selling_price || 0,
      location: body.location,
    })

    return NextResponse.json(inventoryItem, { status: 201 })
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 })
  }
}
