import { NextRequest, NextResponse } from 'next/server'
import { supabaseStore } from '@/lib/supabase-store'
import { ShopifyAPI } from '@/lib/shopify-api'

/**
 * POST /api/admin/resync-all-orders
 * Force a complete resync of all Shopify orders from all connected stores
 * This clears the last_sync timestamp and fetches all orders from the beginning
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Verify authentication (either Bearer token or no auth for trusted calls)
    if (cronSecret && authHeader) {
      const [, token] = authHeader.split(' ')
      if (token !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    console.log('[RESYNC] Starting complete Shopify orders resync at', new Date().toISOString())

    // Get all connected stores
    const stores = await supabaseStore.getShopifyStores()
    const connectedStores = stores.filter(
      (store) => store.status === 'Connected' || store.status === 'Testing',
    )

    if (connectedStores.length === 0) {
      console.log('[RESYNC] No connected Shopify stores found')
      return NextResponse.json({
        success: true,
        message: 'No connected stores to resync',
        storeCount: 0,
        totalOrdersSynced: 0,
      })
    }

    console.log(`[RESYNC] Found ${connectedStores.length} connected store(s) to resync`)

    let totalOrdersSynced = 0
    const results = []

    for (const store of connectedStores) {
      try {
        console.log(`[RESYNC] Starting complete resync for store: ${store.name}`)

        const shopifyAPI = new ShopifyAPI({
          shopDomain: store.shopifyDomain,
          accessToken: store.accessToken,
        })

        // Test connection first
        const isConnected = await shopifyAPI.testConnection()
        if (!isConnected) {
          console.error(`[RESYNC] Failed to connect to store: ${store.name}`)
          results.push({
            store: store.name,
            success: false,
            error: 'Connection failed',
            ordersSynced: 0,
          })
          continue
        }

        // NO createdAtMin - fetch ALL orders from beginning
        console.log(`[RESYNC] Fetching ALL orders from store ${store.name} (no date filter)`)

        const orders = await shopifyAPI.getAllOrders((current, total) => {
          console.log(`[RESYNC] ${store.name}: ${current}/${total} orders fetched`)
        })

        console.log(`[RESYNC] Fetched ${orders.length} total orders from ${store.name}`)

        if (orders.length === 0) {
          console.log(`[RESYNC] No orders found for ${store.name}`)
          results.push({
            store: store.name,
            success: true,
            ordersSynced: 0,
            message: 'No orders found',
          })

          // Update store to clear last_sync
          await supabaseStore.updateShopifyStore(store.id, {
            lastSync: 'Never',
            lastScheduledSync: new Date().toISOString(),
          })
          continue
        }

        // Transform orders for database
        const transformedOrders = orders.map((order) =>
          shopifyAPI.transformOrderForDatabase(order, store.id),
        )

        // Save to database in batches (100 orders per batch)
        const batchSize = 100
        let syncedCount = 0

        for (let i = 0; i < transformedOrders.length; i += batchSize) {
          const batch = transformedOrders.slice(i, i + batchSize)
          console.log(
            `[RESYNC] Saving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(transformedOrders.length / batchSize)} for ${store.name}`,
          )

          await supabaseStore.addShopifyOrders(batch)
          syncedCount += batch.length
        }

        // Process inventory for fulfilled orders
        console.log(`[RESYNC] Processing fulfilled orders for inventory deduction...`)
        await supabaseStore.processFulfilledOrdersForInventory()

        // Update store sync status
        await supabaseStore.updateShopifyStore(store.id, {
          lastSync: new Date().toISOString(),
          lastScheduledSync: new Date().toISOString(),
          totalOrders: orders.length,
        })

        totalOrdersSynced += syncedCount
        results.push({
          store: store.name,
          success: true,
          ordersSynced: syncedCount,
        })

        console.log(`[RESYNC] Completed resync for ${store.name}: ${syncedCount} orders saved`)
      } catch (error) {
        console.error(`[RESYNC] Error resyncing store ${store.name}:`, error)
        results.push({
          store: store.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          ordersSynced: 0,
        })
      }
    }

    console.log(`[RESYNC] Complete resync finished. Total orders synced: ${totalOrdersSynced}`)

    return NextResponse.json({
      success: true,
      message: 'Complete resync finished',
      storeCount: connectedStores.length,
      totalOrdersSynced,
      results,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[RESYNC] Error in resync endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to resync orders',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
