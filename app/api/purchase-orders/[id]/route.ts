import { type NextRequest, NextResponse } from "next/server"
import { PurchaseOrderStore } from "@/lib/db-store"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
    }

    const purchaseOrder = await PurchaseOrderStore.getById(id)
    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("❌ Error fetching purchase order:", error)
    return NextResponse.json(
      { error: "Failed to fetch purchase order", details: error instanceof Error ? error.message : "Unknown error" },
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
    console.log(`📝 Updating purchase order ${id}:`, body)

    // Convert total_amount to number if provided
    if (body.total_amount !== undefined) {
      body.total_amount = Number.parseFloat(body.total_amount) || 0
    }

    const updatedPurchaseOrder = await PurchaseOrderStore.update(id, body)

    if (!updatedPurchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    console.log("✅ Purchase order updated:", updatedPurchaseOrder.id)
    return NextResponse.json(updatedPurchaseOrder)
  } catch (error) {
    console.error("❌ Error updating purchase order:", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "PO Number already exists" }, { status: 409 })
    }

    return NextResponse.json(
      { error: "Failed to update purchase order", details: error instanceof Error ? error.message : "Unknown error" },
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

    console.log(`🗑️ Deleting purchase order ${id}`)
    const deleted = await PurchaseOrderStore.delete(id)

    if (!deleted) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    console.log("✅ Purchase order deleted:", id)
    return NextResponse.json({ message: "Purchase order deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting purchase order:", error)
    return NextResponse.json(
      { error: "Failed to delete purchase order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
