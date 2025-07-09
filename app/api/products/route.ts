import { type NextRequest, NextResponse } from "next/server"
import { ProductStore } from "@/lib/db-store"

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(`📦 Fetching products - Page: ${page}, Limit: ${limit}`)

    const result = await ProductStore.getAll(page, limit)
    console.log(`✅ Found ${result.data.length} products (${result.total} total)`)

    const response = NextResponse.json(result)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching products:", error)
    const response = NextResponse.json(
      {
        error: "Failed to fetch products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Creating product:", body)

    // Validate required fields
    if (!body.sku || !body.name) {
      const response = NextResponse.json({ error: "Missing required fields: sku, name" }, { status: 400 })
      return addCorsHeaders(response)
    }

    const product = await ProductStore.create({
      sku: body.sku,
      name: body.name,
      description: body.description,
      min_stock: Number.parseInt(body.min_stock) || 0,
      max_stock: Number.parseInt(body.max_stock) || 100,
    })

    console.log("✅ Product created:", product.id)
    const response = NextResponse.json(product, { status: 201 })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error creating product:", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("duplicate key")) {
      const response = NextResponse.json({ error: "SKU already exists" }, { status: 409 })
      return addCorsHeaders(response)
    }

    const response = NextResponse.json(
      { error: "Failed to create product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
