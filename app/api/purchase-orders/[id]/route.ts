import { type NextRequest, NextResponse } from "next/server"
import { dbStore } from "@/lib/db-store"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const updatedPO = await dbStore.updatePurchaseOrder(params.id, body)

    if (!updatedPO) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
    }

    return NextResponse.json(updatedPO)
  } catch (error) {
    console.error("Error updating purchase order:", error)
    return NextResponse.json({ error: "Failed to update purchase order" }, { status: 500 })
  }
}
