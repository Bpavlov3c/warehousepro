import { type NextRequest, NextResponse } from "next/server"
import { dbStore } from "@/lib/db-store"
import { testConnection } from "@/lib/database"

export async function GET() {
  try {
    // Test database connection
    const isConnected = await testConnection()
    if (!isConnected) {
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
    }

    const purchaseOrders = await dbStore.getPurchaseOrders()
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
    if (!body.supplier || !body.date) {
      return NextResponse.json({ error: "Supplier and date are required" }, { status: 400 })
    }

    const purchaseOrder = await dbStore.createPurchaseOrder(body)
    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating purchase order:", error)
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 })
  }
}
