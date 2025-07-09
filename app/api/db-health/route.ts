import { NextResponse } from "next/server"
import { healthCheck } from "@/lib/database"

export async function GET() {
  try {
    const health = await healthCheck()
    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
