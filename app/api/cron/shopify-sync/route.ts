import { type NextRequest, NextResponse } from "next/server"
import { supabaseStore } from "@/lib/supabase-store"
import { ShopifyAPI } from "@/lib/shopify-api"

/**
 * Cron job endpoint for daily Shopify order sync
 * Configured to run daily (typically via Vercel Cron Jobs)
 * 
 * Authorization: Protected by Vercel's CRON_SECRET
 * To trigger: POST /api/cron/shopify-sync with Authorization header
 * 
 * Shopify API Limits:
 * - Rate limit: 2 requests/second (40 requests per 20 seconds)
 * - Max results per request: 250 orders
 * - Link header pagination for efficient fetching
 * - API version: 2024-10
 */

export async function POST(request: NextRequest) {
  // Verify the cron secret for security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized - Invalid or missing CRON_SECRET",
      },
      { status: 401 },
    )
  }

  try {
    console.log("[CRON] Starting daily Shopify orders sync at", new Date().toISOString())

    // Get all connected stores
    const stores = await supabaseStore.getShopifyStores()
    const connectedStores = stores.filter((store) => store.status === "Connected" || store.status === "Testing")

    // Filter to only stores with sync_enabled = true
    const scheduledStores = connectedStores.filter((store) => store.syncEnabled === true)
    const disabledStores = connectedStores.filter((store) => store.syncEnabled !== true)

    if (scheduledStores.length === 0) {
      console.log(`[CRON] No stores with automatic sync enabled (${disabledStores.length} stores have sync disabled)`)
      return NextResponse.json({
        success: true,
        message: "No stores with automatic sync enabled",
        storeCount: 0,
        totalOrdersSynced: 0,
        disabledStoresCount: disabledStores.length,
      })
    }

    console.log(
      `[CRON] Found ${scheduledStores.length} store(s) with automatic sync enabled${disabledStores.length > 0 ? ` (${disabledStores.length} disabled)` : ""}`,
    )

    let totalOrdersSynced = 0
    const results = []

    for (const store of scheduledStores) {
      try {
        console.log(`[CRON] Syncing orders for store: ${store.name}`)

        const shopifyAPI = new ShopifyAPI({
          shopDomain: store.shopifyDomain,
          accessToken: store.accessToken,
        })

        // Test connection first
        const isConnected = await shopifyAPI.testConnection()
        if (!isConnected) {
          console.error(`[CRON] Failed to connect to store: ${store.name}`)
          results.push({
            store: store.name,
            success: false,
            error: "Connection failed",
            ordersSynced: 0,
          })
          continue
        }

        // Use incremental sync from last sync time
        let createdAtMin: string | undefined
        if (store.lastSync && store.lastSync !== "Never") {
          const lastSyncDate = new Date(store.lastSync)
          // Add 1 hour buffer to catch any orders that might have been missed
          const oneHourBuffer = new Date(lastSyncDate.getTime() - 60 * 60 * 1000)
          createdAtMin = oneHourBuffer.toISOString()
          console.log(`[CRON] Incremental sync for ${store.name} from: ${createdAtMin}`)
        } else {
          console.log(`[CRON] First sync for store ${store.name} - fetching all orders (this may take a while)`)
        }

        // Fetch orders with progress tracking
        const orders = await shopifyAPI.getAllOrders((current, total) => {
          console.log(`[CRON] ${store.name}: ${current}/${total} orders fetched`)
        }, createdAtMin)

        console.log(`[CRON] Fetched ${orders.length} new/updated orders from ${store.name}`)

        if (orders.length === 0) {
          console.log(`[CRON] No new orders for ${store.name}`)
          results.push({
            store: store.name,
            success: true,
            ordersSynced: 0,
            message: "No new orders",
          })
          // Update last_scheduled_sync timestamp even for no new orders
          await supabaseStore.updateShopifyStore(store.id, {
            lastScheduledSync: new Date().toISOString(),
          })
          continue
        }

        // Transform orders for database
        const transformedOrders = orders.map((order) => shopifyAPI.transformOrderForDatabase(order, store.id))

        // Save to database in batches (100 orders per batch)
        const batchSize = 100
        let syncedCount = 0

        for (let i = 0; i < transformedOrders.length; i += batchSize) {
          const batch = transformedOrders.slice(i, i + batchSize)
          console.log(
            `[CRON] Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedOrders.length / batchSize)} for ${store.name}`,
          )

          await supabaseStore.addShopifyOrders(batch)
          syncedCount += batch.length
        }

        // Process inventory for fulfilled orders
        console.log(`[CRON] Processing fulfilled orders for inventory deduction...`)
        await supabaseStore.processFulfilledOrdersForInventory()

        // Calculate next scheduled sync
        const now = new Date()
        const nextSync = new Date(now)
        nextSync.setUTCHours(store.syncScheduleHour || 1, 0, 0, 0)
        if (nextSync <= now) {
          nextSync.setUTCDate(nextSync.getUTCDate() + 1)
        }

        // Update store sync status with scheduler timestamps
        await supabaseStore.updateShopifyStore(store.id, {
          lastSync: new Date().toISOString(),
          lastScheduledSync: new Date().toISOString(),
          nextScheduledSync: nextSync.toISOString(),
          totalOrders: orders.length,
        })

        totalOrdersSynced += syncedCount
        results.push({
          store: store.name,
          success: true,
          ordersSynced: syncedCount,
          nextScheduledSync: nextSync.toISOString(),
        })

        console.log(`[CRON] Completed sync for ${store.name}: ${syncedCount} orders saved`)
      } catch (error) {
        console.error(`[CRON] Error syncing store ${store.name}:`, error)
        results.push({
          store: store.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          ordersSynced: 0,
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    console.log(
      `[CRON] Daily sync completed at ${new Date().toISOString()}. Total orders synced: ${totalOrdersSynced}`,
    )

    return NextResponse.json({
      success: true,
      message: `Cron sync completed: ${successCount}/${connectedStores.length} stores synced, ${totalOrdersSynced} orders processed`,
      storeCount: connectedStores.length,
      successfulStores: successCount,
      totalOrdersSynced,
      storeResults: results,
    })
  } catch (error) {
    console.error("[CRON] Fatal error in Shopify orders sync:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Cron sync failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// GET handler - health check
export async function GET() {
  return NextResponse.json({
    message: "Shopify sync cron endpoint - use POST with Bearer token to execute",
    documentation: {
      method: "POST",
      authorization: "Bearer {CRON_SECRET}",
      description: "Daily Shopify order synchronization",
      features: [
        "Pagination support (250 orders per request)",
        "Incremental sync from last sync timestamp",
        "Batch processing (100 orders per batch)",
        "Rate limit handling (2 requests/second)",
        "Inventory processing for fulfilled orders",
      ],
    },
  })
}
