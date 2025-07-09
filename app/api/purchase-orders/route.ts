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
    const data = await request.json()

    // Validate required fields
    if (!data.supplier || !data.order_date || !data.expected_delivery) {
      return NextResponse.json(
        { error: "Missing required fields: supplier, order_date, expected_delivery" },
        { status: 400 },
      )
    }

    // Calculate total cost from items
    const totalCost = data.items?.reduce((sum: number, item: any) => sum + item.total_cost, 0) || 0

    const purchaseOrder = await createPurchaseOrder({
      ...data,
      total_cost: totalCost,
      status: data.status || "pending",
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
