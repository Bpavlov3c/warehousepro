"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { DatePickerWithRange } from "@/components/date-range-picker"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, LineChart, Line } from "recharts"
import { Download, TrendingUp, DollarSign, Package, Calendar, FileText, Loader2, Search, Filter, X } from "lucide-react"
import { supabaseStore, type ShopifyOrder, type PurchaseOrder } from "@/lib/supabase-store"

interface ProfitAnalysis {
  sku: string
  productName: string
  soldQty: number
  totalRevenue: number
  totalCost: number
  grossProfit: number
  margin: number
  avgSalePrice: number
  avgCostPrice: number
}

interface MonthlyData {
  month: string
  revenue: number
  cost: number
  profit: number
  orders: number
}

interface StorePerformance {
  storeId: string
  storeName: string
  revenue: number
  cost: number
  profit: number
  orders: number
  margin: number
}

interface ProductFilters {
  searchTerm: string
  minMargin: string
  maxMargin: string
  minProfit: string
  maxProfit: string
  sortBy: "profit" | "margin" | "revenue" | "soldQty" | "productName"
  sortOrder: "asc" | "desc"
}

export default function Reports() {
  const [reportType, setReportType] = useState("profit")
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [profitData, setProfitData] = useState<ProfitAnalysis[]>([])
  const [filteredProfitData, setFilteredProfitData] = useState<ProfitAnalysis[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [storeData, setStoreData] = useState<StorePerformance[]>([])
  const [costMap, setCostMap] = useState<Map<string, number>>(new Map())
  const [summaryMetrics, setSummaryMetrics] = useState({
    totalRevenue: 0,
    totalCost: 0,
    grossProfit: 0,
    avgMargin: 0,
    totalOrders: 0,
  })

  const [filters, setFilters] = useState<ProductFilters>({
    searchTerm: "",
    minMargin: "",
    maxMargin: "",
    minProfit: "",
    maxProfit: "",
    sortBy: "profit",
    sortOrder: "desc",
  })

  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [profitData, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log("Loading orders and purchase orders...")

      const [ordersData, poData] = await Promise.all([
        supabaseStore.getShopifyOrders(),
        supabaseStore.getPurchaseOrders(),
      ])

      console.log("Loaded orders:", ordersData.length)
      console.log("Loaded POs:", poData.length)

      // Build cost map from purchase orders
      const costMapping = buildCostMap(poData)
      setCostMap(costMapping)

      setOrders(ordersData)
      setPurchaseOrders(poData)

      // Calculate profit analysis with proper costs
      calculateProfitAnalysis(ordersData, costMapping)
      calculateMonthlyData(ordersData, costMapping)
      calculateStorePerformance(ordersData, costMapping)
      calculateSummaryMetrics(ordersData, costMapping)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const buildCostMap = (poData: PurchaseOrder[]): Map<string, number> => {
    const costMap = new Map<string, number>()

    // Process delivered POs to get the latest unit costs
    poData
      .filter((po) => po.status === "Delivered")
      .sort((a, b) => new Date(b.po_date).getTime() - new Date(a.po_date).getTime()) // Most recent first
      .forEach((po) => {
        po.items.forEach((item) => {
          if (!costMap.has(item.sku)) {
            // Calculate unit cost including delivery
            const totalQuantity = po.items.reduce((sum, i) => sum + i.quantity, 0)
            const deliveryCostPerUnit = totalQuantity > 0 ? po.delivery_cost / totalQuantity : 0
            const unitCostWithDelivery = item.unit_cost + deliveryCostPerUnit

            costMap.set(item.sku, unitCostWithDelivery)
            console.log(
              `Cost mapping: ${item.sku} -> $${unitCostWithDelivery.toFixed(2)} (base: $${item.unit_cost}, delivery: $${deliveryCostPerUnit.toFixed(2)})`,
            )
          }
        })
      })

    console.log("Built cost map with", costMap.size, "SKUs")
    return costMap
  }

  const calculateProfitAnalysis = (ordersData: ShopifyOrder[], costMapping: Map<string, number>) => {
    const productMap = new Map<string, ProfitAnalysis>()

    ordersData.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.sku
        const existing = productMap.get(key)

        const itemRevenue = item.total_price
        const unitCost = costMapping.get(item.sku) || 0
        const itemCost = unitCost * item.quantity

        console.log(
          `Processing ${item.sku}: qty=${item.quantity}, revenue=${itemRevenue}, unit_cost=${unitCost}, total_cost=${itemCost}`,
        )

        if (existing) {
          existing.soldQty += item.quantity
          existing.totalRevenue += itemRevenue
          existing.totalCost += itemCost
        } else {
          productMap.set(key, {
            sku: item.sku,
            productName: item.product_name,
            soldQty: item.quantity,
            totalRevenue: itemRevenue,
            totalCost: itemCost,
            grossProfit: 0,
            margin: 0,
            avgSalePrice: 0,
            avgCostPrice: 0,
          })
        }
      })
    })

    // Calculate derived metrics
    const analysis = Array.from(productMap.values()).map((item) => ({
      ...item,
      grossProfit: item.totalRevenue - item.totalCost,
      margin: item.totalRevenue > 0 ? ((item.totalRevenue - item.totalCost) / item.totalRevenue) * 100 : 0,
      avgSalePrice: item.soldQty > 0 ? item.totalRevenue / item.soldQty : 0,
      avgCostPrice: item.soldQty > 0 ? item.totalCost / item.soldQty : 0,
    }))

    console.log("Profit analysis calculated for", analysis.length, "products")
    setProfitData(analysis)
  }

  const calculateMonthlyData = (ordersData: ShopifyOrder[], costMapping: Map<string, number>) => {
    const monthMap = new Map<string, MonthlyData>()

    ordersData.forEach((order) => {
      const date = new Date(order.orderDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthName = date.toLocaleDateString("en-US", { month: "short", year: "numeric" })

      const existing = monthMap.get(monthKey)
      const revenue = order.totalAmount - order.shippingCost - order.taxAmount
      const cost = order.items.reduce((sum, item) => {
        const unitCost = costMapping.get(item.sku) || 0
        return sum + unitCost * item.quantity
      }, 0)

      if (existing) {
        existing.revenue += revenue
        existing.cost += cost
        existing.orders += 1
      } else {
        monthMap.set(monthKey, {
          month: monthName,
          revenue,
          cost,
          profit: 0,
          orders: 1,
        })
      }
    })

    // Calculate profit and sort by month
    const monthly = Array.from(monthMap.values())
      .map((item) => ({
        ...item,
        profit: item.revenue - item.cost,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    setMonthlyData(monthly.slice(-12)) // Last 12 months
  }

  const calculateStorePerformance = (ordersData: ShopifyOrder[], costMapping: Map<string, number>) => {
    const storeMap = new Map<string, StorePerformance>()

    ordersData.forEach((order) => {
      const existing = storeMap.get(order.storeId)
      const revenue = order.totalAmount - order.shippingCost - order.taxAmount
      const cost = order.items.reduce((sum, item) => {
        const unitCost = costMapping.get(item.sku) || 0
        return sum + unitCost * item.quantity
      }, 0)

      if (existing) {
        existing.revenue += revenue
        existing.cost += cost
        existing.orders += 1
      } else {
        storeMap.set(order.storeId, {
          storeId: order.storeId,
          storeName: order.storeName,
          revenue,
          cost,
          profit: 0,
          orders: 1,
          margin: 0,
        })
      }
    })

    // Calculate derived metrics
    const stores = Array.from(storeMap.values()).map((store) => ({
      ...store,
      profit: store.revenue - store.cost,
      margin: store.revenue > 0 ? ((store.revenue - store.cost) / store.revenue) * 100 : 0,
    }))

    setStoreData(stores)
  }

  const calculateSummaryMetrics = (ordersData: ShopifyOrder[], costMapping: Map<string, number>) => {
    const totalRevenue = ordersData.reduce(
      (sum, order) => sum + order.totalAmount - order.shippingCost - order.taxAmount,
      0,
    )
    const totalCost = ordersData.reduce((sum, order) => {
      return (
        sum +
        order.items.reduce((itemSum, item) => {
          const unitCost = costMapping.get(item.sku) || 0
          return itemSum + unitCost * item.quantity
        }, 0)
      )
    }, 0)
    const grossProfit = totalRevenue - totalCost
    const avgMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

    setSummaryMetrics({
      totalRevenue,
      totalCost,
      grossProfit,
      avgMargin,
      totalOrders: ordersData.length,
    })
  }

  const applyFilters = () => {
    let filtered = [...profitData]

    // Search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (item) => item.productName.toLowerCase().includes(searchLower) || item.sku.toLowerCase().includes(searchLower),
      )
    }

    // Margin filters
    if (filters.minMargin) {
      const minMargin = Number.parseFloat(filters.minMargin)
      filtered = filtered.filter((item) => item.margin >= minMargin)
    }
    if (filters.maxMargin) {
      const maxMargin = Number.parseFloat(filters.maxMargin)
      filtered = filtered.filter((item) => item.margin <= maxMargin)
    }

    // Profit filters
    if (filters.minProfit) {
      const minProfit = Number.parseFloat(filters.minProfit)
      filtered = filtered.filter((item) => item.grossProfit >= minProfit)
    }
    if (filters.maxProfit) {
      const maxProfit = Number.parseFloat(filters.maxProfit)
      filtered = filtered.filter((item) => item.grossProfit <= maxProfit)
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: number | string
      let bValue: number | string

      switch (filters.sortBy) {
        case "profit":
          aValue = a.grossProfit
          bValue = b.grossProfit
          break
        case "margin":
          aValue = a.margin
          bValue = b.margin
          break
        case "revenue":
          aValue = a.totalRevenue
          bValue = b.totalRevenue
          break
        case "soldQty":
          aValue = a.soldQty
          bValue = b.soldQty
          break
        case "productName":
          aValue = a.productName.toLowerCase()
          bValue = b.productName.toLowerCase()
          break
        default:
          aValue = a.grossProfit
          bValue = b.grossProfit
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return filters.sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      } else {
        return filters.sortOrder === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

    setFilteredProfitData(filtered)
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      minMargin: "",
      maxMargin: "",
      minProfit: "",
      maxProfit: "",
      sortBy: "profit",
      sortOrder: "desc",
    })
  }

  const handleExportCSV = () => {
    let csvContent: string[][] = []

    if (reportType === "profit") {
      csvContent = [
        [
          "SKU",
          "Product Name",
          "Sold Qty",
          "Avg Sale Price",
          "Avg Cost Price",
          "Total Revenue",
          "Total Cost",
          "Gross Profit",
          "Margin %",
        ],
        ...filteredProfitData.map((item) => [
          item.sku,
          item.productName,
          item.soldQty.toString(),
          item.avgSalePrice.toFixed(2),
          item.avgCostPrice.toFixed(2),
          item.totalRevenue.toFixed(2),
          item.totalCost.toFixed(2),
          item.grossProfit.toFixed(2),
          item.margin.toFixed(2),
        ]),
      ]
    } else if (reportType === "monthly") {
      csvContent = [
        ["Month", "Revenue", "Cost", "Profit", "Orders"],
        ...monthlyData.map((item) => [
          item.month,
          item.revenue.toFixed(2),
          item.cost.toFixed(2),
          item.profit.toFixed(2),
          item.orders.toString(),
        ]),
      ]
    } else if (reportType === "store") {
      csvContent = [
        ["Store", "Revenue", "Cost", "Profit", "Orders", "Margin %"],
        ...storeData.map((item) => [
          item.storeName,
          item.revenue.toFixed(2),
          item.cost.toFixed(2),
          item.profit.toFixed(2),
          item.orders.toString(),
          item.margin.toFixed(2),
        ]),
      ]
    }

    const csvString = csvContent.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExportPDF = () => {
    const reportContent = `
PROFIT ANALYSIS REPORT
Generated: ${new Date().toLocaleDateString()}
Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}

SUMMARY METRICS:
- Total Revenue: $${summaryMetrics.totalRevenue.toLocaleString()}
- Total Cost: $${summaryMetrics.totalCost.toLocaleString()}
- Gross Profit: $${summaryMetrics.grossProfit.toLocaleString()}
- Average Margin: ${summaryMetrics.avgMargin.toFixed(1)}%
- Total Orders: ${summaryMetrics.totalOrders}

${
  reportType === "profit"
    ? `
PRODUCT PROFIT BREAKDOWN (${filteredProfitData.length} products):
${filteredProfitData
  .slice(0, 50)
  .map(
    (item) => `
${item.productName} (${item.sku}):
- Sold Quantity: ${item.soldQty}
- Average Sale Price: $${item.avgSalePrice.toFixed(2)}
- Average Cost Price: $${item.avgCostPrice.toFixed(2)}
- Total Revenue: $${item.totalRevenue.toLocaleString()}
- Total Cost: $${item.totalCost.toLocaleString()}
- Gross Profit: $${item.grossProfit.toLocaleString()}
- Margin: ${item.margin.toFixed(1)}%
`,
  )
  .join("")}
`
    : ""
}

Report generated by Warehouse Management System
  `.trim()

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `profit_report_${reportType}_${new Date().toISOString().split("T")[0]}.txt`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Profit Reports</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading report data...</span>
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
        {/* Report Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
            <CardDescription>Configure your profit analysis parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profit">Product Profit Analysis</SelectItem>
                    <SelectItem value="monthly">Monthly Performance</SelectItem>
                    <SelectItem value="store">Store Comparison</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <DatePickerWithRange />
              </div>
              <div className="flex items-end space-x-2">
                <Button onClick={loadData}>Refresh Data</Button>
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryMetrics.totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From {summaryMetrics.totalOrders} orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryMetrics.totalCost.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">FIFO calculated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${summaryMetrics.grossProfit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{summaryMetrics.avgMargin.toFixed(1)}% margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.avgMargin.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Across all products</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryMetrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Shopify orders</p>
            </CardContent>
          </Card>
        </div>

        {reportType === "profit" && (
          <>
            {/* Product Filters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Filters</CardTitle>
                    <CardDescription>Filter and sort product profit analysis</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <Filter className="h-4 w-4 mr-2" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>
                </div>
              </CardHeader>
              {showFilters && (
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search</label>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Product name or SKU"
                          value={filters.searchTerm}
                          onChange={(e) => setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Min Margin %</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minMargin}
                        onChange={(e) => setFilters((prev) => ({ ...prev, minMargin: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Margin %</label>
                      <Input
                        type="number"
                        placeholder="100"
                        value={filters.maxMargin}
                        onChange={(e) => setFilters((prev) => ({ ...prev, maxMargin: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Min Profit $</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.minProfit}
                        onChange={(e) => setFilters((prev) => ({ ...prev, minProfit: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Sort By</label>
                      <Select
                        value={filters.sortBy}
                        onValueChange={(value: any) => setFilters((prev) => ({ ...prev, sortBy: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="profit">Gross Profit</SelectItem>
                          <SelectItem value="margin">Margin %</SelectItem>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="soldQty">Quantity Sold</SelectItem>
                          <SelectItem value="productName">Product Name</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Order</label>
                      <Select
                        value={filters.sortOrder}
                        onValueChange={(value: any) => setFilters((prev) => ({ ...prev, sortOrder: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Descending</SelectItem>
                          <SelectItem value="asc">Ascending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredProfitData.length} of {profitData.length} products
                    </div>
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Product Profit Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Product-Level Profit Analysis</CardTitle>
                <CardDescription>
                  Detailed profit breakdown by product with actual cost data ({filteredProfitData.length} products)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[600px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Sold Qty</TableHead>
                        <TableHead>Avg Sale Price</TableHead>
                        <TableHead>Avg Cost Price</TableHead>
                        <TableHead>Total Revenue</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Gross Profit</TableHead>
                        <TableHead>Margin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProfitData.map((item) => (
                        <TableRow key={item.sku}>
                          <TableCell className="font-medium max-w-[200px] truncate" title={item.productName}>
                            {item.productName}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono">{item.sku}</TableCell>
                          <TableCell>{item.soldQty}</TableCell>
                          <TableCell>${item.avgSalePrice.toFixed(2)}</TableCell>
                          <TableCell>${item.avgCostPrice.toFixed(2)}</TableCell>
                          <TableCell>${item.totalRevenue.toLocaleString()}</TableCell>
                          <TableCell>${item.totalCost.toLocaleString()}</TableCell>
                          <TableCell
                            className={
                              item.grossProfit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"
                            }
                          >
                            ${item.grossProfit.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.margin >= 20 ? "default" : item.margin >= 10 ? "secondary" : "destructive"}
                            >
                              {item.margin.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Profit Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Profit</CardTitle>
                <CardDescription>Revenue vs Cost comparison for top performing products</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                    cost: {
                      label: "Cost",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredProfitData.slice(0, 10).map((item) => ({
                        name:
                          item.productName.length > 20 ? item.productName.substring(0, 20) + "..." : item.productName,
                        revenue: item.totalRevenue,
                        cost: item.totalCost,
                      }))}
                    >
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="var(--color-revenue)" />
                      <Bar dataKey="cost" fill="var(--color-cost)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </>
        )}

        {reportType === "monthly" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Trend</CardTitle>
                <CardDescription>Revenue, cost, and profit trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                    cost: {
                      label: "Cost",
                      color: "hsl(var(--chart-2))",
                    },
                    profit: {
                      label: "Profit",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-[400px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} />
                      <Line type="monotone" dataKey="cost" stroke="var(--color-cost)" strokeWidth={2} />
                      <Line type="monotone" dataKey="profit" stroke="var(--color-profit)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Metrics</CardTitle>
                <CardDescription>Detailed monthly performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyData.slice(-6).map((item) => (
                      <TableRow key={item.month}>
                        <TableCell className="font-medium">{item.month}</TableCell>
                        <TableCell>{item.orders}</TableCell>
                        <TableCell>${item.revenue.toLocaleString()}</TableCell>
                        <TableCell>${item.cost.toLocaleString()}</TableCell>
                        <TableCell
                          className={item.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}
                        >
                          ${item.profit.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {reportType === "store" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Store Performance</CardTitle>
                <CardDescription>Revenue distribution by store</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: {
                      label: "Revenue",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={storeData.map((store, index) => ({
                          name: store.storeName,
                          value: store.revenue,
                          fill: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: $${value.toLocaleString()}`}
                      ></Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Store Metrics</CardTitle>
                <CardDescription>Detailed performance by store</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeData.map((store) => (
                      <TableRow key={store.storeId}>
                        <TableCell className="font-medium">{store.storeName}</TableCell>
                        <TableCell>{store.orders}</TableCell>
                        <TableCell>${store.revenue.toLocaleString()}</TableCell>
                        <TableCell
                          className={store.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}
                        >
                          ${store.profit.toLocaleString()}
                        </TableCell>
                        <TableCell>
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
              </CardContent>
            </Card>
          </div>
        )}

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export Options</CardTitle>
            <CardDescription>Download reports in various formats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <FileText className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
