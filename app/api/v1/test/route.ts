import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  console.log("[v0] Test API endpoint called")
  console.log("[v0] Request URL:", request.url)
  console.log("[v0] Request headers:", Object.fromEntries(request.headers.entries()))

  return NextResponse.json(
    {
      message: "API is working",
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    },
  )
}

export async function OPTIONS(request: NextRequest) {
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
