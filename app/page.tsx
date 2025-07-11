"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Store,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  supabaseStore,
  type ShopifyOrder,
  type ShopifyStore,
  type PurchaseOrder,
  type InventoryItem,
} from "@/lib/supabase-store"
import Link from "next/link"

interface DashboardMetrics {
  totalRevenue: number
  totalProfit: number
  totalOrders: number
  connectedStores: number
  lowStockItems: number
  pendingPOs: number
  revenueChange: number
  profitChange: number
  ordersChange: number
}

interface RecentActivity {
  id: string
  type: "order" | "purchase" | "inventory"
  title: string
  description: string
  amount?: number
  timestamp: string
  status: "success" | "warning" | "error" | "info"
}

interface TopProduct {
  sku: string
  name: string
  revenue: number
  profit: number
  quantity: number
  margin: number
}

interface MonthlyTrend {
  month: string
  revenue: number
  profit: number
  orders: number
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    connectedStores: 0,
    lowStockItems: 0,
    pendingPOs: 0,
    revenueChange: 0,
    profitChange: 0,
    ordersChange: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const [orders, stores, purchaseOrders, inventory] = await Promise.all([
        supabaseStore.getShopifyOrders(),
        supabaseStore.getShopifyStores(),
        supabaseStore.getPurchaseOrders(),
        supabaseStore.getInventory(),
      ])

      console.log("Dashboard data loaded:", {
        orders: orders.length,
        stores: stores.length,
        purchaseOrders: purchaseOrders.length,
        inventory: inventory.length,
      })

      // Build cost map from delivered purchase orders
      const costMap = buildCostMap(purchaseOrders)

      // Calculate metrics
      const currentMetrics = calculateMetrics(orders, stores, purchaseOrders, inventory, costMap)
      setMetrics(currentMetrics)

      // Generate recent activity
      const activity = generateRecentActivity(orders, purchaseOrders, inventory)
      setRecentActivity(activity)

      // Calculate top products
      const products = calculateTopProducts(orders, costMap)
      setTopProducts(products)

      // Calculate monthly trends
      const trends = calculateMonthlyTrends(orders, costMap)
      setMonthlyTrends(trends)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const buildCostMap = (purchaseOrders: PurchaseOrder[]): Map<string, number> => {
    const costMap = new Map<string, number>()

    const deliveredPOs = purchaseOrders.filter((po) => po.status === "Delivered")

    deliveredPOs.forEach((po) => {
      const totalItems = po.items.reduce((sum, item) => sum + item.quantity, 0)
      const deliveryCostPerUnit = totalItems > 0 ? po.delivery_cost / totalItems : 0

      po.items.forEach((item) => {
        const totalUnitCost = item.unit_cost + deliveryCostPerUnit
        costMap.set(item.sku, totalUnitCost)
      })
    })

    console.log("Cost map built:", Array.from(costMap.entries()).slice(0, 5))
    return costMap
  }

  const calculateMetrics = (
    orders: ShopifyOrder[],
    stores: ShopifyStore[],
    purchaseOrders: PurchaseOrder[],
    inventory: InventoryItem[],
    costMap: Map<string, number>,
  ): DashboardMetrics => {
    // Current period (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sixtyDaysAgo = new Date()
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

    const currentOrders = orders.filter((order) => new Date(order.orderDate) >= thirtyDaysAgo)
    const previousOrders = orders.filter((order) => {
      const orderDate = new Date(order.orderDate)
      return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo
    })

    console.log("Order filtering:", {
      totalOrders: orders.length,
      currentOrders: currentOrders.length,
      previousOrders: previousOrders.length,
    })

    // Calculate current metrics
    const totalRevenue = currentOrders.reduce((sum, order) => {
      const revenue = (order.total_amount || 0) - (order.tax_amount || 0)
      return sum + revenue
    }, 0)

    const totalProfit = currentOrders.reduce((sum, order) => {
      const orderRevenue = (order.total_amount || 0) - (order.tax_amount || 0)
      const orderCost = order.items.reduce((itemSum, item) => {
        const costPrice = costMap.get(item.sku) || 0
        return itemSum + costPrice * item.quantity
      }, 0)
      return sum + (orderRevenue - orderCost)
    }, 0)

    // Calculate previous metrics for comparison
    const previousRevenue = previousOrders.reduce((sum, order) => {
      const revenue = (order.total_amount || 0) - (order.tax_amount || 0)
      return sum + revenue
    }, 0)

    const previousProfit = previousOrders.reduce((sum, order) => {
      const orderRevenue = (order.total_amount || 0) - (order.tax_amount || 0)
      const orderCost = order.items.reduce((itemSum, item) => {
        const costPrice = costMap.get(item.sku) || 0
        return itemSum + costPrice * item.quantity
      }, 0)
      return sum + (orderRevenue - orderCost)
    }, 0)

    // Calculate percentage changes (avoid division by zero)
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const profitChange = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0
    const ordersChange =
      previousOrders.length > 0 ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100 : 0

    const calculatedMetrics = {
      totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue,
      totalProfit: isNaN(totalProfit) ? 0 : totalProfit,
      totalOrders: currentOrders.length,
      connectedStores: stores.filter((s) => s.status === "Connected").length,
      lowStockItems: inventory.filter((item) => item.inStock < 10).length,
      pendingPOs: purchaseOrders.filter((po) => po.status === "Pending" || po.status === "In Transit").length,
      revenueChange: isNaN(revenueChange) ? 0 : revenueChange,
      profitChange: isNaN(profitChange) ? 0 : profitChange,
      ordersChange: isNaN(ordersChange) ? 0 : ordersChange,
    }

    console.log("Calculated metrics:", calculatedMetrics)
    return calculatedMetrics
  }

  const generateRecentActivity = (
    orders: ShopifyOrder[],
    purchaseOrders: PurchaseOrder[],
    inventory: InventoryItem[],
  ): RecentActivity[] => {
    const activities: RecentActivity[] = []

    // Recent orders (last 5)
    const recentOrders = orders
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5)

    recentOrders.forEach((order) => {
      activities.push({
        id: `order-${order.id}`,
        type: "order",
        title: `Order ${order.orderNumber}`,
        description: `${order.customerName} - ${order.items.length} items`,
        amount: order.total_amount || 0,
        timestamp: order.orderDate,
        status: order.status === "fulfilled" ? "success" : "info",
      })
    })

    // Recent purchase orders (last 3)
    const recentPOs = purchaseOrders
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)

    recentPOs.forEach((po) => {
      const totalAmount = po.items.reduce((sum, item) => sum + item.total_cost, 0) + po.delivery_cost
      activities.push({
        id: `po-${po.id}`,
        type: "purchase",
        title: `PO ${po.po_number}`,
        description: `${po.supplier_name} - ${po.items.length} items`,
        amount: totalAmount,
        timestamp: po.created_at,
        status: po.status === "Delivered" ? "success" : po.status === "In Transit" ? "info" : "warning",
      })
    })

    // Low stock alerts (last 2)
    const lowStockItems = inventory.filter((item) => item.inStock < 10).slice(0, 2)

    lowStockItems.forEach((item) => {
      activities.push({
        id: `stock-${item.id}`,
        type: "inventory",
        title: "Low Stock Alert",
        description: `${item.name} (${item.sku}) - ${item.inStock} remaining`,
        timestamp: new Date().toISOString(),
        status: "warning",
      })
    })

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const calculateTopProducts = (orders: ShopifyOrder[], costMap: Map<string, number>): TopProduct[] => {
    const productMap = new Map<string, TopProduct>()

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const costPrice = costMap.get(item.sku) || 0
        const revenue = item.total_price || 0
        const cost = costPrice * item.quantity
        const profit = revenue - cost

        if (productMap.has(item.sku)) {
          const existing = productMap.get(item.sku)!
          existing.revenue += revenue
          existing.profit += profit
          existing.quantity += item.quantity
          existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0
        } else {
          productMap.set(item.sku, {
            sku: item.sku,
            name: item.product_name,
            revenue,
            profit,
            quantity: item.quantity,
            margin: revenue > 0 ? (profit / revenue) * 100 : 0,
          })
        }
      })
    })

    return Array.from(productMap.values())
      .filter((product) => !isNaN(product.profit) && !isNaN(product.revenue))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
  }

  const calculateMonthlyTrends = (orders: ShopifyOrder[], costMap: Map<string, number>): MonthlyTrend[] => {
    const monthlyMap = new Map<string, MonthlyTrend>()

    // Get last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentOrders = orders.filter((order) => new Date(order.orderDate) >= sixMonthsAgo)

    recentOrders.forEach((order) => {
      const orderDate = new Date(order.orderDate)
      const month = orderDate.toISOString().slice(0, 7)
      const monthName = orderDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })

      const orderRevenue = (order.total_amount || 0) - (order.tax_amount || 0)
      const orderCost = order.items.reduce((sum, item) => {
        const costPrice = costMap.get(item.sku) || 0
        return sum + costPrice * item.quantity
      }, 0)
      const orderProfit = orderRevenue - orderCost

      if (monthlyMap.has(month)) {
        const existing = monthlyMap.get(month)!
        existing.revenue += orderRevenue
        existing.profit += orderProfit
        existing.orders += 1
      } else {
        monthlyMap.set(month, {
          month: monthName,
          revenue: orderRevenue,
          profit: orderProfit,
          orders: 1,
        })
      }
    })

    return Array.from(monthlyMap.values())
      .filter((trend) => !isNaN(trend.revenue) && !isNaN(trend.profit))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  const getActivityIcon = (type: string, status: string) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="h-4 w-4" />
      case "purchase":
        return <Package className="h-4 w-4" />
      case "inventory":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "error":
        return "text-red-600"
      default:
        return "text-blue-600"
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
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
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (30d)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalRevenue.toLocaleString()} лв</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metrics.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={metrics.revenueChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(metrics.revenueChange).toFixed(1)}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit (30d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.totalProfit.toLocaleString()} лв</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metrics.profitChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={metrics.profitChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(metrics.profitChange).toFixed(1)}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders (30d)</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOrders}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metrics.ordersChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={metrics.ordersChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(metrics.ordersChange).toFixed(1)}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.connectedStores}</div>
              <p className="text-xs text-muted-foreground">Active Shopify connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(metrics.lowStockItems > 0 || metrics.pendingPOs > 0) && (
          <div className="grid gap-4 md:grid-cols-2">
            {metrics.lowStockItems > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-800">Low Stock Alert</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-800">{metrics.lowStockItems}</div>
                  <p className="text-xs text-yellow-700">Items need restocking</p>
                  <Button asChild size="sm" className="mt-2 bg-transparent" variant="outline">
                    <Link href="/inventory">View Inventory</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {metrics.pendingPOs > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-800">Pending Orders</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">{metrics.pendingPOs}</div>
                  <p className="text-xs text-blue-700">Purchase orders awaiting delivery</p>
                  <Button asChild size="sm" className="mt-2 bg-transparent" variant="outline">
                    <Link href="/purchase-orders">View Orders</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>Revenue and profit over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                  <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Profit</CardTitle>
              <CardDescription>Best performing products this period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sku" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                  <Bar dataKey="profit" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Top Products */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest orders, purchases, and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center space-x-4">
                      <div className={`p-2 rounded-full ${getStatusColor(activity.status)} bg-opacity-10`}>
                        {getActivityIcon(activity.type, activity.status)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                      {activity.amount && <div className="text-sm font-medium">{activity.amount.toFixed(2)} лв</div>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Highest profit products</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product) => (
                      <TableRow key={product.sku}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">{product.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>{product.revenue.toFixed(2)} лв</TableCell>
                        <TableCell className="text-green-600">{product.profit.toFixed(2)} лв</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.margin >= 20 ? "default" : product.margin >= 10 ? "secondary" : "destructive"
                            }
                          >
                            {product.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No product data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <Button asChild className="h-20 flex-col">
                <Link href="/shopify-orders">
                  <ShoppingCart className="h-6 w-6 mb-2" />
                  Sync Orders
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
                <Link href="/purchase-orders">
                  <Package className="h-6 w-6 mb-2" />
                  New PO
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
                <Link href="/inventory">
                  <Package className="h-6 w-6 mb-2" />
                  Check Stock
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col bg-transparent">
                <Link href="/reports">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  View Reports
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
