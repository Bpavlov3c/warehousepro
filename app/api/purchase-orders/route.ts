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

export async function GET() {
  try {
    console.log("📦 Fetching purchase orders...")
    const purchaseOrders = await PurchaseOrderStore.getAll()
    console.log(`✅ Found ${purchaseOrders.length} purchase orders`)

    const response = NextResponse.json(purchaseOrders)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching purchase orders:", error)
    const response = NextResponse.json(
      { error: "Failed to fetch purchase orders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Creating purchase order:", body)

    // Validate required fields
    if (!body.po_number || !body.supplier_name || !body.order_date) {
      const response = NextResponse.json(
        { error: "Missing required fields: po_number, supplier_name, order_date" },
        { status: 400 },
      )
      return addCorsHeaders(response)
    }

    const purchaseOrder = await PurchaseOrderStore.create({
      po_number: body.po_number,
      supplier_name: body.supplier_name,
      order_date: body.order_date,
      expected_delivery: body.expected_delivery,
      status: body.status || "pending",
      total_amount: body.total_amount || 0,
      notes: body.notes,
    })

    console.log("✅ Purchase order created:", purchaseOrder.id)
    const response = NextResponse.json(purchaseOrder, { status: 201 })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error creating purchase order:", error)
    const response = NextResponse.json(
      { error: "Failed to create purchase order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
