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

    const inventoryItemData = {
      sku: body.sku,
      productName: body.productName,
      category: body.category,
      currentStock: body.currentStock || 0,
      reservedStock: body.reservedStock || 0,
      availableStock: (body.currentStock || 0) - (body.reservedStock || 0),
      reorderPoint: body.reorderPoint || 0,
      reorderQuantity: body.reorderQuantity || 0,
      averageCost: body.averageCost || 0,
      location: body.location,
      supplier: body.supplier,
    }

    const newInventoryItem = await createInventoryItem(inventoryItemData)
    return NextResponse.json(newInventoryItem, { status: 201 })
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 })
  }
}
