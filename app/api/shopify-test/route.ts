import { NextResponse } from "next/server"

export async function GET() {
  try {
    // This is a test endpoint to simulate Shopify API calls
    const mockShopifyData = {
      shop: {
        name: "Test Store",
        domain: "test-store.myshopify.com",
        email: "test@example.com",
      },
      orders: [
        {
          id: 1001,
          order_number: "#1001",
          total_price: "149.99",
          created_at: new Date().toISOString(),
          customer: {
            email: "customer@example.com",
            first_name: "John",
            last_name: "Doe",
          },
        },
      ],
    }

    return NextResponse.json({
      success: true,
      message: "Shopify API test successful",
      data: mockShopifyData,
    })
  } catch (error) {
    console.error("Shopify API test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Shopify API test failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
