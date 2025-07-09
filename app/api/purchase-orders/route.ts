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

    // Validate required fields
    if (!body.po_number || !body.supplier_name || !body.order_date) {
      return NextResponse.json(
        { error: "Missing required fields: po_number, supplier_name, order_date" },
        { status: 400 },
      )
    }

    const purchaseOrder = await createPurchaseOrder({
      po_number: body.po_number,
      supplier_name: body.supplier_name,
      order_date: body.order_date,
      expected_delivery: body.expected_delivery,
      status: body.status || "pending",
      notes: body.notes,
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
