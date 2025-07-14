"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, DollarSign, ShoppingCart, Package, Download, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { supabaseStore, type ShopifyOrder, type PurchaseOrder } from "@/lib/supabase-store"
import { DateRangePicker } from "@/components/date-range-picker"

interface ReportData {
  totalRevenue: number
  totalProfit: number
  totalOrders: number
  totalCost: number
  profitMargin: number
  revenueChange: number
  profitChange: number
  ordersChange: number
}

interface ProductPerformance {
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
  cost: number
}

interface StorePerformance {
  storeName: string
  revenue: number
  profit: number
  orders: number
  margin: number
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    totalRevenue: 0,
    totalProfit: 0,
    totalOrders: 0,
    totalCost: 0,
    profitMargin: 0,
    revenueChange: 0,
    profitChange: 0,
    ordersChange: 0,
  })
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([])
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([])
  const [storePerformance, setStorePerformance] = useState<StorePerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1), // Last 6 months
    to: new Date(),
  })
  const [reportType, setReportType] = useState<"overview" | "products" | "stores" | "trends">("overview")

  useEffect(() => {
    loadReportData()
  }, [dateRange])

  const loadReportData = async () => {
    try {
      setLoading(true)

      const [orders, purchaseOrders, inventory] = await Promise.all([
        supabaseStore.getShopifyOrders(),
        supabaseStore.getPurchaseOrders(),
        supabaseStore.getInventory(),
      ])

      // Filter orders by date range
      const filteredOrders = orders.filter((order) => {
        const orderDate = new Date(order.orderDate)
        return orderDate >= dateRange.from && orderDate <= dateRange.to
      })

      // Build cost map from delivered purchase orders
      const costMap = buildCostMap(purchaseOrders)

      // Calculate report data
      const data = calculateReportData(filteredOrders, orders, costMap)
      setReportData(data)

      // Calculate product performance
      const products = calculateProductPerformance(filteredOrders, costMap)
      setProductPerformance(products)

      // Calculate monthly trends
      const trends = calculateMonthlyTrends(filteredOrders, costMap)
      setMonthlyTrends(trends)

      // Calculate store performance
      const stores = calculateStorePerformance(filteredOrders, costMap)
      setStorePerformance(stores)
    } catch (error) {
      console.error("Error loading report data:", error)
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

    return costMap
  }

  const calculateReportData = (
    currentOrders: ShopifyOrder[],
    allOrders: ShopifyOrder[],
    costMap: Map<string, number>,
  ): ReportData => {
    // Calculate current period metrics
    const totalRevenue = currentOrders.reduce((sum, order) => sum + (order.totalAmount - order.taxAmount), 0)

    const totalCost = currentOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => {
          const costPrice = costMap.get(item.sku) || 0
          return itemSum + costPrice * item.quantity
        }, 0)
      )
    }, 0)

    const totalProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    // Calculate previous period for comparison
    const periodLength = dateRange.to.getTime() - dateRange.from.getTime()
    const previousFrom = new Date(dateRange.from.getTime() - periodLength)
    const previousTo = new Date(dateRange.to.getTime() - periodLength)

    const previousOrders = allOrders.filter((order) => {
      const orderDate = new Date(order.orderDate)
      return orderDate >= previousFrom && orderDate < previousTo
    })

    const previousRevenue = previousOrders.reduce((sum, order) => sum + (order.totalAmount - order.taxAmount), 0)
    const previousCost = previousOrders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => {
          const costPrice = costMap.get(item.sku) || 0
          return itemSum + costPrice * item.quantity
        }, 0)
      )
    }, 0)
    const previousProfit = previousRevenue - previousCost

    // Calculate percentage changes
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    const profitChange = previousProfit > 0 ? ((totalProfit - previousProfit) / previousProfit) * 100 : 0
    const ordersChange =
      previousOrders.length > 0 ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100 : 0

    return {
      totalRevenue,
      totalProfit,
      totalOrders: currentOrders.length,
      totalCost,
      profitMargin,
      revenueChange,
      profitChange,
      ordersChange,
    }
  }

  const calculateProductPerformance = (orders: ShopifyOrder[], costMap: Map<string, number>): ProductPerformance[] => {
    const productMap = new Map<string, ProductPerformance>()

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
      .slice(0, 10)
  }

  const calculateMonthlyTrends = (orders: ShopifyOrder[], costMap: Map<string, number>): MonthlyTrend[] => {
    const monthlyMap = new Map<string, MonthlyTrend>()

    orders.forEach((order) => {
      const orderDate = new Date(order.orderDate)
      const month = orderDate.toISOString().slice(0, 7)
      const monthName = orderDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })

      const orderRevenue = order.totalAmount - order.taxAmount
      const orderCost = order.items.reduce((sum, item) => {
        const costPrice = costMap.get(item.sku) || 0
        return sum + costPrice * item.quantity
      }, 0)
      const orderProfit = orderRevenue - orderCost

      if (monthlyMap.has(month)) {
        const existing = monthlyMap.get(month)!
        existing.revenue += orderRevenue
        existing.cost += orderCost
        existing.profit += orderProfit
        existing.orders += 1
      } else {
        monthlyMap.set(month, {
          month: monthName,
          revenue: orderRevenue,
          cost: orderCost,
          profit: orderProfit,
          orders: 1,
        })
      }
    })

    return Array.from(monthlyMap.values())
      .filter((trend) => !isNaN(trend.revenue) && !isNaN(trend.profit))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  const calculateStorePerformance = (orders: ShopifyOrder[], costMap: Map<string, number>): StorePerformance[] => {
    const storeMap = new Map<string, StorePerformance>()

    orders.forEach((order) => {
      const revenue = order.totalAmount - order.taxAmount
      const cost = order.items.reduce((sum, item) => {
        const costPrice = costMap.get(item.sku) || 0
        return sum + costPrice * item.quantity
      }, 0)
      const profit = revenue - cost

      if (storeMap.has(order.storeName)) {
        const existing = storeMap.get(order.storeName)!
        existing.revenue += revenue
        existing.profit += profit
        existing.orders += 1
        existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0
      } else {
        storeMap.set(order.storeName, {
          storeName: order.storeName,
          revenue,
          profit,
          orders: 1,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        })
      }
    })

    return Array.from(storeMap.values())
      .filter((store) => !isNaN(store.profit) && !isNaN(store.revenue))
      .sort((a, b) => b.profit - a.profit)
  }

  const handleExport = () => {
    let csvContent = ""
    let filename = ""

    switch (reportType) {
      case "overview":
        csvContent = [
          ["Metric", "Value", "Change %"],
          ["Total Revenue", `${reportData.totalRevenue.toFixed(2)} лв`, `${reportData.revenueChange.toFixed(1)}%`],
          ["Total Profit", `${reportData.totalProfit.toFixed(2)} лв`, `${reportData.profitChange.toFixed(1)}%`],
          ["Total Orders", reportData.totalOrders.toString(), `${reportData.ordersChange.toFixed(1)}%`],
          ["Total Cost", `${reportData.totalCost.toFixed(2)} лв`, ""],
          ["Profit Margin", `${reportData.profitMargin.toFixed(1)}%`, ""],
        ]
          .map((row) => row.map((field) => `"${field}"`).join(","))
          .join("\n")
        filename = "overview_report"
        break

      case "products":
        csvContent = [
          ["SKU", "Product Name", "Revenue", "Profit", "Quantity", "Margin %"],
          ...productPerformance.map((product) => [
            product.sku,
            product.name,
            product.revenue.toFixed(2),
            product.profit.toFixed(2),
            product.quantity.toString(),
            product.margin.toFixed(1),
          ]),
        ]
          .map((row) => row.map((field) => `"${field}"`).join(","))
          .join("\n")
        filename = "product_performance"
        break

      case "stores":
        csvContent = [
          ["Store Name", "Revenue", "Profit", "Orders", "Margin %"],
          ...storePerformance.map((store) => [
            store.storeName,
            store.revenue.toFixed(2),
            store.profit.toFixed(2),
            store.orders.toString(),
            store.margin.toFixed(1),
          ]),
        ]
          .map((row) => row.map((field) => `"${field}"`).join(","))
          .join("\n")
        filename = "store_performance"
        break

      case "trends":
        csvContent = [
          ["Month", "Revenue", "Profit", "Cost", "Orders"],
          ...monthlyTrends.map((trend) => [
            trend.month,
            trend.revenue.toFixed(2),
            trend.profit.toFixed(2),
            trend.cost.toFixed(2),
            trend.orders.toString(),
          ]),
        ]
          .map((row) => row.map((field) => `"${field}"`).join(","))
          .join("\n")
        filename = "monthly_trends"
        break
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Reports</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-64">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-64">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Reports</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-64">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <DateRangePicker from={dateRange.from} to={dateRange.to} onUpdate={(range) => setDateRange(range)} />
            <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select report type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="products">Product Performance</SelectItem>
                <SelectItem value="stores">Store Performance</SelectItem>
                <SelectItem value="trends">Monthly Trends</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (excl. tax)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalRevenue.toLocaleString()} лв</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {reportData.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={reportData.revenueChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(reportData.revenueChange).toFixed(1)}%
                </span>
                <span className="ml-1">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{reportData.totalProfit.toLocaleString()} лв</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {reportData.profitChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={reportData.profitChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(reportData.profitChange).toFixed(1)}%
                </span>
                <span className="ml-1">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalOrders}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {reportData.ordersChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={reportData.ordersChange >= 0 ? "text-green-600" : "text-red-600"}>
                  {Math.abs(reportData.ordersChange).toFixed(1)}%
                </span>
                <span className="ml-1">vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.profitMargin.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Gross profit margin</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Content */}
        {reportType === "overview" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Profit Trend</CardTitle>
                <CardDescription>Monthly comparison of revenue and profit</CardDescription>
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

            <Card>
              <CardHeader>
                <CardTitle>Store Performance</CardTitle>
                <CardDescription>Revenue distribution by store</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={storePerformance}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {storePerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {reportType === "products" && (
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Profit</CardTitle>
              <CardDescription>Best performing products in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productPerformance.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sku" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                    <Bar dataKey="profit" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productPerformance.map((product) => (
                      <TableRow key={product.sku}>
                        <TableCell className="font-mono">{product.sku}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell className="text-right">{product.revenue.toFixed(2)} лв</TableCell>
                        <TableCell className="text-right text-green-600">{product.profit.toFixed(2)} лв</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">
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
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === "stores" && (
          <Card>
            <CardHeader>
              <CardTitle>Store Performance Analysis</CardTitle>
              <CardDescription>Revenue and profit breakdown by store</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={storePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="storeName" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                    <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                  </BarChart>
                </ResponsiveContainer>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Avg Order Value</TableHead>
                      <TableHead className="text-right">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storePerformance.map((store) => (
                      <TableRow key={store.storeName}>
                        <TableCell className="font-medium">{store.storeName}</TableCell>
                        <TableCell className="text-right">{store.revenue.toFixed(2)} лв</TableCell>
                        <TableCell className="text-right text-green-600">{store.profit.toFixed(2)} лв</TableCell>
                        <TableCell className="text-right">{store.orders}</TableCell>
                        <TableCell className="text-right">
                          {store.orders > 0 ? (store.revenue / store.orders).toFixed(2) : "0.00"} лв
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={store.margin >= 20 ? "default" : store.margin >= 10 ? "secondary" : "destructive"}
                          >
                            {store.margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {reportType === "trends" && (
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Trends Analysis</CardTitle>
                <CardDescription>Detailed monthly performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" strokeWidth={2} />
                      <Line type="monotone" dataKey="cost" stroke="#ff7300" name="Cost" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Avg Order Value</TableHead>
                        <TableHead className="text-right">Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyTrends.map((trend) => {
                        const margin = trend.revenue > 0 ? (trend.profit / trend.revenue) * 100 : 0
                        const avgOrderValue = trend.orders > 0 ? trend.revenue / trend.orders : 0

                        return (
                          <TableRow key={trend.month}>
                            <TableCell className="font-medium">{trend.month}</TableCell>
                            <TableCell className="text-right">{trend.revenue.toFixed(2)} лв</TableCell>
                            <TableCell className="text-right">{trend.cost.toFixed(2)} лв</TableCell>
                            <TableCell className="text-right text-green-600">{trend.profit.toFixed(2)} лв</TableCell>
                            <TableCell className="text-right">{trend.orders}</TableCell>
                            <TableCell className="text-right">{avgOrderValue.toFixed(2)} лв</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={margin >= 20 ? "default" : margin >= 10 ? "secondary" : "destructive"}>
                                {margin.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
