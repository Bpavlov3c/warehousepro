import { type NextRequest, NextResponse } from "next/server"
import { supabaseStore } from "@/lib/supabase-store"
import { ShopifyAPI } from "@/lib/shopify-api"

export async function POST(request: NextRequest) {
  try {
    console.log("Starting Shopify orders sync...")

    // Get all connected stores
    const stores = await supabaseStore.getShopifyStores()
    // Allow stores that are currently being tested as well
    const connectedStores = stores.filter((store) => store.status === "Connected" || store.status === "Testing")

    if (connectedStores.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No connected Shopify stores found",
      })
    }

    let totalOrdersSynced = 0
    const results = []

    for (const store of connectedStores) {
      try {
        console.log(`Syncing orders for store: ${store.name}`)

        const shopifyAPI = new ShopifyAPI({
          shopDomain: store.shopifyDomain,
          accessToken: store.accessToken,
        })

        // Test connection first
        const isConnected = await shopifyAPI.testConnection()
        if (!isConnected) {
          console.error(`Failed to connect to store: ${store.name}`)
          results.push({
            store: store.name,
            success: false,
            error: "Connection failed",
            ordersSynced: 0,
          })
          continue
        }

        let createdAtMin: string | undefined
        if (store.lastSync && store.lastSync !== "Never") {
          const lastSyncDate = new Date(store.lastSync)
          const oneHourBuffer = new Date(lastSyncDate.getTime() - 60 * 60 * 1000) // Subtract 1 hour
          createdAtMin = oneHourBuffer.toISOString()
          console.log(`Using incremental sync from: ${createdAtMin} (1 hour before last sync: ${store.lastSync})`)
        } else {
          console.log(`First sync for store ${store.name} - fetching all orders`)
        }

        // Fetch orders with progress tracking and optional date filter
        let currentProgress = 0
        let totalEstimate = 0

        const orders = await shopifyAPI.getAllOrders((current, total) => {
          currentProgress = current
          totalEstimate = total
          console.log(`Store ${store.name}: ${current}/${total} orders fetched`)
        }, createdAtMin)

        console.log(`Fetched ${orders.length} orders from ${store.name}`)

        if (orders.length === 0) {
          results.push({
            store: store.name,
            success: true,
            ordersSynced: 0,
            message: "No orders found",
          })
          continue
        }

        // Transform orders for database
        const transformedOrders = orders.map((order) => shopifyAPI.transformOrderForDatabase(order, store.id))

        // Save to database in batches
        const batchSize = 100
        let syncedCount = 0

        for (let i = 0; i < transformedOrders.length; i += batchSize) {
          const batch = transformedOrders.slice(i, i + batchSize)
          console.log(`Saving batch ${Math.floor(i / batchSize) + 1} for ${store.name} (${batch.length} orders)`)

          await supabaseStore.addShopifyOrders(batch)
          // Process any new fulfilled orders for inventory deduction
          console.log(`Processing fulfilled orders for inventory deduction...`)
          await supabaseStore.processFulfilledOrdersForInventory()
          syncedCount += batch.length

          console.log(`Saved ${syncedCount}/${transformedOrders.length} orders for ${store.name}`)
        }

        // Update store sync status
        await supabaseStore.updateShopifyStore(store.id, {
          lastSync: new Date().toISOString(),
          totalOrders: orders.length,
        })

        totalOrdersSynced += syncedCount
        results.push({
          store: store.name,
          success: true,
          ordersSynced: syncedCount,
        })

        console.log(`Completed sync for ${store.name}: ${syncedCount} orders`)
      } catch (error) {
        console.error(`Error syncing store ${store.name}:`, error)
        results.push({
          store: store.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          ordersSynced: 0,
        })
      }
    }

    console.log(`Sync completed. Total orders synced: ${totalOrdersSynced}`)

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${totalOrdersSynced} orders from ${connectedStores.length} stores and processed inventory deductions`,
      totalOrdersSynced,
      storeResults: results,
    })
  } catch (error) {
    console.error("Error in Shopify orders sync:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to sync Shopify orders",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to sync Shopify orders",
  })
}
