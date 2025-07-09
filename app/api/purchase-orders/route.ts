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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(`📦 Fetching purchase orders - Page: ${page}, Limit: ${limit}`)

    const result = await PurchaseOrderStore.getAll(page, limit)
    console.log(`✅ Found ${result.data.length} purchase orders (${result.total} total)`)

    const response = NextResponse.json(result)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching purchase orders:", error)
    const response = NextResponse.json(
      {
        error: "Failed to fetch purchase orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
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
    if (!body.po_number || !body.supplier_name || !body.po_date) {
      const response = NextResponse.json(
        { error: "Missing required fields: po_number, supplier_name, po_date" },
        { status: 400 },
      )
      return addCorsHeaders(response)
    }

    const purchaseOrder = await PurchaseOrderStore.create({
      po_number: body.po_number,
      supplier_name: body.supplier_name,
      po_date: body.po_date,
      delivery_cost: Number.parseFloat(body.delivery_cost) || 0,
      status: body.status || "Pending",
      notes: body.notes,
      items: body.items || [],
    })

    console.log("✅ Purchase order created:", purchaseOrder.id)
    const response = NextResponse.json(purchaseOrder, { status: 201 })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error creating purchase order:", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("duplicate key")) {
      const response = NextResponse.json({ error: "PO Number already exists" }, { status: 409 })
      return addCorsHeaders(response)
    }

    const response = NextResponse.json(
      { error: "Failed to create purchase order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
