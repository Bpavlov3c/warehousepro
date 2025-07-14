"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DateRangePicker } from "@/components/date-range-picker"
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  Download,
  Calendar,
} from "lucide-react"
import {
  supabaseStore,
  type InventoryItem,
  type PurchaseOrder,
  type ShopifyOrder,
  type Return,
} from "@/lib/supabase-store"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Skeleton components
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

const ChartSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
    </CardContent>
  </Card>
)

export default function Reports() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [shopifyOrders, setShopifyOrders] = useState<ShopifyOrder[]>([])
  const [returns, setReturns] = useState<Return[]>([])
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date(), // Today
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Load critical data first
      const [inventoryData, ordersData] = await Promise.all([
        supabaseStore.getInventory(),
        supabaseStore.getShopifyOrders(),
      ])

      setInventory(inventoryData)
      setShopifyOrders(ordersData)

      // Load secondary data
      const [poData, returnsData] = await Promise.all([supabaseStore.getPurchaseOrders(), supabaseStore.getReturns()])

      setPurchaseOrders(poData)
      setReturns(returnsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter data by date range
  const filteredData = useMemo(() => {
    const fromTime = dateRange.from.getTime()
    const toTime = dateRange.to.getTime()

    const filteredOrders = shopifyOrders.filter((order) => {
      const orderTime = new Date(order.orderDate).getTime()
      return orderTime >= fromTime && orderTime <= toTime
    })

    const filteredPOs = purchaseOrders.filter((po) => {
      const poTime = new Date(po.created_at).getTime()
      return poTime >= fromTime && poTime <= toTime
    })

    const filteredReturns = returns.filter((ret) => {
      const returnTime = new Date(ret.created_at).getTime()
      return returnTime >= fromTime && returnTime <= toTime
    })

    return {
      orders: filteredOrders,
      purchaseOrders: filteredPOs,
      returns: filteredReturns,
    }
  }, [shopifyOrders, purchaseOrders, returns, dateRange])

  // Calculate metrics
  const metrics = useMemo(() => {
    const { orders, purchaseOrders: filteredPOs, returns: filteredReturns } = filteredData

    // Revenue and profit metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    const totalProfit = orders.reduce((sum, order) => sum + order.profit, 0)
    const totalOrders = orders.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Purchase order metrics
    const totalPOValue = filteredPOs.reduce((sum, po) => {
      const poTotal = po.items.reduce((itemSum, item) => itemSum + item.total_cost, 0)
      return sum + poTotal + po.delivery_cost
    }, 0)

    // Return metrics
    const totalRefunds = filteredReturns.reduce((sum, ret) => sum + (ret.total_refund || 0), 0)
    const returnRate = totalOrders > 0 ? (filteredReturns.length / totalOrders) * 100 : 0

    // Inventory metrics
    const totalInventoryValue = inventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0)
    const lowStockItems = inventory.filter((item) => item.inStock <= 10).length

    // Top products by revenue
    const productRevenue = new Map<string, { name: string; revenue: number; quantity: number }>()
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const existing = productRevenue.get(item.sku) || { name: item.product_name, revenue: 0, quantity: 0 }
        existing.revenue += item.total_price
        existing.quantity += item.quantity
        productRevenue.set(item.sku, existing)
      })
    })

    const topProducts = Array.from(productRevenue.entries())
      .map(([sku, data]) => ({ sku, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    return {
      totalRevenue,
      totalProfit,
      totalOrders,
      avgOrderValue,
      totalPOValue,
      totalRefunds,
      returnRate,
      totalInventoryValue,
      lowStockItems,
      topProducts,
    }
  }, [filteredData, inventory])

  // Export functions
  const exportSalesReport = useCallback(() => {
    const headers = ["Date", "Order Number", "Customer", "Store", "Revenue", "Profit", "Items", "Status"]

    const csvData = filteredData.orders.map((order) => [
      new Date(order.orderDate).toLocaleDateString(),
      order.orderNumber,
      order.customerName,
      order.storeName,
      order.totalAmount.toFixed(2),
      order.profit.toFixed(2),
      order.items.length,
      order.status,
    ])

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `sales-report-${dateRange.from.toISOString().split("T")[0]}-to-${dateRange.to.toISOString().split("T")[0]}.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredData.orders, dateRange])

  const exportInventoryReport = useCallback(() => {
    const headers = ["SKU", "Product Name", "In Stock", "Incoming", "Reserved", "Unit Cost", "Total Value", "Status"]

    const csvData = inventory.map((item) => [
      item.sku,
      item.name,
      item.inStock,
      item.incoming,
      item.reserved,
      item.unitCost.toFixed(2),
      (item.inStock * item.unitCost).toFixed(2),
      item.inStock === 0 ? "Out of Stock" : item.inStock <= 10 ? "Low Stock" : "In Stock",
    ])

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory-report-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [inventory])

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Reports</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading reports</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <Button onClick={loadData} className="mt-3 bg-transparent" variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-semibold">Reports</h1>
          <div className="flex gap-2">
            <Button onClick={exportSalesReport} size="sm" variant="outline" disabled={loading}>
              <Download className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Sales</span>
            </Button>
            <Button onClick={exportInventoryReport} size="sm" variant="outline" disabled={loading}>
              <Download className="w-4 h-4 lg:mr-2" />
              <span className="hidden lg:inline">Inventory</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <DateRangePicker date={dateRange} onDateChange={(range) => range && setDateRange(range)} />
          </div>
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
                  <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{metrics.totalOrders} orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalProfit.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Avg: ${metrics.avgOrderValue.toFixed(2)} per order</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalInventoryValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{metrics.lowStockItems} low stock items</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.returnRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">${metrics.totalRefunds.toLocaleString()} refunded</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Secondary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.totalPOValue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{filteredData.purchaseOrders.length} orders in period</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Returns</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{filteredData.returns.length}</div>
                  <p className="text-xs text-muted-foreground">${metrics.totalRefunds.toFixed(2)} total refunds</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${metrics.avgOrderValue.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Per order average</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.topProducts.slice(0, 8).map((product, index) => (
                    <div key={product.sku} className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${product.revenue.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{product.quantity} sold</p>
                      </div>
                    </div>
                  ))}
                  {metrics.topProducts.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No sales data available</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Period Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Orders Processed</span>
                    <span className="font-medium">{metrics.totalOrders}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Items Sold</span>
                    <span className="font-medium">
                      {filteredData.orders.reduce((sum, order) => sum + order.items.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Purchase Orders</span>
                    <span className="font-medium">{filteredData.purchaseOrders.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Returns Processed</span>
                    <span className="font-medium">{filteredData.returns.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Profit Margin</span>
                    <span className="font-medium">
                      {metrics.totalRevenue > 0 ? ((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Low Stock Items</span>
                    <Badge variant={metrics.lowStockItems > 0 ? "destructive" : "secondary"}>
                      {metrics.lowStockItems}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders in Period</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.orders.slice(0, 10).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={order.profit >= 0 ? "text-green-600" : "text-red-600"}>
                          ${order.profit.toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredData.orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No orders in selected period</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
