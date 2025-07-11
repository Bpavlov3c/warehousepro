"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRangePicker } from "@/components/date-range-picker"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Download,
  RefreshCw,
} from "lucide-react"
import { supabaseStore } from "@/lib/supabase-store"

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1), // First day of current month
    to: new Date(), // Today
  })
  const [reportData, setReportData] = useState({
    inventory: {
      totalItems: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      topItems: [],
    },
    sales: {
      totalOrders: 0,
      totalRevenue: 0,
      totalProfit: 0,
      averageOrderValue: 0,
      topProducts: [],
      revenueByStore: [],
    },
    purchaseOrders: {
      totalPOs: 0,
      totalSpent: 0,
      deliveredPOs: 0,
      pendingPOs: 0,
      topSuppliers: [],
    },
  })

  useEffect(() => {
    loadReportData()
  }, [dateRange])

  const loadReportData = async () => {
    try {
      setLoading(true)

      // Load inventory data
      const inventory = await supabaseStore.getInventory()
      const inventoryStats = {
        totalItems: inventory.length,
        totalValue: inventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0),
        lowStockItems: inventory.filter((item) => item.inStock - item.reserved <= 10 && item.inStock > 0).length,
        outOfStockItems: inventory.filter((item) => item.inStock === 0).length,
        topItems: inventory
          .sort((a, b) => b.inStock * b.unitCost - a.inStock * a.unitCost)
          .slice(0, 10)
          .map((item) => ({
            sku: item.sku,
            name: item.name,
            value: item.inStock * item.unitCost,
            quantity: item.inStock,
          })),
      }

      // Load orders data
      const orders = await supabaseStore.getShopifyOrders()
      const filteredOrders = orders.filter((order) => {
        const orderDate = new Date(order.orderDate)
        if (dateRange.from && orderDate < dateRange.from) return false
        if (dateRange.to && orderDate > dateRange.to) return false
        return true
      })

      const salesStats = {
        totalOrders: filteredOrders.length,
        totalRevenue: filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0),
        totalProfit: filteredOrders.reduce((sum, order) => sum + (order.profit || 0), 0),
        averageOrderValue:
          filteredOrders.length > 0
            ? filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0) / filteredOrders.length
            : 0,
        topProducts: getTopProducts(filteredOrders),
        revenueByStore: getRevenueByStore(filteredOrders),
      }

      // Load purchase orders data
      const purchaseOrders = await supabaseStore.getPurchaseOrders()
      const filteredPOs = purchaseOrders.filter((po) => {
        const poDate = new Date(po.po_date)
        if (dateRange.from && poDate < dateRange.from) return false
        if (dateRange.to && poDate > dateRange.to) return false
        return true
      })

      const poStats = {
        totalPOs: filteredPOs.length,
        totalSpent: filteredPOs.reduce((sum, po) => {
          const itemsTotal = po.items.reduce((itemSum, item) => itemSum + item.total_cost, 0)
          return sum + itemsTotal + po.delivery_cost
        }, 0),
        deliveredPOs: filteredPOs.filter((po) => po.status === "Delivered").length,
        pendingPOs: filteredPOs.filter((po) => po.status === "Pending" || po.status === "In Transit").length,
        topSuppliers: getTopSuppliers(filteredPOs),
      }

      setReportData({
        inventory: inventoryStats,
        sales: salesStats,
        purchaseOrders: poStats,
      })
    } catch (error) {
      console.error("Error loading report data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTopProducts = (orders: any[]) => {
    const productMap = new Map()

    orders.forEach((order) => {
      order.items.forEach((item: any) => {
        const key = item.sku
        if (productMap.has(key)) {
          const existing = productMap.get(key)
          existing.quantity += item.quantity
          existing.revenue += item.total_price || 0
        } else {
          productMap.set(key, {
            sku: item.sku,
            name: item.product_name,
            quantity: item.quantity,
            revenue: item.total_price || 0,
          })
        }
      })
    })

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  }

  const getRevenueByStore = (orders: any[]) => {
    const storeMap = new Map()

    orders.forEach((order) => {
      const storeName = order.storeName
      if (storeMap.has(storeName)) {
        const existing = storeMap.get(storeName)
        existing.orders += 1
        existing.revenue += order.total_amount || 0
      } else {
        storeMap.set(storeName, {
          name: storeName,
          orders: 1,
          revenue: order.total_amount || 0,
        })
      }
    })

    return Array.from(storeMap.values()).sort((a, b) => b.revenue - a.revenue)
  }

  const getTopSuppliers = (pos: any[]) => {
    const supplierMap = new Map()

    pos.forEach((po) => {
      const supplier = po.supplier_name
      const totalCost = po.items.reduce((sum: number, item: any) => sum + item.total_cost, 0) + po.delivery_cost

      if (supplierMap.has(supplier)) {
        const existing = supplierMap.get(supplier)
        existing.orders += 1
        existing.totalSpent += totalCost
      } else {
        supplierMap.set(supplier, {
          name: supplier,
          orders: 1,
          totalSpent: totalCost,
        })
      }
    })

    return Array.from(supplierMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
  }

  const exportReport = () => {
    const reportSections = [
      ["INVENTORY REPORT"],
      [""],
      ["Metric", "Value"],
      ["Total Items", reportData.inventory.totalItems.toString()],
      ["Total Value", `$${reportData.inventory.totalValue.toFixed(2)}`],
      ["Low Stock Items", reportData.inventory.lowStockItems.toString()],
      ["Out of Stock Items", reportData.inventory.outOfStockItems.toString()],
      [""],
      ["Top Inventory Items by Value"],
      ["SKU", "Product Name", "Quantity", "Value"],
      ...reportData.inventory.topItems.map((item: any) => [
        item.sku,
        item.name,
        item.quantity.toString(),
        `$${item.value.toFixed(2)}`,
      ]),
      [""],
      ["SALES REPORT"],
      [""],
      ["Metric", "Value"],
      ["Total Orders", reportData.sales.totalOrders.toString()],
      ["Total Revenue", `$${reportData.sales.totalRevenue.toFixed(2)}`],
      ["Total Profit", `$${reportData.sales.totalProfit.toFixed(2)}`],
      ["Average Order Value", `$${reportData.sales.averageOrderValue.toFixed(2)}`],
      [""],
      ["Top Products by Revenue"],
      ["SKU", "Product Name", "Quantity Sold", "Revenue"],
      ...reportData.sales.topProducts.map((product: any) => [
        product.sku,
        product.name,
        product.quantity.toString(),
        `$${product.revenue.toFixed(2)}`,
      ]),
      [""],
      ["Revenue by Store"],
      ["Store Name", "Orders", "Revenue"],
      ...reportData.sales.revenueByStore.map((store: any) => [
        store.name,
        store.orders.toString(),
        `$${store.revenue.toFixed(2)}`,
      ]),
      [""],
      ["PURCHASE ORDERS REPORT"],
      [""],
      ["Metric", "Value"],
      ["Total Purchase Orders", reportData.purchaseOrders.totalPOs.toString()],
      ["Total Spent", `$${reportData.purchaseOrders.totalSpent.toFixed(2)}`],
      ["Delivered POs", reportData.purchaseOrders.deliveredPOs.toString()],
      ["Pending POs", reportData.purchaseOrders.pendingPOs.toString()],
      [""],
      ["Top Suppliers by Spend"],
      ["Supplier Name", "Orders", "Total Spent"],
      ...reportData.purchaseOrders.topSuppliers.map((supplier: any) => [
        supplier.name,
        supplier.orders.toString(),
        `$${supplier.totalSpent.toFixed(2)}`,
      ]),
    ]

    const csvContent = reportSections.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `warehouse_report_${dateRange.from?.toISOString().slice(0, 10)}_to_${dateRange.to?.toISOString().slice(0, 10)}.csv`,
    )
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          <h1 className="text-lg font-semibold">Reports</h1>
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
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <BarChart3 className="h-5 w-5" />
          <span className="hidden sm:inline">Reports & Analytics</span>
          <span className="sm:hidden">Reports</span>
        </h1>
      </header>

      <div className="flex-1 space-y-6 p-4 pt-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select date range"
              className="w-full sm:w-auto"
            />
            <Button variant="outline" size="sm" onClick={loadReportData} className="bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={exportReport} className="bg-transparent">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {currency(reportData.sales.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Profit</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">
                    {currency(reportData.sales.totalProfit)}
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Orders</p>
                  <p className="text-lg sm:text-2xl font-bold">{reportData.sales.totalOrders}</p>
                </div>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Order Value</p>
                  <p className="text-lg sm:text-2xl font-bold">{currency(reportData.sales.averageOrderValue)}</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Overview
            </CardTitle>
            <CardDescription>Current inventory status and top items by value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold">{reportData.inventory.totalItems}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Items</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold">{currency(reportData.inventory.totalValue)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Value</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">{reportData.inventory.lowStockItems}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Low Stock</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-red-600">{reportData.inventory.outOfStockItems}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Out of Stock</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">SKU</TableHead>
                    <TableHead className="min-w-[150px]">Product Name</TableHead>
                    <TableHead className="text-right min-w-[80px]">Quantity</TableHead>
                    <TableHead className="text-right min-w-[100px]">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.inventory.topItems.map((item: any, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-xs sm:text-sm">{item.sku}</TableCell>
                      <TableCell className="text-xs sm:text-sm">{item.name}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right font-medium text-xs sm:text-sm">
                        {currency(item.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Sales Report */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Products by Revenue
              </CardTitle>
              <CardDescription>Best performing products in the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">SKU</TableHead>
                      <TableHead className="min-w-[150px]">Product</TableHead>
                      <TableHead className="text-right min-w-[60px]">Qty</TableHead>
                      <TableHead className="text-right min-w-[100px]">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.sales.topProducts.map((product: any, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-xs sm:text-sm">{product.sku}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{product.name}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">{product.quantity}</TableCell>
                        <TableCell className="text-right font-medium text-xs sm:text-sm">
                          {currency(product.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Revenue by Store
              </CardTitle>
              <CardDescription>Performance breakdown by connected stores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Store Name</TableHead>
                      <TableHead className="text-right min-w-[60px]">Orders</TableHead>
                      <TableHead className="text-right min-w-[100px]">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.sales.revenueByStore.map((store: any, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-xs sm:text-sm">{store.name}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">{store.orders}</TableCell>
                        <TableCell className="text-right font-medium text-xs sm:text-sm">
                          {currency(store.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Orders Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Purchase Orders & Suppliers
            </CardTitle>
            <CardDescription>Spending analysis and top suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold">{reportData.purchaseOrders.totalPOs}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total POs</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold">{currency(reportData.purchaseOrders.totalSpent)}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Spent</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-green-600">{reportData.purchaseOrders.deliveredPOs}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-lg sm:text-2xl font-bold text-yellow-600">{reportData.purchaseOrders.pendingPOs}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Supplier Name</TableHead>
                    <TableHead className="text-right min-w-[60px]">Orders</TableHead>
                    <TableHead className="text-right min-w-[100px]">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.purchaseOrders.topSuppliers.map((supplier: any, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-xs sm:text-sm">{supplier.name}</TableCell>
                      <TableCell className="text-right text-xs sm:text-sm">{supplier.orders}</TableCell>
                      <TableCell className="text-right font-medium text-xs sm:text-sm">
                        {currency(supplier.totalSpent)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
