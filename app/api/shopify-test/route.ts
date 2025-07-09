import { NextResponse } from "next/server"

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
    // Mock test response
    const testResult = {
      status: "success",
      message: "Shopify API test successful",
      timestamp: new Date().toISOString(),
      test_data: {
        shop_info: {
          name: "Test Shop",
          domain: "test-shop.myshopify.com",
          email: "test@example.com",
        },
        connection: "active",
      },
    }

    const response = NextResponse.json(testResult)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Shopify test error:", error)
    const response = NextResponse.json(
      { error: "Shopify test failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("🔍 Testing Shopify connection:", { domain: body.domain, hasToken: !!body.accessToken })

    // Mock connection test - in real implementation, this would test the actual Shopify API
    const testResult = {
      ok: true,
      status: "success",
      message: "Connection test successful",
      shop_info: {
        name: "Test Shop",
        domain: body.domain,
        email: "test@example.com",
      },
    }

    const response = NextResponse.json(testResult)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Shopify connection test error:", error)
    const response = NextResponse.json(
      { ok: false, error: "Connection test failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
