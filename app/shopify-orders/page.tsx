import { supabaseStore } from "@/lib/supabase-store"
import ShopifyOrdersClientComponent from "@/components/shopify-orders-client"

export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function ShopifyOrdersPage() {
  try {
    // Always load fresh data from the database
    const result = await supabaseStore.getShopifyOrders({ limit: 20, offset: 0 })

    return (
      <ShopifyOrdersClientComponent
        initialOrders={result.data}
        initialTotal={result.total}
        initialHasMore={result.hasMore}
      />
    )
  } catch (error) {
    console.error("Error loading initial orders:", error)

    // Return error state component with empty data
    return <ShopifyOrdersClientComponent initialOrders={[]} initialTotal={0} initialHasMore={false} />
  }
}
