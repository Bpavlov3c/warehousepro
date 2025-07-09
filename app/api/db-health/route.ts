import { NextResponse } from "next/server"
import { healthCheck } from "@/lib/database"

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
    console.log("🔍 Running database health check...")
    const health = await healthCheck()

    const statusCode = health.status === "healthy" ? 200 : 503
    const response = NextResponse.json(health, { status: statusCode })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Health check error:", error)
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
