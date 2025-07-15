import { NextResponse } from "next/server"
import { supabaseStore } from "@/lib/supabase-store"

export async function GET() {
  try {
    const stats = await supabaseStore.getShopifyOrderStats()
    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching order stats:", error)
    return NextResponse.json({ error: "Failed to fetch order statistics" }, { status: 500 })
  }
}
