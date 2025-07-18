"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  Download,
  RefreshCw,
  ChevronDown,
  Filter,
  X,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ShopifyOrder, ShopifyOrderStats } from "@/lib/supabase-store"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/* ------------------------------ helpers ------------------------------- */

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/* ------------------------------ skeletons ----------------------------- */

const StatCardSkeleton = () => (
  <Card className="p-3">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
      </div>
      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </Card>
)

const TableSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Store</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Profit</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(10)].map((_, i) => (
            <TableRow key={i} className="h-12">
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

/* ------------------------------ main component ------------------------ */

interface Props {
  initialOrders: ShopifyOrder[]
  initialTotal: number
  initialHasMore: boolean
}

export default function ShopifyOrdersClient({ initialOrders, initialTotal, initialHasMore }: Props) {
  const [orders, setOrders] = useState<ShopifyOrder[]>(initialOrders)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState<number>(initialTotal)
  const [hasMore, setHasMore] = useState<boolean>(initialHasMore)
  const [globalStats, setGlobalStats] = useState<ShopifyOrderStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [storeFilter, setStoreFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFromFilter, setDateFromFilter] = useState<string>("")
  const [dateToFilter, setDateToFilter] = useState<string>("")

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Update state when props change (when navigating back to the page)
  useEffect(() => {
    setOrders(initialOrders)
    setTotal(initialTotal)
    setHasMore(initialHasMore)
  }, [initialOrders, initialTotal, initialHasMore])

  // Load global statistics on component mount and when orders change
  useEffect(() => {
    const loadGlobalStats = async () => {
      try {
        setStatsLoading(true)
        const response = await fetch("/api/shopify-orders/stats")
        if (!response.ok) throw new Error("Failed to load stats")

        const stats = await response.json()
        setGlobalStats(stats)
      } catch (err) {
        console.error("Error loading global stats:", err)
        // Fallback to calculating from loaded orders if stats API fails
        setGlobalStats({
          totalOrders: total,
          totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
          totalProfit: orders.reduce((sum, order) => sum + order.profit, 0),
          avgOrderValue:
            orders.length > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / orders.length : 0,
        })
      } finally {
        setStatsLoading(false)
      }
    }

    loadGlobalStats()
  }, [orders, total])

  // Load more orders
  const loadMoreOrders = useCallback(async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const response = await fetch(`/api/shopify-orders/list?limit=20&offset=${orders.length}`)
      if (!response.ok) throw new Error("Failed to load more orders")

      const result = await response.json()
      setOrders((prev) => [...prev, ...result.data])
      setHasMore(result.hasMore)
    } catch (err) {
      console.error("Error loading more orders:", err)
      setError("Failed to load more orders")
    } finally {
      setLoadingMore(false)
    }
  }, [orders.length, hasMore, loadingMore])

  // Refresh orders and stats
  const refreshOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Refresh both orders and stats
      const [ordersResponse, statsResponse] = await Promise.all([
        fetch("/api/shopify-orders/list?limit=20&offset=0"),
        fetch("/api/shopify-orders/stats"),
      ])

      if (!ordersResponse.ok) throw new Error("Failed to refresh orders")
      if (!statsResponse.ok) throw new Error("Failed to refresh stats")

      const [ordersResult, statsResult] = await Promise.all([ordersResponse.json(), statsResponse.json()])

      setOrders(ordersResult.data)
      setTotal(ordersResult.total)
      setHasMore(ordersResult.hasMore)
      setGlobalStats(statsResult)
    } catch (err) {
      console.error("Error refreshing orders:", err)
      setError("Failed to refresh orders")
    } finally {
      setLoading(false)
    }
  }, [])

  // Sync orders from Shopify
  const syncOrders = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const response = await fetch("/api/shopify-orders", { method: "POST" })
      if (!response.ok) throw new Error("Failed to sync orders")

      const result = await response.json()

      // After sync, refresh the orders and stats
      await refreshOrders()

      // You could show a success message here if needed
      console.log(`Synced ${result.count} orders`)
    } catch (err) {
      console.error("Error syncing orders:", err)
      setError("Failed to sync orders from Shopify")
    } finally {
      setSyncing(false)
    }
  }, [refreshOrders])

  const getStatusColor = useCallback((status: string) => {
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
  }, [])

  // Get unique stores for filter dropdown
  const uniqueStores = useMemo(() => {
    const stores = Array.from(new Set(orders.map((order) => order.storeName)))
    return stores.sort()
  }, [orders])

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = Array.from(new Set(orders.map((order) => order.status)))
    return statuses.sort()
  }, [orders])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setStoreFilter("all")
    setStatusFilter("all")
    setDateFromFilter("")
    setDateToFilter("")
    setSearchTerm("")
  }, [])

  // Check if any filters are active
  const hasActiveFilters =
    storeFilter !== "all" || statusFilter !== "all" || dateFromFilter || dateToFilter || searchTerm

  // Filtered orders (applies search + filters)
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Apply search filter
    if (debouncedSearchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          order.customerName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          order.customerEmail.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
          order.storeName.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
      )
    }

    // Apply store filter
    if (storeFilter !== "all") {
      filtered = filtered.filter((order) => order.storeName === storeFilter)
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status.toLowerCase() === statusFilter.toLowerCase())
    }

    // Apply date range filter
    if (dateFromFilter) {
      filtered = filtered.filter((order) => new Date(order.orderDate) >= new Date(dateFromFilter))
    }

    if (dateToFilter) {
      filtered = filtered.filter((order) => new Date(order.orderDate) <= new Date(dateToFilter))
    }

    return filtered
  }, [orders, debouncedSearchTerm, storeFilter, statusFilter, dateFromFilter, dateToFilter])

  const exportToCSV = useCallback(() => {
    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Store",
      "Date",
      "Status",
      "Total Amount",
      "Shipping Cost",
      "Tax Amount",
      "Profit",
      "Items Count",
    ]

    const csvData = filteredOrders.map((order) => [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      order.storeName,
      new Date(order.orderDate).toLocaleDateString(),
      order.status,
      order.totalAmount.toFixed(2),
      order.shippingCost.toFixed(2),
      order.taxAmount.toFixed(2),
      order.profit.toFixed(2),
      order.items.length,
    ])

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `shopify-orders-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredOrders])

  if (error && orders.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Orders</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading orders</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <Button onClick={refreshOrders} className="mt-3 bg-transparent" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
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
          <h1 className="text-lg font-semibold">Orders</h1>
          <div className="flex items-center gap-2">
            <Button onClick={syncOrders} size="sm" variant="outline" disabled={syncing}>
              <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={refreshOrders} size="sm" variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={exportToCSV} size="sm" className="lg:hidden" disabled={loading}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Orders</h1>
          <div className="hidden lg:flex items-center gap-2">
            <Button onClick={syncOrders} size="sm" disabled={syncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sync from Shopify
            </Button>
            <Button onClick={refreshOrders} size="sm" variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={exportToCSV} size="sm" disabled={loading}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : globalStats ? (
            <>
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Orders</p>
                    <p className="text-lg font-bold">{globalStats.totalOrders.toLocaleString()}</p>
                  </div>
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Revenue</p>
                    <p className="text-lg font-bold">${globalStats.totalRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Profit</p>
                    <p className="text-lg font-bold">${globalStats.totalProfit.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Avg Order Value</p>
                    <p className="text-lg font-bold">${globalStats.avgOrderValue.toFixed(2)}</p>
                  </div>
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </Card>
            </>
          ) : (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          )}
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            {/* Store Filter */}
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {uniqueStores.map((store) => (
                  <SelectItem key={store} value={store}>
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">From:</span>
              <div className="relative">
                <Input
                  type="date"
                  value={dateFromFilter}
                  onChange={(e) => setDateFromFilter(e.target.value)}
                  className="w-[140px] h-9"
                />
              </div>
            </div>

            {/* Date To Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">To:</span>
              <div className="relative">
                <Input
                  type="date"
                  value={dateToFilter}
                  onChange={(e) => setDateToFilter(e.target.value)}
                  className="w-[140px] h-9"
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" size="sm" className="h-9 bg-transparent">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
              {storeFilter !== "all" && ` • Store: ${storeFilter}`}
              {statusFilter !== "all" && ` • Status: ${statusFilter}`}
              {dateFromFilter && ` • From: ${new Date(dateFromFilter).toLocaleDateString()}`}
              {dateToFilter && ` • To: ${new Date(dateToFilter).toLocaleDateString()}`}
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {loading && orders.length === 0 ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </Card>
            ))
          ) : filteredOrders.length === 0 ? (
            <Card className="p-6 text-center">
              <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No orders found." : "No orders yet."}</p>
            </Card>
          ) : (
            <>
              {filteredOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{order.orderNumber}</h3>
                      <p className="text-sm text-gray-600 truncate">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.storeName}</p>
                    </div>
                    <Badge className={`${getStatusColor(order.status)} text-xs`}>{order.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="font-medium">${order.totalAmount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Profit:</span>
                      <p className={`font-medium ${order.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ${order.profit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <p>{new Date(order.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <p>{order.items.length}</p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedOrder(order)
                      setIsViewOrderOpen(true)
                    }}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </Card>
              ))}

              {/* Load More Button for Mobile */}
              {hasMore && !searchTerm && (
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={loadMoreOrders}
                    disabled={loadingMore}
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    {loadingMore ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    )}
                    {loadingMore ? "Loading..." : `Load More (${total - orders.length} remaining)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Desktop Table View */}
        {loading && orders.length === 0 ? (
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        ) : (
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-10">
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[100px]">Total</TableHead>
                    <TableHead className="w-[100px]">Profit</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{searchTerm ? "No orders found." : "No orders yet."}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} className="h-12">
                          <TableCell className="font-medium">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{order.customerName}</div>
                              <div className="text-sm text-gray-500 truncate max-w-[150px]">{order.customerEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell>{order.storeName}</TableCell>
                          <TableCell className="text-sm">{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(order.status)} text-xs px-2 py-1`}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={order.profit >= 0 ? "text-green-600" : "text-red-600"}>
                              ${order.profit.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order)
                                setIsViewOrderOpen(true)
                              }}
                              title="View Order Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Load More Row for Desktop */}
                      {hasMore && !searchTerm && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4">
                            <Button onClick={loadMoreOrders} disabled={loadingMore} variant="outline" size="sm">
                              {loadingMore ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <ChevronDown className="w-4 h-4 mr-2" />
                              )}
                              {loadingMore ? "Loading..." : `Load More (${total - orders.length} remaining)`}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* View Order Dialog */}
        <Dialog open={isViewOrderOpen} onOpenChange={setIsViewOrderOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
              <DialogDescription>Complete order information and line items</DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-6">
                {/* Order Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Customer Information</h3>
                      <div className="mt-2 text-sm">
                        <p>
                          <strong>Name:</strong> {selectedOrder.customerName}
                        </p>
                        <p>
                          <strong>Email:</strong> {selectedOrder.customerEmail}
                        </p>
                        <p>
                          <strong>Shipping:</strong> {selectedOrder.shippingAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Order Information</h3>
                      <div className="mt-2 text-sm">
                        <p>
                          <strong>Store:</strong> {selectedOrder.storeName}
                        </p>
                        <p>
                          <strong>Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString()}
                        </p>
                        <p>
                          <strong>Status:</strong>
                          <Badge className={`${getStatusColor(selectedOrder.status)} text-xs ml-2`}>
                            {selectedOrder.status}
                          </Badge>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Order Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="w-[80px]">Qty</TableHead>
                          <TableHead className="w-[100px]">Unit Price</TableHead>
                          <TableHead className="w-[100px]">Unit Cost</TableHead>
                          <TableHead className="w-[100px]">Item Profit</TableHead>
                          <TableHead className="w-[100px]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => {
                          const itemCost = (item as any).cost_price || 0
                          const itemProfit = (item.unit_price - itemCost) * item.quantity

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.sku}</TableCell>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-orange-600">${itemCost.toFixed(2)}</TableCell>
                              <TableCell className={itemProfit >= 0 ? "text-green-600" : "text-red-600"}>
                                ${itemProfit.toFixed(2)}
                              </TableCell>
                              <TableCell>${item.total_price.toFixed(2)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div></div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>
                          $
                          {(selectedOrder.totalAmount - selectedOrder.shippingCost - selectedOrder.taxAmount).toFixed(
                            2,
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>${selectedOrder.shippingCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>${selectedOrder.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span className="text-orange-600">
                          $
                          {selectedOrder.items
                            .reduce((sum, item) => sum + ((item as any).cost_price || 0) * item.quantity, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between font-medium text-base border-t pt-2">
                        <span>Total:</span>
                        <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-base">
                        <span>Profit:</span>
                        <span className={selectedOrder.profit >= 0 ? "text-green-600" : "text-red-600"}>
                          ${selectedOrder.profit.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
