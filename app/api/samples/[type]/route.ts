import { type NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(request: NextRequest, { params }: { params: { type: string } }) {
  try {
    const { type } = params

    console.log("[v0] Sample file request for type:", type)

    // Validate the type parameter
    const validTypes = ["purchase-orders", "inventory", "orders", "returns"]
    if (!validTypes.includes(type)) {
      console.log("[v0] Invalid sample type requested:", type)
      return new NextResponse("Invalid sample type", { status: 400 })
    }

    const filePath = join(process.cwd(), "public", "samples", `sample-${type}.csv`)
    console.log("[v0] Looking for file at:", filePath)

    if (!existsSync(filePath)) {
      console.log("[v0] Sample file does not exist:", filePath)
      return new NextResponse("Sample file not found", { status: 404 })
    }

    // Read the CSV file from the public directory
    const fileContent = await readFile(filePath, "utf-8")
    console.log("[v0] File content length:", fileContent.length)
    console.log("[v0] File content preview:", fileContent.substring(0, 100))

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sample-${type}.csv"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("[v0] Error serving sample file:", error)
    return new NextResponse(`Sample file error: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    })
  }
}
