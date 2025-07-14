"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Package, DollarSign, TrendingUp, AlertTriangle, ShoppingCart, RotateCcw } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"
import type { InventoryItem, PurchaseOrder, ShopifyOrder, Return } from "@/lib/supabase-store"

export default function Dashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [inventoryData, poData, ordersData, returnsData] = await Promise.all([
          supabaseStore.getInventory(),
          supabaseStore.getPurchaseOrders(),
          supabaseStore.getShopifyOrders(),
          supabaseStore.getReturns(),
        ])

        setInventory(inventoryData)
        setPurchaseOrders(poData)
        setShopifyOrders(ordersData)
        setReturns(returnsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-2">
            <SidebarTrigger />
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-2">
            <SidebarTrigger />
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error: {error}</div>
        </div>
      </div>
    )
  }

  // Calculate metrics
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0)
  const lowStockItems = inventory.filter((item) => item.inStock <= 5).length
  const totalRevenue = shopifyOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
  const totalProfit = shopifyOrders.reduce((sum, order) => sum + (order.profit || 0), 0)
  const pendingPOs = purchaseOrders.filter((po) => po.status === "Pending" || po.status === "In Transit").length
  const pendingReturns = returns.filter((r) => r.status === "Pending").length
  const totalRefunds = returns.reduce((sum, r) => sum + (r.total_refund || 0), 0)

  // Recent activity
  const recentPOs = purchaseOrders.slice(0, 5)
  const recentOrders = shopifyOrders.slice(0, 5)
  const recentReturns = returns.slice(0, 5)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalInventoryValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{inventory.length} unique SKUs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {shopifyOrders.length} orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}% margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items with ≤5 units</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPOs}</div>
            <p className="text-xs text-muted-foreground">Orders awaiting delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReturns}</div>
            <p className="text-xs text-muted-foreground">Returns awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Refunds</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRefunds.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From {returns.length} returns</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
            <CardDescription>Latest purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPOs.length > 0 ? (
                recentPOs.map((po) => (
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
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
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
              {recentReturns.length > 0 ? (
                recentReturns.map((returnOrder) => (
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
      </div>
    </div>
  )
}
