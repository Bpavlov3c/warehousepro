import { type NextRequest, NextResponse } from "next/server"
import { getProducts, createProduct, updateProduct, deleteProduct, createInventoryAdjustment } from "@/lib/db-store"

export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    if (type === "adjustment") {
      const { productId, quantity, unitCost, notes } = data
      const transaction = await createInventoryAdjustment(productId, quantity, unitCost, notes)
      return NextResponse.json(transaction, { status: 201 })
    } else {
      const newProduct = await createProduct(data)
      return NextResponse.json(newProduct, { status: 201 })
    }
  } catch (error) {
    console.error("Error creating inventory item:", error)
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    const updatedProduct = await updateProduct(id, updates)
    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error("Error updating inventory item:", error)
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 })
    }

    await deleteProduct(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting inventory item:", error)
    return NextResponse.json({ error: "Failed to delete inventory item" }, { status: 500 })
  }
}
