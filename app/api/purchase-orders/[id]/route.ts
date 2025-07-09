import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    console.log(`🔄 Updating purchase order ${id}:`, body)

    const supabase = createServerClient()

    const { data: updatedOrder, error } = await supabase
      .from("purchase_orders")
      .update({
        status: body.status,
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

    console.log(`🗑️ Deleting purchase order ${id}`)

    const supabase = createServerClient()

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
