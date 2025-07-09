import { type NextRequest, NextResponse } from "next/server"
import { PurchaseOrderStore } from "@/lib/db-store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(`📦 Fetching purchase orders - Page: ${page}, Limit: ${limit}`)

    const result = await PurchaseOrderStore.getAll(page, limit)
    console.log(`✅ Found ${result.data.length} purchase orders (${result.total} total)`)

    return NextResponse.json(result)
  } catch (error) {
    console.error("❌ Error fetching purchase orders:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch purchase orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Creating purchase order:", body)

    // Validate required fields
    if (!body.po_number || !body.supplier_name || !body.po_date) {
      return NextResponse.json({ error: "Missing required fields: po_number, supplier_name, po_date" }, { status: 400 })
    }

    const purchaseOrder = await PurchaseOrderStore.create({
      po_number: body.po_number,
      supplier_name: body.supplier_name,
      po_date: body.po_date,
      expected_delivery: body.expected_delivery,
      status: body.status || "pending",
      total_amount: Number.parseFloat(body.total_amount) || 0,
      notes: body.notes,
    })

    console.log("✅ Purchase order created:", purchaseOrder.id)
    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating purchase order:", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return NextResponse.json({ error: "PO Number already exists" }, { status: 409 })
    }

    return NextResponse.json(
      { error: "Failed to create purchase order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
