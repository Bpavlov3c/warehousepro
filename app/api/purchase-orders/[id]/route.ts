import { type NextRequest, NextResponse } from "next/server"
import { PurchaseOrderStore } from "@/lib/db-store"

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      return addCorsHeaders(response)
    }

    const purchaseOrder = await PurchaseOrderStore.getById(id)
    if (!purchaseOrder) {
      const response = NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
      return addCorsHeaders(response)
    }

    const response = NextResponse.json(purchaseOrder)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching purchase order:", error)
    const response = NextResponse.json(
      { error: "Failed to fetch purchase order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      return addCorsHeaders(response)
    }

    const body = await request.json()
    console.log(`📝 Updating purchase order ${id}:`, body)

    const updatedPurchaseOrder = await PurchaseOrderStore.update(id, body)

    if (!updatedPurchaseOrder) {
      const response = NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
      return addCorsHeaders(response)
    }

    console.log("✅ Purchase order updated:", updatedPurchaseOrder.id)
    const response = NextResponse.json(updatedPurchaseOrder)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error updating purchase order:", error)
    const response = NextResponse.json(
      { error: "Failed to update purchase order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      return addCorsHeaders(response)
    }

    console.log(`🗑️ Deleting purchase order ${id}`)
    const deleted = await PurchaseOrderStore.delete(id)

    if (!deleted) {
      const response = NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
      return addCorsHeaders(response)
    }

    console.log("✅ Purchase order deleted:", id)
    const response = NextResponse.json({ message: "Purchase order deleted successfully" })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error deleting purchase order:", error)
    const response = NextResponse.json(
      { error: "Failed to delete purchase order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
