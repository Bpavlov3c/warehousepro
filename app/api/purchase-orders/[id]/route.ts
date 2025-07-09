import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid purchase order ID" }, { status: 400 })
    }

    console.log(`🔄 Fetching purchase order ${id} from Supabase...`)

    const supabase = createServerClient()

    const { data: purchaseOrder, error } = await supabase
      .from("purchase_orders")
      .select(`
        *,
        po_items (
          id,
          sku,
          product_name,
          quantity,
          unit_cost,
          total_cost,
          created_at
        )
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
      }

      console.error("❌ Supabase error:", error)
      throw error
    }

    console.log("✅ Purchase order found")

    // Transform the data to match our interface
    const transformedOrder = {
      ...purchaseOrder,
      items: purchaseOrder.po_items || [],
    }

    return NextResponse.json(transformedOrder)
  } catch (error) {
    console.error("❌ Error fetching purchase order:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch purchase order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid purchase order ID" }, { status: 400 })
    }

    console.log(`📝 Updating purchase order ${id} in Supabase:`, body)

    const supabase = createServerClient()

    const { data: updatedOrder, error } = await supabase
      .from("purchase_orders")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Purchase order not found" }, { status: 404 })
      }

      console.error("❌ Supabase error:", error)
      throw error
    }

    console.log("✅ Purchase order updated")

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error("❌ Error updating purchase order:", error)

    return NextResponse.json(
      {
        error: "Failed to update purchase order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid purchase order ID" }, { status: 400 })
    }

    console.log(`🗑️ Deleting purchase order ${id} from Supabase...`)

    const supabase = createServerClient()

    const { error } = await supabase.from("purchase_orders").delete().eq("id", id)

    if (error) {
      console.error("❌ Supabase error:", error)
      throw error
    }

    console.log("✅ Purchase order deleted")

    return NextResponse.json({ message: "Purchase order deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting purchase order:", error)

    return NextResponse.json(
      {
        error: "Failed to delete purchase order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
