import { type NextRequest, NextResponse } from "next/server"
import { ShopifyOrderStore } from "@/lib/db-store"

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
    // Mock Shopify orders data for now
    const mockOrders = [
      {
        id: 1,
        shopify_order_id: 1001,
        order_number: "#1001",
        customer_email: "customer1@example.com",
        customer_name: "John Doe",
        total_amount: 99.99,
        currency: "USD",
        fulfillment_status: "fulfilled",
        financial_status: "paid",
        order_date: "2024-01-15T10:30:00Z",
        created_at: "2024-01-15T10:30:00Z",
      },
      {
        id: 2,
        shopify_order_id: 1002,
        order_number: "#1002",
        customer_email: "customer2@example.com",
        customer_name: "Jane Smith",
        total_amount: 149.5,
        currency: "USD",
        fulfillment_status: "pending",
        financial_status: "paid",
        order_date: "2024-01-16T14:20:00Z",
        created_at: "2024-01-16T14:20:00Z",
      },
    ]

    console.log(`✅ Returning ${mockOrders.length} Shopify orders`)
    const response = NextResponse.json(mockOrders)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching Shopify orders:", error)
    const response = NextResponse.json(
      { error: "Failed to fetch Shopify orders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (
      !body.shopify_order_id ||
      !body.store_id ||
      !body.order_number ||
      !body.total_amount ||
      !body.order_status ||
      !body.order_date
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const order = await ShopifyOrderStore.create({
      shopify_order_id: body.shopify_order_id,
      store_id: body.store_id,
      order_number: body.order_number,
      customer_email: body.customer_email,
      customer_name: body.customer_name,
      total_amount: body.total_amount,
      currency: body.currency || "USD",
      order_status: body.order_status,
      fulfillment_status: body.fulfillment_status,
      financial_status: body.financial_status,
      order_date: body.order_date,
    })

    return addCorsHeaders(NextResponse.json(order, { status: 201 }))
  } catch (error) {
    console.error("Error creating Shopify order:", error)
    const response = NextResponse.json({ error: "Failed to create Shopify order" }, { status: 500 })
    return addCorsHeaders(response)
  }
}
