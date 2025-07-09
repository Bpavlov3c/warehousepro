import { type NextRequest, NextResponse } from "next/server"
import { getPurchaseOrders, createPurchaseOrder } from "@/lib/db-store"

export async function GET() {
  try {
    const purchaseOrders = await getPurchaseOrders()
    return NextResponse.json(purchaseOrders)
  } catch (error) {
    console.error("Error fetching purchase orders:", error)
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { purchaseOrder, items } = body

    if (!purchaseOrder || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid request body. Expected purchaseOrder and items." }, { status: 400 })
    }

    // Calculate delivery cost per unit for each item
    const totalQuantity = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const deliveryCostPerUnit = totalQuantity > 0 ? purchaseOrder.delivery_cost / totalQuantity : 0

    const processedItems = items.map((item: any) => ({
      ...item,
      delivery_cost_per_unit: deliveryCostPerUnit,
      total_cost: item.unit_cost * item.quantity + deliveryCostPerUnit * item.quantity,
    }))

    const newPurchaseOrder = await createPurchaseOrder(purchaseOrder, processedItems)
    return NextResponse.json(newPurchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
