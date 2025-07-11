"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DateRangePicker } from "@/components/date-range-picker"
import { ShoppingCart, DollarSign, TrendingUp, Package, Search, RefreshCw, Download, Eye, Users } from "lucide-react"
import { supabaseStore, type ShopifyOrder } from "@/lib/supabase-store"

export default function ShopifyOrders() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [filteredOrders, setFilteredOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    filterOrders()
  }, [orders, searchTerm, dateRange])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await supabaseStore.getShopifyOrders()
      console.log("Loaded orders:", data.length)
      setOrders(data)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterOrders = () => {
    let filtered = orders

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(term) ||
          order.customerName.toLowerCase().includes(term) ||
          order.customerEmail.toLowerCase().includes(term),
      )
    }

    // Filter by date range
    if (dateRange.from || dateRange.to) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.orderDate)
        if (dateRange.from && orderDate < dateRange.from) return false
        if (dateRange.to && orderDate > dateRange.to) return false
        return true
      })
    }

    setFilteredOrders(filtered)
  }

  const exportToCSV = () => {
    const headers = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Order Date",
      "Status",
      "Items Count",
      "Total Amount",
      "Tax Amount",
      "Net Amount",
    ]

    const rows = filteredOrders.map((order) => [
      order.orderNumber,
      order.customerName,
      order.customerEmail,
      new Date(order.orderDate).toLocaleDateString(),
      order.status,
      order.items.length.toString(),
      (order.total_amount || 0).toFixed(2),
      (order.tax_amount || 0).toFixed(2),
      ((order.total_amount || 0) - (order.tax_amount || 0)).toFixed(2),
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `shopify_orders_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "fulfilled":
        return "default"
      case "pending":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "refunded":
        return "outline"
      default:
        return "secondary"
    }
  }

  // Calculate summary statistics
  const totalOrders = filteredOrders.length
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0)
  const totalTax = filteredOrders.reduce((sum, order) => sum + (order.tax_amount || 0), 0)
  const netRevenue = totalRevenue - totalTax
  const totalItems = filteredOrders.reduce((sum, order) => sum + order.items.length, 0)
  const uniqueCustomers = new Set(filteredOrders.map((order) => order.customerEmail)).size

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 items-center gap-2 border-b px-4">
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
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="h-5 w-5" />
          <span className="hidden sm:inline">Shopify Orders</span>
          <span className="sm:hidden">Orders</span>
        </h1>
      </header>

      <div className="flex-1 space-y-4 p-4 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Orders</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalOrders}</p>
                </div>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalRevenue.toLocaleString()} лв</p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Net Revenue</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{netRevenue.toLocaleString()} лв</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Items</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalItems}</p>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Customers</p>
                  <p className="text-lg sm:text-2xl font-bold">{uniqueCustomers}</p>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Avg Order</p>
                  <p className="text-lg sm:text-2xl font-bold">
                    {totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0} лв
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-full sm:w-[300px]"
                placeholder="Search orders, customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filter by date range"
              className="w-full sm:w-auto"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadOrders} className="flex-1 sm:flex-none bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="flex-1 sm:flex-none bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Orders</CardTitle>
            <CardDescription className="text-sm">
              Showing {filteredOrders.length} of {orders.length} orders
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Order Number</TableHead>
                    <TableHead className="min-w-[150px]">Customer</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">Date</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="text-right min-w-[60px] hidden md:table-cell">Items</TableHead>
                    <TableHead className="text-right min-w-[100px]">Total</TableHead>
                    <TableHead className="text-center min-w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-xs sm:text-sm">{order.orderNumber}</TableCell>
                      <TableCell className="min-w-0">
                        <div className="space-y-1">
                          <div className="font-medium text-xs sm:text-sm truncate" title={order.customerName}>
                            {order.customerName}
                          </div>
                          <div
                            className="text-xs text-muted-foreground truncate hidden sm:block"
                            title={order.customerEmail}
                          >
                            {order.customerEmail}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)} className="text-xs">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">
                        {order.items.length}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs sm:text-sm">
                        {(order.total_amount || 0).toFixed(2)} лв
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedOrder(order)
                            setIsViewOrderOpen(true)
                          }}
                          className="h-8 w-8"
                        >
                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredOrders.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm || dateRange.from || dateRange.to
                    ? "No orders match your filters."
                    : "No orders found. Import orders from Shopify to get started."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Order Dialog */}
        <Dialog open={isViewOrderOpen} onOpenChange={setIsViewOrderOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                {selectedOrder && `Order ${selectedOrder.orderNumber} - ${selectedOrder.customerName}`}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Order Info */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Order Number</label>
                      <p className="text-sm">{selectedOrder.orderNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date</label>
                      <p className="text-sm">{new Date(selectedOrder.orderDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge variant={getStatusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Store</label>
                      <p className="text-sm">{selectedOrder.storeName}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Customer Information</h3>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <p className="text-sm">{selectedOrder.customerName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-sm">{selectedOrder.customerEmail}</p>
                      </div>
                      {selectedOrder.shippingAddress && (
                        <div className="sm:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Shipping Address</label>
                          <p className="text-sm whitespace-pre-line">{selectedOrder.shippingAddress}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Order Items</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-sm">{item.sku}</TableCell>
                              <TableCell className="text-sm">{item.product_name}</TableCell>
                              <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-right text-sm">
                                {((item.total_price || 0) / item.quantity).toFixed(2)} лв
                              </TableCell>
                              <TableCell className="text-right font-medium text-sm">
                                {(item.total_price || 0).toFixed(2)} лв
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Order Totals */}
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>
                          {((selectedOrder.total_amount || 0) - (selectedOrder.tax_amount || 0)).toFixed(2)} лв
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax:</span>
                        <span>{(selectedOrder.tax_amount || 0).toFixed(2)} лв</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>{(selectedOrder.total_amount || 0).toFixed(2)} лв</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setIsViewOrderOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
