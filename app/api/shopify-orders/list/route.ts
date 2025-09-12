import { type NextRequest, NextResponse } from "next/server"
import { supabaseStore } from "@/lib/supabase-store"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    console.log(`API: Fetching orders with limit=${limit}, offset=${offset}`)

    const result = await supabaseStore.getShopifyOrders({ limit, offset })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in shopify-orders/list API:", error)
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
  }
}
