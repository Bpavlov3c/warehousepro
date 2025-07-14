"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Package, ShoppingCart, TrendingUp, AlertTriangle, DollarSign, Users, Calendar, BarChart3 } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"
import type { InventoryItem, PurchaseOrder, ShopifyOrder, Return } from "@/lib/supabase-store"

// Skeleton components for loading states
const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
    </CardContent>
  </Card>
)

const RecentActivitySkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
    </CardHeader>
    <CardContent className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          <div className="flex-1 space-y-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
      ))}
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

  // Load critical data first, then secondary data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Load critical data first (inventory and recent orders)
      const [inventoryData, ordersData] = await Promise.all([
        supabaseStore.getInventory(),
        supabaseStore.getShopifyOrders(),
      ])

      setInventory(inventoryData)
      setShopifyOrders(ordersData)

      // Load secondary data in background
      const [poData, returnsData] = await Promise.all([supabaseStore.getPurchaseOrders(), supabaseStore.getReturns()])

      setPurchaseOrders(poData)
      setReturns(returnsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Memoized calculations for better performance
  const inventoryMetrics = useMemo(() => {
    const totalItems = inventory.length
    const totalStock = inventory.reduce((sum, item) => sum + item.inStock, 0)
    const lowStockItems = inventory.filter((item) => item.inStock <= 10).length
    const totalValue = inventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0)

    return {
      totalItems,
      totalStock,
      lowStockItems,
      totalValue,
    }
  }, [inventory])

  const orderMetrics = useMemo(() => {
    const totalOrders = shopifyOrders.length
    const totalRevenue = shopifyOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const totalProfit = shopifyOrders.reduce((sum, order) => sum + order.profit, 0)
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    return {
      totalOrders,
      totalRevenue,
      totalProfit,
      avgOrderValue,
    }
  }, [shopifyOrders])

  const poMetrics = useMemo(() => {
    const pendingPOs = purchaseOrders.filter((po) => po.status === "Pending").length
    const inTransitPOs = purchaseOrders.filter((po) => po.status === "In Transit").length
    const totalPOValue = purchaseOrders.reduce((sum, po) => {
      const poTotal = po.items.reduce((itemSum, item) => itemSum + item.total_cost, 0)
      return sum + poTotal + po.delivery_cost
    }, 0)

    return {
      pendingPOs,
      inTransitPOs,
      totalPOValue,
    }
  }, [purchaseOrders])

  const returnMetrics = useMemo(() => {
    const pendingReturns = returns.filter((ret) => ret.status === "Pending").length
    const totalRefunds = returns.reduce((sum, ret) => sum + (ret.total_refund || 0), 0)

    return {
      pendingReturns,
      totalRefunds,
    }
  }, [returns])

  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string
      type: "order" | "po" | "return"
      title: string
      subtitle: string
      status: string
      date: string
    }> = []

    // Recent orders
    shopifyOrders.slice(0, 3).forEach((order) => {
      activities.push({
        id: `order-${order.id}`,
        type: "order",
        title: `Order ${order.orderNumber}`,
        subtitle: `${order.customerName} - $${order.totalAmount.toFixed(2)}`,
        status: order.status,
        date: order.orderDate,
      })
    })

    // Recent POs
    purchaseOrders.slice(0, 2).forEach((po) => {
      activities.push({
        id: `po-${po.id}`,
        type: "po",
        title: `PO ${po.po_number}`,
        subtitle: `${po.supplier_name}`,
        status: po.status,
        date: po.created_at,
      })
    })

    // Recent returns
    returns.slice(0, 2).forEach((ret) => {
      activities.push({
        id: `return-${ret.id}`,
        type: "return",
        title: `Return ${ret.return_number}`,
        subtitle: `${ret.customer_name}`,
        status: ret.status,
        date: ret.created_at,
      })
    })

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)
  }, [shopifyOrders, purchaseOrders, returns])

  const getStatusColor = useCallback((status: string, type: string) => {
    if (type === "order") {
      switch (status.toLowerCase()) {
        case "fulfilled":
        case "shipped":
        case "delivered":
          return "bg-green-100 text-green-800"
        case "processing":
        case "pending":
          return "bg-yellow-100 text-yellow-800"
        case "cancelled":
          return "bg-red-100 text-red-800"
        default:
          return "bg-gray-100 text-gray-800"
      }
    } else if (type === "po") {
      switch (status) {
        case "Delivered":
          return "bg-green-100 text-green-800"
        case "In Transit":
          return "bg-blue-100 text-blue-800"
        case "Pending":
          return "bg-yellow-100 text-yellow-800"
        case "Draft":
          return "bg-gray-100 text-gray-800"
        default:
          return "bg-gray-100 text-gray-800"
      }
    } else if (type === "return") {
      switch (status) {
        case "Accepted":
          return "bg-green-100 text-green-800"
        case "Processing":
          return "bg-blue-100 text-blue-800"
        case "Pending":
          return "bg-yellow-100 text-yellow-800"
        case "Rejected":
          return "bg-red-100 text-red-800"
        default:
          return "bg-gray-100 text-gray-800"
      }
    }
    return "bg-gray-100 text-gray-800"
  }, [])

  const getActivityIcon = useCallback((type: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="w-4 h-4" />
      case "po":
        return <Package className="w-4 h-4" />
      case "return":
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Calendar className="w-4 h-4" />
    }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
            <p className="text-red-600 mt-1">{error}</p>
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold hidden lg:block">Dashboard</h1>
          <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${orderMetrics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{orderMetrics.totalOrders} orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${orderMetrics.totalProfit.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: ${orderMetrics.avgOrderValue.toFixed(2)} per order
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${inventoryMetrics.totalValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{inventoryMetrics.totalStock} units in stock</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{inventoryMetrics.lowStockItems}</div>
                  <p className="text-xs text-muted-foreground">Items with ≤10 units</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending POs</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{poMetrics.pendingPOs}</div>
                  <p className="text-xs text-muted-foreground">{poMetrics.inTransitPOs} in transit</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">PO Value</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${poMetrics.totalPOValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total purchase orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{returnMetrics.pendingReturns}</div>
                  <p className="text-xs text-muted-foreground">Awaiting processing</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${returnMetrics.totalRefunds.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All returns</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            {loading ? (
              <RecentActivitySkeleton />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No recent activity</p>
                    ) : (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-4">
                          <div className="flex-shrink-0">{getActivityIcon(activity.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                            <p className="text-sm text-gray-500 truncate">{activity.subtitle}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <Badge className={`${getStatusColor(activity.status, activity.type)} text-xs`}>
                              {activity.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="col-span-3">
            {loading ? (
              <Card>
                <CardHeader>
                  <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventory
                      .filter((item) => item.inStock <= 10)
                      .slice(0, 6)
                      .map((item) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                          </div>
                          <div className="flex-shrink-0">
                            <Badge variant={item.inStock === 0 ? "destructive" : "secondary"}>
                              {item.inStock} left
                            </Badge>
                          </div>
                        </div>
                      ))}
                    {inventory.filter((item) => item.inStock <= 10).length === 0 && (
                      <p className="text-gray-500 text-center py-4">All items well stocked</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
