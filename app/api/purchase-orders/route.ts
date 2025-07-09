import { type NextRequest, NextResponse } from "next/server"
import { getAllPurchaseOrders, createPurchaseOrder } from "@/lib/db-store"

export async function GET() {
  try {
    const purchaseOrders = await getAllPurchaseOrders()
    return NextResponse.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Calculate costs for each item
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

    // Calculate total cost
    const totalCost = itemsWithCosts.reduce((sum: number, item: any) => sum + item.totalCost, 0)

    const purchaseOrderData = {
      supplier: body.supplier,
      orderDate: body.orderDate,
      expectedDelivery: body.expectedDelivery,
      status: body.status || "pending",
      items: itemsWithCosts,
      totalCost,
      notes: body.notes,
    }

    const newPurchaseOrder = await createPurchaseOrder(purchaseOrderData)
    return NextResponse.json(newPurchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
