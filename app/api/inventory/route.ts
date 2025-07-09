import { type NextRequest, NextResponse } from "next/server"
import { dbStore } from "@/lib/db-store"

export async function GET() {
  try {
    const inventory = await dbStore.getInventory()
    return NextResponse.json(inventory)
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { sku, quantity } = await request.json()

    if (!sku || quantity === undefined) {
      return NextResponse.json({ error: "SKU and quantity are required" }, { status: 400 })
    }

    const success = await dbStore.updateInventoryQuantity(sku, quantity)

    if (!success) {
      return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating inventory:", error)
    return NextResponse.json({ error: "Failed to update inventory" }, { status: 500 })
  }
}
