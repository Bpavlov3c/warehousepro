import { type NextRequest, NextResponse } from "next/server"
import { getPurchaseOrderById, updatePurchaseOrder, deletePurchaseOrder } from "@/lib/db-store"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const purchaseOrder = await getPurchaseOrderById(params.id)

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

    // If items are provided, recalculate costs
    if (body.items) {
      const itemsWithCosts = body.items.map((item: any) => {
        const deliveryCostPerUnit =
          (body.deliveryCost || 0) / body.items.reduce((sum: number, i: any) => sum + i.quantity, 0)
        const totalCost = (item.unitCost + deliveryCostPerUnit) * item.quantity

        return {
          ...item,
          deliveryCostPerUnit,
          totalCost,
        }
      })

      body.items = itemsWithCosts
      body.totalCost = itemsWithCosts.reduce((sum: number, item: any) => sum + item.totalCost, 0)
    }

    const updatedPurchaseOrder = await updatePurchaseOrder(params.id, body)

    if (!updatedPurchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json(updatedPurchaseOrder)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deleted = await deletePurchaseOrder(params.id)

    if (!deleted) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting purchase order:", error)
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 })
  }
}
