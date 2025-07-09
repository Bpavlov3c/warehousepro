import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)
    const body = await request.json()

    console.log(`🔄 Updating inventory item ${id}:`, body)

    const supabase = createServerClient()

    const { data: updatedItem, error } = await supabase
      .from("inventory")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to update inventory item", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Inventory item updated:", updatedItem.id)

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("❌ Error updating inventory item:", error)

    return NextResponse.json(
      {
        error: "Failed to update inventory item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number.parseInt(params.id)

    console.log(`🗑️ Deleting inventory item ${id}`)

    const supabase = createServerClient()

    const { error } = await supabase.from("inventory").delete().eq("id", id)

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to delete inventory item", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Inventory item deleted:", id)

    return NextResponse.json({ message: "Inventory item deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting inventory item:", error)

    return NextResponse.json(
      {
        error: "Failed to delete inventory item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
