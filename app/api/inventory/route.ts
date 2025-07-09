import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Fetching inventory from Supabase...")

    const supabase = createServerClient()

    const { data: inventory, error } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to fetch inventory", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log(`✅ Found ${inventory?.length || 0} inventory items`)

    return NextResponse.json(inventory || [])
  } catch (error) {
    console.error("❌ Error fetching inventory:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch inventory",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Creating inventory item in Supabase:", body)

    const supabase = createServerClient()

    // Validate required fields
    if (!body.sku || !body.product_name || !body.quantity_received || !body.unit_cost) {
      return NextResponse.json(
        { error: "Missing required fields: sku, product_name, quantity_received, unit_cost" },
        { status: 400 },
      )
    }

    const { data: newItem, error } = await supabase
      .from("inventory")
      .insert({
        sku: body.sku,
        product_name: body.product_name,
        po_id: body.po_id || null,
        batch_date: body.batch_date || new Date().toISOString().split("T")[0],
        quantity_received: body.quantity_received,
        quantity_remaining: body.quantity_remaining || body.quantity_received,
        unit_cost: body.unit_cost,
        location: body.location || null,
        expiry_date: body.expiry_date || null,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Supabase error:", error)
      return NextResponse.json(
        { error: "Failed to create inventory item", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Inventory item created:", newItem.id)

    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating inventory item:", error)

    return NextResponse.json(
      {
        error: "Failed to create inventory item",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
