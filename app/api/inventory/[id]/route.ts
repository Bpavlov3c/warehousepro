import { type NextRequest, NextResponse } from "next/server"
import { InventoryStore } from "@/lib/db-store"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const inventoryItem = await InventoryStore.getById(id)
    if (!inventoryItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    return NextResponse.json(inventoryItem)
  } catch (error) {
    console.error("❌ Error fetching inventory item:", error)
    return NextResponse.json(
      { error: "Failed to fetch inventory item", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const body = await request.json()
    console.log(`📝 Updating inventory item ${id}:`, body)

    // Convert numeric fields
    if (body.quantity !== undefined) {
      body.quantity = Number.parseInt(body.quantity) || 0
    }
    if (body.unit_price !== undefined) {
      body.unit_price = Number.parseFloat(body.unit_price) || 0
    }
    if (body.reorder_level !== undefined) {
      body.reorder_level = Number.parseInt(body.reorder_level) || 0
    }

    const updatedInventoryItem = await InventoryStore.update(id, body)

    if (!updatedInventoryItem) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    console.log("✅ Inventory item updated:", updatedInventoryItem.id)
    return NextResponse.json(updatedInventoryItem)
  } catch (error) {
    console.error("❌ Error updating inventory item:", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 })
    }

    return NextResponse.json(
      { error: "Failed to update inventory item", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    console.log(`🗑️ Deleting inventory item ${id}`)
    const deleted = await InventoryStore.delete(id)

    if (!deleted) {
      return NextResponse.json({ error: "Inventory item not found" }, { status: 404 })
    }

    console.log("✅ Inventory item deleted:", id)
    return NextResponse.json({ message: "Inventory item deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting inventory item:", error)
    return NextResponse.json(
      { error: "Failed to delete inventory item", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
