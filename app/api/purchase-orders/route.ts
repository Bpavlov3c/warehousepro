import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function GET(_: NextRequest) {
  try {
    console.log("🔄 Fetching purchase orders from Supabase...")

    const supabase = createServerClient()

    // First, fetch purchase orders
    const { data: orders, error: orderError } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("created_at", { ascending: false })

    if (orderError) {
      console.error("❌ Supabase order query failed:", orderError)
      return NextResponse.json(
        { error: "Failed to fetch purchase orders", details: handleSupabaseError(orderError) },
        { status: 500 },
      )
    }

    if (!orders || orders.length === 0) {
      console.log("✅ No purchase orders found")
      return NextResponse.json([])
    }

    // Then fetch items for each order
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const { data: items, error: itemsError } = await supabase.from("po_items").select("*").eq("po_id", order.id)

        if (itemsError) {
          console.warn(`⚠️ Could not fetch items for PO ${order.id}:`, itemsError)
        }

        return {
          ...order,
          items: items || [],
        }
      }),
    )

    console.log(`✅ Found ${ordersWithItems.length} purchase orders`)
    return NextResponse.json(ordersWithItems)
  } catch (error) {
    console.error("❌ Error fetching purchase orders:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch purchase orders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("📝 Creating purchase order in Supabase:", body)

    const supabase = createServerClient()

    // Validate required fields
    if (!body.po_number || !body.supplier_name || !body.po_date) {
      return NextResponse.json({ error: "Missing required fields: po_number, supplier_name, po_date" }, { status: 400 })
    }

    const { data: newOrder, error } = await supabase
      .from("purchase_orders")
      .insert({
        po_number: body.po_number,
        supplier_name: body.supplier_name,
        po_date: body.po_date,
        delivery_cost: body.delivery_cost || 0,
        status: body.status || "Pending",
        notes: body.notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error("❌ Supabase error:", error)

      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json({ error: "Purchase order number already exists" }, { status: 409 })
      }

      return NextResponse.json(
        { error: "Failed to create purchase order", details: handleSupabaseError(error) },
        { status: 500 },
      )
    }

    console.log("✅ Purchase order created:", newOrder.id)

    return NextResponse.json(newOrder, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating purchase order:", error)

    return NextResponse.json(
      {
        error: "Failed to create purchase order",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
