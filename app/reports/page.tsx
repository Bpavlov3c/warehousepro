"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
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
import { Download, TrendingUp, DollarSign, Package, ShoppingCart, Calendar } from "lucide-react"
import { supabaseStore, type ShopifyOrder, type ShopifyStore, type PurchaseOrder } from "@/lib/supabase-store"

interface ProfitReport {
  period: string
  revenue: number
  cost: number
  profit: number
  margin: number
  orders: number
}

interface ProductReport {
  sku: string
  name: string
  revenue: number
  cost: number
  profit: number
  margin: number
  quantity: number
  orders: number
}

interface StoreReport {
  storeId: string
  storeName: string
  revenue: number
  cost: number
  profit: number
  margin: number
  orders: number
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState("30")
  const [profitReports, setProfitReports] = useState<ProfitReport[]>([])
  const [productReports, setProductReports] = useState<ProductReport[]>([])
  const [storeReports, setStoreReports] = useState<StoreReport[]>([])
  const [totalMetrics, setTotalMetrics] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    totalMargin: 0,
    totalOrders: 0,
  })

  useEffect(() => {
    loadReportData()
  }, [timeRange])

  const loadReportData = async () => {
    try {
      setLoading(true)
      console.log(`Loading report data for ${timeRange} days...`)

      const [orders, stores, purchaseOrders] = await Promise.all([
        supabaseStore.getShopifyOrders(),
        supabaseStore.getShopifyStores(),
        supabaseStore.getPurchaseOrders(),
      ])

      // Build cost map from delivered purchase orders
      const costMap = buildCostMap(purchaseOrders)

      // Filter orders by time range
      const daysAgo = new Date()
      daysAgo.setDate(daysAgo.getDate() - Number.parseInt(timeRange))
      const filteredOrders = orders.filter((order) => new Date(order.orderDate) >= daysAgo)

      console.log(`Filtered ${filteredOrders.length} orders from last ${timeRange} days`)

      // Generate reports
      const profitData = generateProfitReports(filteredOrders, costMap, Number.parseInt(timeRange))
      const productData = generateProductReports(filteredOrders, costMap)
      const storeData = generateStoreReports(filteredOrders, stores, costMap)
      const metrics = calculateTotalMetrics(filteredOrders, costMap)

      setProfitReports(profitData)
      setProductReports(productData)
      setStoreReports(storeData)
      setTotalMetrics(metrics)
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

  const generateProfitReports = (
    orders: ShopifyOrder[],
    costMap: Map<string, number>,
    days: number,
  ): ProfitReport[] => {
    const reports: ProfitReport[] = []
    const groupBy = days <= 30 ? "day" : days <= 90 ? "week" : "month"

    // Group orders by time period
    const groupedOrders = new Map<string, ShopifyOrder[]>()

    orders.forEach((order) => {
      const date = new Date(order.orderDate)
      let key: string

      if (groupBy === "day") {
        key = date.toISOString().split("T")[0]
      } else if (groupBy === "week") {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        key = weekStart.toISOString().split("T")[0]
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      if (!groupedOrders.has(key)) {
        groupedOrders.set(key, [])
      }
      groupedOrders.get(key)!.push(order)
    })

    // Calculate metrics for each period
    Array.from(groupedOrders.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([period, periodOrders]) => {
        const revenue = periodOrders.reduce(
          (sum, order) => sum + (order.total_amount || 0) - (order.tax_amount || 0),
          0,
        )
        const cost = periodOrders.reduce((sum, order) => {
          return (
            sum +
            order.items.reduce((itemSum, item) => {
              const costPrice = costMap.get(item.sku) || 0
              return itemSum + costPrice * item.quantity
            }, 0)
          )
        }, 0)
        const profit = revenue - cost
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0

        reports.push({
          period: formatPeriod(period, groupBy),
          revenue,
          cost,
          profit,
          margin,
          orders: periodOrders.length,
        })
      })

    return reports
  }

  const generateProductReports = (orders: ShopifyOrder[], costMap: Map<string, number>): ProductReport[] => {
    const productMap = new Map<string, ProductReport>()

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const costPrice = costMap.get(item.sku) || 0
        const revenue = item.total_price || 0
        const cost = costPrice * item.quantity
        const profit = revenue - cost

        if (productMap.has(item.sku)) {
          const existing = productMap.get(item.sku)!
          existing.revenue += revenue
          existing.cost += cost
          existing.profit += profit
          existing.quantity += item.quantity
          existing.orders += 1
          existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0
        } else {
          productMap.set(item.sku, {
            sku: item.sku,
            name: item.product_name,
            revenue,
            cost,
            profit,
            margin: revenue > 0 ? (profit / revenue) * 100 : 0,
            quantity: item.quantity,
            orders: 1,
          })
        }
      })
    })

    return Array.from(productMap.values())
      .filter((product) => !isNaN(product.profit) && !isNaN(product.revenue))
      .sort((a, b) => b.profit - a.profit)
  }

  const generateStoreReports = (
    orders: ShopifyOrder[],
    stores: ShopifyStore[],
    costMap: Map<string, number>,
  ): StoreReport[] => {
    const storeMap = new Map<string, StoreReport>()

    // Initialize store reports
    stores.forEach((store) => {
      storeMap.set(store.id, {
        storeId: store.id,
        storeName: store.name,
        revenue: 0,
        cost: 0,
        profit: 0,
        margin: 0,
        orders: 0,
      })
    })

    // Calculate metrics for each store
    orders.forEach((order) => {
      const storeReport = storeMap.get(order.storeId)
      if (!storeReport) return

      const revenue = (order.total_amount || 0) - (order.tax_amount || 0)
      const cost = order.items.reduce((sum, item) => {
        const costPrice = costMap.get(item.sku) || 0
        return sum + costPrice * item.quantity
      }, 0)
      const profit = revenue - cost

      storeReport.revenue += revenue
      storeReport.cost += cost
      storeReport.profit += profit
      storeReport.orders += 1
      storeReport.margin = storeReport.revenue > 0 ? (storeReport.profit / storeReport.revenue) * 100 : 0
    })

    return Array.from(storeMap.values())
      .filter((store) => store.orders > 0)
      .sort((a, b) => b.profit - a.profit)
  }

  const calculateTotalMetrics = (orders: ShopifyOrder[], costMap: Map<string, number>) => {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0) - (order.tax_amount || 0), 0)
    const totalCost = orders.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => {
          const costPrice = costMap.get(item.sku) || 0
          return itemSum + costPrice * item.quantity
        }, 0)
      )
    }, 0)
    const totalProfit = totalRevenue - totalCost
    const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue: isNaN(totalRevenue) ? 0 : totalRevenue,
      totalCost: isNaN(totalCost) ? 0 : totalCost,
      totalProfit: isNaN(totalProfit) ? 0 : totalProfit,
      totalMargin: isNaN(totalMargin) ? 0 : totalMargin,
      totalOrders: orders.length,
    }
  }

  const formatPeriod = (period: string, groupBy: string): string => {
    if (groupBy === "day") {
      return new Date(period).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } else if (groupBy === "week") {
      return `Week of ${new Date(period).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    } else {
      const [year, month] = period.split("-")
      return new Date(Number.parseInt(year), Number.parseInt(month) - 1).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return

    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            return typeof value === "string" ? `"${value}"` : value
          })
          .join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Profit Reports</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading reports...</p>
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
          <h1 className="text-lg font-semibold">Profit Reports</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(productReports, "product-profit-report")}>
              <Download className="h-4 w-4 mr-2" />
              Export Products
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(profitReports, "profit-trends-report")}>
              <Download className="h-4 w-4 mr-2" />
              Export Trends
            </Button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.totalRevenue.toLocaleString()} лв</div>
              <p className="text-xs text-muted-foreground">Excluding tax</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{totalMetrics.totalCost.toLocaleString()} лв</div>
              <p className="text-xs text-muted-foreground">Including delivery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{totalMetrics.totalProfit.toLocaleString()} лв</div>
              <p className="text-xs text-muted-foreground">Revenue - Cost</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge
                  variant={
                    totalMetrics.totalMargin >= 20
                      ? "default"
                      : totalMetrics.totalMargin >= 10
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {totalMetrics.totalMargin.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Profit / Revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMetrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                Avg:{" "}
                {totalMetrics.totalOrders > 0 ? (totalMetrics.totalRevenue / totalMetrics.totalOrders).toFixed(0) : 0}{" "}
                лв
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Profit Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Profit Trends</CardTitle>
              <CardDescription>Revenue, cost, and profit over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={profitReports}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" name="Revenue" />
                  <Line type="monotone" dataKey="cost" stroke="#ff7300" name="Cost" />
                  <Line type="monotone" dataKey="profit" stroke="#82ca9d" name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Store Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Store Performance</CardTitle>
              <CardDescription>Profit distribution by store</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={storeReports}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(0)} лв`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="profit"
                  >
                    {storeReports.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} лв`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Product Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Product Performance</CardTitle>
            <CardDescription>Detailed profit analysis by product</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Qty Sold</TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productReports.slice(0, 20).map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell>{product.revenue.toFixed(2)} лв</TableCell>
                    <TableCell className="text-red-600">{product.cost.toFixed(2)} лв</TableCell>
                    <TableCell className="text-green-600">{product.profit.toFixed(2)} лв</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.margin >= 20 ? "default" : product.margin >= 10 ? "secondary" : "destructive"}
                      >
                        {product.margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>{product.orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {productReports.length > 20 && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Showing top 20 products. Export for full data.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Store Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Store Performance</CardTitle>
            <CardDescription>Profit analysis by Shopify store</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storeReports.map((store) => (
                  <TableRow key={store.storeId}>
                    <TableCell className="font-medium">{store.storeName}</TableCell>
                    <TableCell>{store.revenue.toFixed(2)} лв</TableCell>
                    <TableCell className="text-red-600">{store.cost.toFixed(2)} лв</TableCell>
                    <TableCell className="text-green-600">{store.profit.toFixed(2)} лв</TableCell>
                    <TableCell>
                      <Badge
                        variant={store.margin >= 20 ? "default" : store.margin >= 10 ? "secondary" : "destructive"}
                      >
                        {store.margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell>{store.orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
