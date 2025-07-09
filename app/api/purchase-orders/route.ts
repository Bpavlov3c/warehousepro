import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, handleSupabaseError } from "@/lib/supabase"

export async function GET(_: NextRequest) {
  try {
    const supabase = createServerClient()

    // ——————————————————————————
    // 1️⃣  Fetch purchase_orders only
    // ——————————————————————————
    const { data: orders, error: orderErr } = await supabase
      .from("purchase_orders")
      .select("*")
      .order("po_date", { ascending: false })

    if (orderErr) {
      console.error("❌ Supabase order query failed:", orderErr)
      return NextResponse.json(
        { error: "Supabase order query failed", details: handleSupabaseError(orderErr) },
        { status: 500 },
      )
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json([])
    }

    // ——————————————————————————
    // 2️⃣  Fetch items for each order in parallel
    // ——————————————————————————
    const ordersWithItems = await Promise.all(
      orders.map(async (o) => {
        const { data: items, error: itemErr } = await supabase.from("po_items").select("*").eq("po_id", o.id)

        if (itemErr) {
          console.warn(`⚠️  Could not fetch items for PO ${o.id}:`, itemErr)
        }

        return {
          ...o,
          items: items ?? [],
        }
      }),
    )

    console.log(`✅ Returned ${ordersWithItems.length} purchase orders`)

    return NextResponse.json(ordersWithItems)
  } catch (err) {
    console.error("❌ Unexpected API error:", err)
    return NextResponse.json(
      {
        error: "Failed to fetch purchase orders",
        details: err instanceof Error ? err.message : "Unknown error",
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

      throw error
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
