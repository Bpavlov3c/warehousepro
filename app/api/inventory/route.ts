import { type NextRequest, NextResponse } from "next/server"
import { getInventoryItems, createInventoryItem } from "@/lib/db-store"

export async function GET() {
  try {
    const inventoryItems = await getInventoryItems()
    return NextResponse.json(inventoryItems)
  } catch (error) {
    console.error("Error fetching inventory items:", error)
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.sku || !data.product_name || !data.category) {
      return NextResponse.json({ error: "Missing required fields: sku, product_name, category" }, { status: 400 })
    }

    const inventoryItem = await createInventoryItem({
      sku: data.sku,
      product_name: data.product_name,
      category: data.category,
      current_stock: data.current_stock || 0,
      reserved_stock: data.reserved_stock || 0,
      reorder_point: data.reorder_point || 0,
      reorder_quantity: data.reorder_quantity || 0,
      average_cost: data.average_cost || 0,
      location: data.location,
      supplier: data.supplier,
    })

    return NextResponse.json(inventoryItem, { status: 201 })
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 })
  }
}
