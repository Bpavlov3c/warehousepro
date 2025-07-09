import { type NextRequest, NextResponse } from "next/server"
import { ShopifyStoreStore } from "@/lib/db-store"

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
    console.log("🏪 API: Fetching Shopify stores...")
    const stores = await ShopifyStoreStore.getAll()
    console.log(`✅ API: Found ${stores.length} Shopify stores`)

    const response = NextResponse.json(stores)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ API Error fetching Shopify stores:", error)
    const response = NextResponse.json(
      { error: "Failed to fetch Shopify stores", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 API: Creating Shopify store:", body)

    // Validate required fields
    if (!body.store_name || !body.shop_domain || !body.access_token) {
      const response = NextResponse.json(
        { error: "Missing required fields: store_name, shop_domain, access_token" },
        { status: 400 },
      )
      return addCorsHeaders(response)
    }

    const store = await ShopifyStoreStore.create({
      store_name: body.store_name,
      shop_domain: body.shop_domain,
      access_token: body.access_token,
      is_active: body.is_active !== undefined ? body.is_active : true,
    })

    console.log("✅ API: Shopify store created:", store.id)
    const response = NextResponse.json(store, { status: 201 })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ API Error creating Shopify store:", error)
    const response = NextResponse.json(
      { error: "Failed to create Shopify store", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
