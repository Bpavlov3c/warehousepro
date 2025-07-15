import { supabaseStore } from "@/lib/supabase-store"
import ShopifyOrdersClientComponent from "@/components/shopify-orders-client"

export default async function ShopifyOrdersPage() {
  try {
    // Load initial 20 orders for fast page load
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

    // Return error state component
    return <ShopifyOrdersClientComponent initialOrders={[]} initialTotal={0} initialHasMore={false} />
  }
}
