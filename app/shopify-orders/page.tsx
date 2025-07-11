"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  RefreshCw,
  Search,
  Filter,
  Download,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  User,
  MapPin,
  Mail,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { supabaseStore, type ShopifyOrder, type ShopifyStore } from "@/lib/supabase-store"
import { DateRangePicker } from "@/components/date-range-picker"

interface OrderFilters {
  search: string
  status: string
  store: string
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

export default function ShopifyOrdersPage() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [filteredOrders, setFilteredOrders] = useState<ShopifyOrder[]>([])
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "all",
    store: "all",
    dateRange: {
      from: undefined,
      to: undefined,
    },
  })

  // Summary metrics
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    averageOrderValue: 0,
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, filters])

  const loadData = async () => {
    try {
      setLoading(true)
      const [ordersData, storesData] = await Promise.all([
        supabaseStore.getShopifyOrders(),
        supabaseStore.getShopifyStores(),
      ])

      console.log("Loaded orders:", ordersData.length)
      console.log("Loaded stores:", storesData.length)

      setOrders(ordersData)
      setStores(storesData)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...orders]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerName.toLowerCase().includes(searchLower) ||
          order.customerEmail.toLowerCase().includes(searchLower) ||
          order.items.some(
            (item) =>
              item.product_name.toLowerCase().includes(searchLower) || item.sku.toLowerCase().includes(searchLower),
          ),
      )
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter((order) => order.status === filters.status)
    }

    // Store filter
    if (filters.store !== "all") {
      filtered = filtered.filter((order) => order.storeId === filters.store)
    }

    // Date range filter
    if (filters.dateRange.from) {
      filtered = filtered.filter((order) => new Date(order.orderDate) >= filters.dateRange.from!)
    }
    if (filters.dateRange.to) {
      filtered = filtered.filter((order) => new Date(order.orderDate) <= filters.dateRange.to!)
    }

    setFilteredOrders(filtered)

    // Calculate metrics for filtered orders
    const totalOrders = filtered.length
    const totalRevenue = filtered.reduce((sum, order) => sum + (order.total_amount || 0) - (order.tax_amount || 0), 0)
    const totalProfit = filtered.reduce((sum, order) => sum + (order.profit || 0), 0)
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    setMetrics({
      totalOrders,
      totalRevenue,
      totalProfit,
      averageOrderValue,
    })
  }

  const syncOrders = async () => {
    try {
      setSyncing(true)
      console.log("Starting order sync...")

      // Call the API endpoint to sync orders
      const response = await fetch("/api/shopify-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`)
      }

      const result = await response.json()
      console.log("Sync result:", result)

      // Reload data after sync
      await loadData()
    } catch (error) {
      console.error("Error syncing orders:", error)
      alert("Failed to sync orders. Please try again.")
    } finally {
      setSyncing(false)
    }
  }

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return

    const headers = [
      "Order Number",
      "Store",
      "Customer Name",
      "Customer Email",
      "Order Date",
      "Status",
      "Total Amount",
      "Tax Amount",
      "Revenue (excl. tax)",
      "Shipping Cost",
      "Profit",
      "Items Count",
      "Shipping Address",
    ]

    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((order) =>
        [
          `"${order.orderNumber}"`,
          `"${order.storeName}"`,
          `"${order.customerName}"`,
          `"${order.customerEmail}"`,
          order.orderDate,
          order.status,
          order.total_amount || 0,
          order.tax_amount || 0,
          (order.total_amount || 0) - (order.tax_amount || 0),
          order.shipping_cost || 0,
          order.profit || 0,
          order.items.length,
          `"${order.shipping_address || ""}"`,
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `shopify-orders-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "fulfilled":
        return <Badge variant="default">Fulfilled</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      case "refunded":
        return <Badge variant="outline">Refunded</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getProfitBadge = (profit: number) => {
    if (profit > 0) {
      return (
        <Badge variant="default" className="text-green-600">
          +{profit.toFixed(2)} лв
        </Badge>
      )
    } else if (profit < 0) {
      return <Badge variant="destructive">-{Math.abs(profit).toFixed(2)} лв</Badge>
    } else {
      return <Badge variant="secondary">0.00 лв</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Shopify Orders</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading orders...</p>
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
          <h1 className="text-lg font-semibold">Shopify Orders</h1>
          <Button onClick={syncOrders} disabled={syncing} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Orders"}
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Filtered results</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue (excl. tax)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalRevenue.toLocaleString()} лв</div>
              <p className="text-xs text-muted-foreground">
                Total:{" "}
                {(
                  metrics.totalRevenue + filteredOrders.reduce((sum, order) => sum + (order.tax_amount || 0), 0)
                ).toLocaleString()}{" "}
                лв (incl. tax)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.totalProfit.toLocaleString()} лв</div>
              <p className="text-xs text-muted-foreground">
                Margin: {metrics.totalRevenue > 0 ? ((metrics.totalProfit / metrics.totalRevenue) * 100).toFixed(1) : 0}
                %
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.averageOrderValue.toFixed(2)} лв</div>
              <p className="text-xs text-muted-foreground">Revenue per order</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Order number, customer, product..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="fulfilled">Fulfilled</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Store</label>
                <Select value={filters.store} onValueChange={(value) => setFilters({ ...filters, store: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <DateRangePicker
                  date={filters.dateRange}
                  onDateChange={(dateRange) => setFilters({ ...filters, dateRange })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    search: "",
                    status: "all",
                    store: "all",
                    dateRange: { from: undefined, to: undefined },
                  })
                }
              >
                Clear Filters
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>Manage and view your Shopify orders with detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <div key={order.id} className="border rounded-lg">
                  <Collapsible open={expandedOrders.has(order.id)} onOpenChange={() => toggleOrderExpansion(order.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-4">
                          {expandedOrders.has(order.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <div>
                            <div className="font-medium">{order.orderNumber}</div>
                            <div className="text-sm text-muted-foreground">{order.storeName}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(order.orderDate).toLocaleDateString()}
                          </div>
                          {getStatusBadge(order.status)}
                          <div className="text-right">
                            <div className="font-medium">
                              {((order.total_amount || 0) - (order.tax_amount || 0)).toFixed(2)} лв
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total: {(order.total_amount || 0).toFixed(2)} лв
                            </div>
                          </div>
                          {getProfitBadge(order.profit || 0)}
                          <Badge variant="outline">{order.items.length} items</Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="grid gap-6 md:grid-cols-2 pt-4">
                          {/* Order Information */}
                          <div className="space-y-4">
                            <h4 className="font-medium">Order Information</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Order Number:</span>
                                <span className="font-medium">{order.orderNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Store:</span>
                                <span className="font-medium">{order.storeName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-medium">{new Date(order.orderDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                {getStatusBadge(order.status)}
                              </div>
                            </div>

                            <h4 className="font-medium">Financial Summary</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total Amount:</span>
                                <span className="font-medium">{(order.total_amount || 0).toFixed(2)} лв</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax:</span>
                                <span className="font-medium">{(order.tax_amount || 0).toFixed(2)} лв</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Revenue (excl. tax):</span>
                                <span className="font-medium">
                                  {((order.total_amount || 0) - (order.tax_amount || 0)).toFixed(2)} лв
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shipping:</span>
                                <span className="font-medium">{(order.shipping_cost || 0).toFixed(2)} лв</span>
                              </div>
                              <div className="flex justify-between border-t pt-2">
                                <span className="text-muted-foreground">Profit:</span>
                                <span
                                  className={`font-medium ${(order.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                                >
                                  {(order.profit || 0).toFixed(2)} лв
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Customer Information */}
                          <div className="space-y-4">
                            <h4 className="font-medium">Customer Information</h4>
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{order.customerName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span>{order.customerEmail}</span>
                              </div>
                              {order.shipping_address && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                  <div>
                                    <div className="font-medium">Shipping Address</div>
                                    <div className="text-sm text-muted-foreground whitespace-pre-line">
                                      {order.shipping_address}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="mt-6">
                          <h4 className="font-medium mb-3">Order Items</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Item Profit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.items.map((item, index) => {
                                const itemWithCost = order.shopify_order_items?.find((i) => i.id === item.id) || item
                                const costPrice = (itemWithCost as any)?.cost_price || 0
                                const itemProfit = (item.unit_price - costPrice) * item.quantity

                                return (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{item.product_name}</TableCell>
                                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{(item.unit_price || 0).toFixed(2)} лв</TableCell>
                                    <TableCell>{costPrice.toFixed(2)} лв</TableCell>
                                    <TableCell>{(item.total_price || 0).toFixed(2)} лв</TableCell>
                                    <TableCell>
                                      <span className={itemProfit >= 0 ? "text-green-600" : "text-red-600"}>
                                        {itemProfit.toFixed(2)} лв
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>

            {filteredOrders.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No orders found</h3>
                <p className="text-muted-foreground">
                  {orders.length === 0 ? "Sync your Shopify orders to get started" : "Try adjusting your filters"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
