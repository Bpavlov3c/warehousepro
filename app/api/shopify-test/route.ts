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
    const testResult = {
      status: "success",
      message: "Shopify API test endpoint working",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    }

    console.log("✅ Shopify test endpoint called")
    const response = NextResponse.json(testResult)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Shopify test error:", error)
    const response = NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
