"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, TrendingUp, AlertTriangle, FileText, Store, ArrowRight } from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"
import Link from "next/link"

export default function Dashboard() {
  const [stats, setStats] = useState({
    inventory: {
      totalItems: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
    },
    orders: {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      recentOrders: [],
    },
    purchaseOrders: {
      totalPOs: 0,
      pendingPOs: 0,
      totalValue: 0,
      recentPOs: [],
    },
    stores: {
      connectedStores: 0,
      totalStores: 0,
    },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Load inventory data
      const inventory = await supabaseStore.getInventory()
      const inventoryStats = {
        totalItems: inventory.length,
        totalValue: inventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0),
        lowStockItems: inventory.filter((item) => item.inStock - item.reserved <= 10 && item.inStock > 0).length,
        outOfStockItems: inventory.filter((item) => item.inStock === 0).length,
      }

      // Load orders data
      const orders = await supabaseStore.getShopifyOrders()
      const ordersStats = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
        pendingOrders: orders.filter((order) => order.status.toLowerCase() !== "fulfilled").length,
        recentOrders: orders.slice(0, 5),
      }

      // Load purchase orders data
      const purchaseOrders = await supabaseStore.getPurchaseOrders()
      const poStats = {
        totalPOs: purchaseOrders.length,
        pendingPOs: purchaseOrders.filter((po) => po.status === "Pending" || po.status === "In Transit").length,
        totalValue: purchaseOrders.reduce((sum, po) => {
          const itemsTotal = po.items.reduce((itemSum, item) => itemSum + item.total_cost, 0)
          return sum + itemsTotal + po.delivery_cost
        }, 0),
        recentPOs: purchaseOrders.slice(0, 5),
      }

      // Load stores data
      const stores = await supabaseStore.getShopifyStores()
      const storesStats = {
        connectedStores: stores.filter((store) => store.status === "Connected").length,
        totalStores: stores.length,
      }

      setStats({
        inventory: inventoryStats,
        orders: ordersStats,
        purchaseOrders: poStats,
        stores: storesStats,
      })
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const currency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5" />
          <span className="hidden sm:inline">Warehouse Management System</span>
          <span className="sm:hidden">WMS Dashboard</span>
        </h1>
      </header>

      <div className="flex-1 space-y-6 p-4 pt-6">
        {/* Overview Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Inventory Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{stats.inventory.totalItems}</div>
              <p className="text-xs text-muted-foreground">{currency(stats.inventory.totalValue)} total value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{stats.orders.totalOrders}</div>
              <p className="text-xs text-muted-foreground">{currency(stats.orders.totalRevenue)} revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Purchase Orders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{stats.purchaseOrders.totalPOs}</div>
              <p className="text-xs text-muted-foreground">{stats.purchaseOrders.pendingPOs} pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Connected Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold">{stats.stores.connectedStores}</div>
              <p className="text-xs text-muted-foreground">of {stats.stores.totalStores} total stores</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts and Status */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Inventory Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Low Stock Items</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.inventory.lowStockItems}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Out of Stock</span>
                <Badge variant="destructive" className="text-xs">
                  {stats.inventory.outOfStockItems}
                </Badge>
              </div>
              <Link href="/inventory">
                <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                  View Inventory
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending Orders</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.orders.pendingOrders}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Revenue</span>
                <span className="text-sm font-medium text-green-600">{currency(stats.orders.totalRevenue)}</span>
              </div>
              <Link href="/shopify-orders">
                <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                  View Orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Purchase Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pending POs</span>
                <Badge variant="secondary" className="text-xs">
                  {stats.purchaseOrders.pendingPOs}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Total Value</span>
                <span className="text-sm font-medium">{currency(stats.purchaseOrders.totalValue)}</span>
              </div>
              <Link href="/purchase-orders">
                <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent">
                  View Purchase Orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Recent Orders</CardTitle>
              <CardDescription>Latest customer orders from Shopify</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.orders.recentOrders.length > 0 ? (
                  stats.orders.recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{currency(order.total_amount || 0)}</p>
                        <Badge variant="secondary" className="text-xs">
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent orders found</p>
                )}
              </div>
              <Link href="/shopify-orders">
                <Button variant="ghost" size="sm" className="w-full mt-4">
                  View All Orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Recent Purchase Orders</CardTitle>
              <CardDescription>Latest purchase orders and deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.purchaseOrders.recentPOs.length > 0 ? (
                  stats.purchaseOrders.recentPOs.map((po: any) => (
                    <div key={po.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{po.po_number}</p>
                        <p className="text-xs text-muted-foreground">{po.supplier_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {currency(
                            po.items.reduce((sum: number, item: any) => sum + item.total_cost, 0) + po.delivery_cost,
                          )}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {po.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent purchase orders found</p>
                )}
              </div>
              <Link href="/purchase-orders">
                <Button variant="ghost" size="sm" className="w-full mt-4">
                  View All Purchase Orders
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <Link href="/inventory">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <Package className="h-6 w-6" />
                  <span className="text-xs sm:text-sm">Add Inventory</span>
                </Button>
              </Link>
              <Link href="/purchase-orders">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <FileText className="h-6 w-6" />
                  <span className="text-xs sm:text-sm">New PO</span>
                </Button>
              </Link>
              <Link href="/stores">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <Store className="h-6 w-6" />
                  <span className="text-xs sm:text-sm">Connect Store</span>
                </Button>
              </Link>
              <Link href="/reports">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                  <TrendingUp className="h-6 w-6" />
                  <span className="text-xs sm:text-sm">View Reports</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
