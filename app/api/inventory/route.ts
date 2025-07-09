import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Fetching inventory data from Supabase...")

    const supabase = createServerClient()

    // Get inventory summary using the view
    const { data: inventoryData, error } = await supabase
      .from("product_inventory_summary")
      .select("*")
      .order("product_name", { ascending: true })

    if (error) {
      console.error("❌ Supabase error:", error)
      throw error
    }

    console.log(`✅ Found ${inventoryData?.length || 0} inventory items`)

    // Ensure all numeric fields are properly typed
    const formattedData =
      inventoryData?.map((row) => ({
        ...row,
        current_stock: Number(row.current_stock) || 0,
        avg_unit_cost: Number(row.avg_unit_cost) || 0,
        total_value: Number(row.total_value) || 0,
        reorder_level: Number(row.reorder_level) || 0,
        batch_count: Number(row.batch_count) || 0,
      })) || []

    return NextResponse.json(formattedData)
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
    if (!body.sku || !body.product_name || !body.quantity_remaining || !body.unit_cost) {
      return NextResponse.json(
        { error: "Missing required fields: sku, product_name, quantity_remaining, unit_cost" },
        { status: 400 },
      )
    }

    const { data: newInventoryItem, error } = await supabase
      .from("inventory")
      .insert({
        sku: body.sku,
        product_name: body.product_name,
        po_id: body.po_id || null,
        batch_date: body.batch_date || new Date().toISOString().split("T")[0],
        quantity_received: body.quantity_received || body.quantity_remaining,
        quantity_remaining: body.quantity_remaining,
        unit_cost: body.unit_cost,
        location: body.location || null,
        expiry_date: body.expiry_date || null,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Supabase error:", error)
      throw error
    }

    console.log("✅ Inventory item created:", newInventoryItem.id)

    return NextResponse.json(newInventoryItem, { status: 201 })
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
