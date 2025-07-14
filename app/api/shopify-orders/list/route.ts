import { NextResponse } from "next/server"
import { supabaseStore } from "@/lib/supabase-store"

export async function GET() {
  try {
    const orders = await supabaseStore.getShopifyOrders()
    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
