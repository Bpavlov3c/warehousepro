import { type NextRequest, NextResponse } from "next/server"
import { dbStore } from "@/lib/db-store"

export async function GET() {
  try {
    const stores = await dbStore.getShopifyStores()
    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching Shopify stores:", error)
    return NextResponse.json({ error: "Failed to fetch Shopify stores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.shopifyDomain || !body.accessToken) {
      return NextResponse.json({ error: "Name, domain, and access token are required" }, { status: 400 })
    }

    const store = await dbStore.createShopifyStore(body)
    return NextResponse.json(store, { status: 201 })
  } catch (error) {
    console.error("Error creating Shopify store:", error)
    return NextResponse.json({ error: "Failed to create Shopify store" }, { status: 500 })
  }
}
