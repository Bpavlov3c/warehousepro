import { type NextRequest, NextResponse } from "next/server"
import { getAllShopifyStores, createShopifyStore } from "@/lib/db-store"

export async function GET() {
  try {
    const stores = await getAllShopifyStores()
    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching Shopify stores:", error)
    return NextResponse.json({ error: "Failed to fetch Shopify stores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.store_name || !body.shop_domain) {
      return NextResponse.json({ error: "Missing required fields: store_name, shop_domain" }, { status: 400 })
    }

    const store = await createShopifyStore({
      store_name: body.store_name,
      shop_domain: body.shop_domain,
      access_token: body.access_token,
      is_active: body.is_active !== undefined ? body.is_active : true,
      last_sync: body.last_sync,
    })

    return NextResponse.json(store, { status: 201 })
  } catch (error) {
    console.error("Error creating Shopify store:", error)
    return NextResponse.json({ error: "Failed to create Shopify store" }, { status: 500 })
  }
}
