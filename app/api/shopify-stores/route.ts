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

    const storeData = {
      name: body.name,
      domain: body.domain,
      accessToken: body.accessToken,
      isActive: body.isActive ?? true,
      lastSync: body.lastSync,
    }

    const newStore = await createShopifyStore(storeData)
    return NextResponse.json(newStore, { status: 201 })
  } catch (error) {
    console.error("Error creating Shopify store:", error)
    return NextResponse.json({ error: "Failed to create Shopify store" }, { status: 500 })
  }
}
