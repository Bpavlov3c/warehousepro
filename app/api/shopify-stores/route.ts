import { type NextRequest, NextResponse } from "next/server"
import { getShopifyStores, createShopifyStore } from "@/lib/db-store"

export async function GET() {
  try {
    const stores = await getShopifyStores()
    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching Shopify stores:", error)
    return NextResponse.json({ error: "Failed to fetch Shopify stores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Validate required fields
    if (!data.name || !data.domain || !data.access_token) {
      return NextResponse.json({ error: "Missing required fields: name, domain, access_token" }, { status: 400 })
    }

    const store = await createShopifyStore({
      name: data.name,
      domain: data.domain,
      access_token: data.access_token,
      is_active: data.is_active !== undefined ? data.is_active : true,
    })

    return NextResponse.json(store, { status: 201 })
  } catch (error) {
    console.error("Error creating Shopify store:", error)
    return NextResponse.json({ error: "Failed to create Shopify store" }, { status: 500 })
  }
}
