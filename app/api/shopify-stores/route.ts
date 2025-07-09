import { type NextRequest, NextResponse } from "next/server"
import { getStores, createStore, updateStore, deleteStore } from "@/lib/db-store"

export async function GET() {
  try {
    const stores = await getStores()
    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching stores:", error)
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const newStore = await createStore(body)
    return NextResponse.json(newStore, { status: 201 })
  } catch (error) {
    console.error("Error creating store:", error)
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 })
    }

    const updatedStore = await updateStore(id, updates)
    return NextResponse.json(updatedStore)
  } catch (error) {
    console.error("Error updating store:", error)
    return NextResponse.json({ error: "Failed to update store" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 })
    }

    await deleteStore(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting store:", error)
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 })
  }
}
