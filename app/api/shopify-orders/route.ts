import { NextResponse } from "next/server"
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
    console.log("📦 Fetching Shopify orders...")
    const result = await ShopifyOrderStore.getAll(1, 50)
    console.log(`✅ Found ${result.data.length} Shopify orders`)

    const response = NextResponse.json(result.data)
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("📝 Processing Shopify order sync request:", body)

    // This would typically integrate with Shopify API
    // For now, return a mock response
    const mockOrders = [
      {
        id: 1,
        order_number: "#1001",
        customer_name: "John Doe",
        email: "john@example.com",
        total_price: 99.99,
        status: "fulfilled",
        created_at: "2024-01-15T10:30:00Z",
        items: [
          { name: "Wireless Mouse", quantity: 1, price: 25.99 },
          { name: "USB Cable", quantity: 2, price: 12.5 },
        ],
      },
    ]

    const response = NextResponse.json({ ok: true, orders: mockOrders })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error processing Shopify orders:", error)
    const response = NextResponse.json(
      { error: "Failed to process Shopify orders", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
