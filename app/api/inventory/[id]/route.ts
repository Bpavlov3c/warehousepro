import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json()
    const id = Number.parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid inventory ID" }, { status: 400 })
    }

    console.log(`📝 Updating inventory ${id} in Supabase:`, body)

    const supabase = createServerClient()

    const { data: updatedInventory, error } = await supabase
      .from("inventory")
      .update({
        quantity_remaining: body.quantity_remaining,
        location: body.location,
        expiry_date: body.expiry_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to update inventory", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Inventory updated:", updatedInventory.id)

    return NextResponse.json(updatedInventory)
  } catch (error) {
    console.error("❌ Error updating inventory:", error)

    return NextResponse.json(
      {
        error: "Failed to update inventory",
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
      return NextResponse.json({ error: "Invalid inventory ID" }, { status: 400 })
    }

    console.log(`🗑️ Deleting inventory ${id} from Supabase`)

    const supabase = createServerClient()

    const { error } = await supabase.from("inventory").delete().eq("id", id)

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to delete inventory", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Inventory deleted:", id)

    return NextResponse.json({ message: "Inventory deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting inventory:", error)

    return NextResponse.json(
      {
        error: "Failed to delete inventory",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
