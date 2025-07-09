import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid purchase order ID" }, { status: 400 })
    }

    console.log(`📝 Updating purchase order ${id} in Supabase:`, body)

    const supabase = createServerClient()

    const { data: updatedOrder, error } = await supabase
      .from("purchase_orders")
      .update({
        status: body.status,
        notes: body.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to update purchase order", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Purchase order updated:", updatedOrder.id)

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

    console.log(`🗑️ Deleting purchase order ${id} from Supabase`)

    const supabase = createServerClient()

    // First delete related po_items
    const { error: itemsError } = await supabase.from("po_items").delete().eq("po_id", id)

    if (itemsError) {
      console.error("❌ Error deleting PO items:", itemsError)
      return NextResponse.json(
        { error: "Failed to delete purchase order items", details: handleSupabaseError(itemsError) },
        { status: 500 },
      )
    }

    // Then delete the purchase order
    const { error } = await supabase.from("purchase_orders").delete().eq("id", id)

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to delete purchase order", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Purchase order deleted:", id)

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
