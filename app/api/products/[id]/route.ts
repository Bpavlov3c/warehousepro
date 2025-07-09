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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      return addCorsHeaders(response)
    }

    const product = await ProductStore.getById(id)
    if (!product) {
      const response = NextResponse.json({ error: "Product not found" }, { status: 404 })
      return addCorsHeaders(response)
    }

    const response = NextResponse.json(product)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error fetching product:", error)
    const response = NextResponse.json(
      { error: "Failed to fetch product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      return addCorsHeaders(response)
    }

    const body = await request.json()
    console.log(`📝 Updating product ${id}:`, body)

    // Convert numeric fields
    if (body.min_stock !== undefined) {
      body.min_stock = Number.parseInt(body.min_stock) || 0
    }
    if (body.max_stock !== undefined) {
      body.max_stock = Number.parseInt(body.max_stock) || 100
    }

    const updatedProduct = await ProductStore.update(id, body)

    if (!updatedProduct) {
      const response = NextResponse.json({ error: "Product not found" }, { status: 404 })
      return addCorsHeaders(response)
    }

    console.log("✅ Product updated:", updatedProduct.id)
    const response = NextResponse.json(updatedProduct)
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error updating product:", error)

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("duplicate key")) {
      const response = NextResponse.json({ error: "SKU already exists" }, { status: 409 })
      return addCorsHeaders(response)
    }

    const response = NextResponse.json(
      { error: "Failed to update product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    if (isNaN(id)) {
      const response = NextResponse.json({ error: "Invalid ID" }, { status: 400 })
      return addCorsHeaders(response)
    }

    console.log(`🗑️ Deleting product ${id}`)
    const deleted = await ProductStore.delete(id)

    if (!deleted) {
      const response = NextResponse.json({ error: "Product not found" }, { status: 404 })
      return addCorsHeaders(response)
    }

    console.log("✅ Product deleted:", id)
    const response = NextResponse.json({ message: "Product deleted successfully" })
    return addCorsHeaders(response)
  } catch (error) {
    console.error("❌ Error deleting product:", error)
    const response = NextResponse.json(
      { error: "Failed to delete product", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
    return addCorsHeaders(response)
  }
}
