import { type NextRequest, NextResponse } from "next/server"
import { getPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, markPurchaseOrderDelivered } from "@/lib/db-store"

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
    const body = await request.json()
    const { purchaseOrder, items, markAsDelivered } = body

    if (markAsDelivered) {
      const updatedPO = await markPurchaseOrderDelivered(params.id)
      return NextResponse.json(updatedPO)
    }

    if (!purchaseOrder) {
      return NextResponse.json({ error: "Invalid request body. Expected purchaseOrder." }, { status: 400 })
    }

    let processedItems
    if (items && Array.isArray(items)) {
      // Calculate delivery cost per unit for each item
      const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
      const deliveryCostPerUnit = totalQuantity > 0 ? (purchaseOrder.delivery_cost || 0) / totalQuantity : 0

      processedItems = items.map((item: any) => ({
        ...item,
        delivery_cost_per_unit: deliveryCostPerUnit,
        total_cost: item.unit_cost * item.quantity + deliveryCostPerUnit * item.quantity,
      }))
    }

    const updatedPurchaseOrder = await updatePurchaseOrder(params.id, purchaseOrder, processedItems)
    return NextResponse.json(updatedPurchaseOrder)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deletePurchaseOrder(params.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 })
  }
}
