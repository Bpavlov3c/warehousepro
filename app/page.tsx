"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Package, DollarSign, TrendingUp, AlertTriangle, ShoppingCart, RotateCcw } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"
import type { InventoryItem, PurchaseOrder, ShopifyOrder, Return } from "@/lib/supabase-store"

// Skeleton components for loading states
const MetricCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
    </CardContent>
  </Card>
)

const ActivityCardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div>
              <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
            <div className="text-right">
              <div className="h-4 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export default function Dashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Memoized calculations to avoid recalculating on every render
  const metrics = useMemo(() => {
    const totalInventoryValue = inventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0)
    const lowStockItems = inventory.filter((item) => item.inStock <= 5).length
    const totalRevenue = shopifyOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const totalProfit = shopifyOrders.reduce((sum, order) => sum + (order.profit || 0), 0)
    const pendingPOs = purchaseOrders.filter((po) => po.status === "Pending" || po.status === "In Transit").length
    const pendingReturns = returns.filter((r) => r.status === "Pending").length
    const totalRefunds = returns.reduce((sum, r) => sum + (r.total_refund || 0), 0)

    return {
      totalInventoryValue,
      lowStockItems,
      totalRevenue,
      totalProfit,
      pendingPOs,
      pendingReturns,
      totalRefunds,
    }
  }, [inventory, shopifyOrders, purchaseOrders, returns])

  // Memoized recent activity to avoid recalculating
  const recentActivity = useMemo(
    () => ({
      recentPOs: purchaseOrders.slice(0, 5),
      recentOrders: shopifyOrders.slice(0, 5),
      recentReturns: returns.slice(0, 5),
    }),
    [purchaseOrders, shopifyOrders, returns],
  )

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // Load data in parallel but with priority - load most important data first
        const [inventoryData, ordersData] = await Promise.all([
          supabaseStore.getInventory(),
          supabaseStore.getShopifyOrders(),
        ])

        // Set the most important data first to show metrics quickly
        setInventory(inventoryData)
        setShopifyOrders(ordersData)

        // Load less critical data in background
        const [poData, returnsData] = await Promise.all([supabaseStore.getPurchaseOrders(), supabaseStore.getReturns()])

        setPurchaseOrders(poData)
        setReturns(returnsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Error: {error}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        {/* Main metrics - show skeleton while loading */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalInventoryValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">{inventory.length} unique SKUs</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">From {shopifyOrders.length} orders</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalProfit.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalRevenue > 0 ? ((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1) : 0}%
                    margin
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.lowStockItems}</div>
                  <p className="text-xs text-muted-foreground">Items with ≤5 units</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Secondary metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Purchase Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.pendingPOs}</div>
                  <p className="text-xs text-muted-foreground">Orders awaiting delivery</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
                  <RotateCcw className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.pendingReturns}</div>
                  <p className="text-xs text-muted-foreground">Returns awaiting processing</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalRefunds.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">From {returns.length} returns</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <ActivityCardSkeleton />
              <ActivityCardSkeleton />
              <ActivityCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Purchase Orders</CardTitle>
                  <CardDescription>Latest purchase orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.recentPOs.length > 0 ? (
                      recentActivity.recentPOs.map((po) => (
                        <div key={po.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{po.po_number}</p>
                            <p className="text-xs text-muted-foreground">{po.supplier_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{po.status}</p>
                            <p className="text-xs text-muted-foreground">
                              ${po.items.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No purchase orders yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest Shopify orders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.recentOrders.length > 0 ? (
                      recentActivity.recentOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{order.orderNumber || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{order.customerName || "N/A"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${(order.totalAmount || 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{order.status || "Unknown"}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No orders yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Returns</CardTitle>
                  <CardDescription>Latest return requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.recentReturns.length > 0 ? (
                      recentActivity.recentReturns.map((returnOrder) => (
                        <div key={returnOrder.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{returnOrder.return_number}</p>
                            <p className="text-xs text-muted-foreground">{returnOrder.customer_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${(returnOrder.total_refund || 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">{returnOrder.status}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No returns yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
