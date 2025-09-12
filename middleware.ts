import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  console.log("[v0] Middleware called for:", request.nextUrl.pathname)
  console.log("[v0] Request method:", request.method)

  // Handle API routes that require authentication
  if (request.nextUrl.pathname.startsWith("/api/v1/")) {
    console.log("[v0] Processing API v1 route")

    // CORS preflight handling
    if (request.method === "OPTIONS") {
      console.log("[v0] Handling OPTIONS preflight request")
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
      })
    }

    // Check for Authorization header
    const authHeader = request.headers.get("authorization")
    console.log("[v0] Authorization header:", authHeader ? `${authHeader.substring(0, 20)}...` : "none")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("[v0] Missing or invalid Authorization header")
      return NextResponse.json(
        { error: "Missing or invalid Authorization header. Use: Bearer <api_key>" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          },
        },
      )
    }

    console.log("[v0] Authorization header valid, proceeding to route handler")
  }

  console.log("[v0] Middleware passing request to next handler")
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/v1/:path*"],
}
