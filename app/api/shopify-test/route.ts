import { NextResponse } from "next/server"

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

    return NextResponse.json(testResult)
  } catch (error) {
    console.error("❌ Shopify test error:", error)
    return NextResponse.json(
      { error: "Shopify test failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
