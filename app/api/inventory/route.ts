import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Fetching inventory from Supabase...")

    const supabase = createServerClient()

    // Use the product_inventory_summary view for aggregated data
    const { data: inventorySummary, error: summaryError } = await supabase
      .from("product_inventory_summary")
      .select("*")
      .order("product_name", { ascending: true })

    if (summaryError) {
      console.error("❌ Supabase inventory summary query failed:", summaryError)
      return NextResponse.json(
        { error: "Failed to fetch inventory summary", details: handleSupabaseError(summaryError) },
        { status: 500 },
      )
    }

    // Also get detailed inventory records
    const { data: inventoryDetails, error: detailsError } = await supabase
      .from("inventory")
      .select("*")
      .order("created_at", { ascending: false })

    if (detailsError) {
      console.error("❌ Supabase inventory details query failed:", detailsError)
      return NextResponse.json(
        { error: "Failed to fetch inventory details", details: handleSupabaseError(detailsError) },
        { status: 500 },
      )
    }

    console.log(`✅ Found ${inventorySummary?.length || 0} inventory items`)

    return NextResponse.json({
      summary: inventorySummary || [],
      details: inventoryDetails || [],
    })
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
    console.log("📝 Creating inventory record in Supabase:", body)

    const supabase = createServerClient()

    // Validate required fields
    if (!body.sku || !body.product_name || !body.quantity_received || !body.unit_cost) {
      return NextResponse.json(
        { error: "Missing required fields: sku, product_name, quantity_received, unit_cost" },
        { status: 400 },
      )
    }

    const { data: newInventory, error } = await supabase
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
        { error: "Failed to create inventory record", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Inventory record created:", newInventory.id)

    return NextResponse.json(newInventory, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating inventory record:", error)

    return NextResponse.json(
      {
        error: "Failed to create inventory record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
