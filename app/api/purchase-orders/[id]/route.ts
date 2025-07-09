import { type NextRequest, NextResponse } from "next/server"
import { getPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder } from "@/lib/db-store"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const purchaseOrder = await getPurchaseOrder(params.id)

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("Error fetching purchase order:", error)
    return NextResponse.json({ error: "Failed to fetch purchase order" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await request.json()

    const purchaseOrder = await updatePurchaseOrder(params.id, data)

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const success = await deletePurchaseOrder(params.id)

    if (!success) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Purchase order deleted successfully" })
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 })
  }
}
