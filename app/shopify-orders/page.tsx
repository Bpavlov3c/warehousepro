"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Package, DollarSign, TrendingUp, Calendar, Eye, RefreshCw } from "lucide-react"
import { supabaseStore, type ShopifyOrder } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function ShopifyOrders() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [isViewOrderOpen, setIsViewOrderOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const ordersData = await supabaseStore.getShopifyOrders()
        setOrders(ordersData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load orders")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleSyncOrders = async () => {
    try {
      setSyncing(true)
      // This would typically call your Shopify API sync endpoint
      const response = await fetch("/api/shopify-orders", {
        method: "POST",
      })

      if (response.ok) {
        // Refresh the orders list
        const ordersData = await supabaseStore.getShopifyOrders()
        setOrders(ordersData)
        alert("Orders synced successfully!")
      } else {
        throw new Error("Failed to sync orders")
      }
    } catch (error) {
      console.error("Error syncing orders:", error)
      alert("Error syncing orders. Please try again.")
    } finally {
      setSyncing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "fulfilled":
      case "shipped":
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "refunded":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredOrders = orders.filter(
    (order) =>
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.status?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const calculateOrderStats = () => {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
    const totalProfit = orders.reduce((sum, order) => sum + (order.profit || 0), 0)
    const pendingOrders = orders.filter(
      (order) =>
        order.status && !["fulfilled", "shipped", "delivered", "cancelled"].includes(order.status.toLowerCase()),
    ).length

    return { totalRevenue, totalProfit, pendingOrders }
  }

  const { totalRevenue, totalProfit, pendingOrders } = calculateOrderStats()

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-2">
            <SidebarTrigger />
            <h2 className="text-3xl font-bold tracking-tight">Shopify Orders</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading orders...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-2">
            <SidebarTrigger />
            <h2 className="text-3xl font-bold tracking-tight">Shopify Orders</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center space-x-2">
          <SidebarTrigger />
          <h2 className="text-3xl font-bold tracking-tight">Shopify Orders</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleSyncOrders} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Orders"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total Orders</div>
            </div>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total Revenue</div>
            </div>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total Profit</div>
            </div>
            <div className="text-2xl font-bold">${totalProfit.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Pending Orders</div>
            </div>
            <div className="text-2xl font-bold">{pendingOrders}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.orderNumber || "N/A"}</TableCell>
                  <TableCell>{order.storeName || "N/A"}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.customerName || "N/A"}</div>
                      {order.customerEmail && (
                        <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "N/A"}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status || "unknown")}>{order.status || "Unknown"}</Badge>
                  </TableCell>
                  <TableCell>{order.items?.length || 0} items</TableCell>
                  <TableCell>${(order.totalAmount || 0).toFixed(2)}</TableCell>
                  <TableCell className={`font-medium ${(order.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    ${(order.profit || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order)
                        setIsViewOrderOpen(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Order Dialog */}
      <Dialog open={isViewOrderOpen} onOpenChange={setIsViewOrderOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>View the complete details of this Shopify order.</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Order Number</h3>
                  <p className="text-lg font-medium">{selectedOrder.orderNumber || "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
                  <Badge className={getStatusColor(selectedOrder.status || "unknown")}>
                    {selectedOrder.status || "Unknown"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Store</h3>
                  <p className="font-medium">{selectedOrder.storeName || "N/A"}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Order Date</h3>
                  <p>{selectedOrder.orderDate ? new Date(selectedOrder.orderDate).toLocaleDateString() : "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Customer</h3>
                  <p className="font-medium">{selectedOrder.customerName || "N/A"}</p>
                  {selectedOrder.customerEmail && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Shipping Address</h3>
                  <p className="text-sm">{selectedOrder.shippingAddress || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Subtotal</h3>
                  <p className="text-lg font-medium">
                    $
                    {(
                      (selectedOrder.totalAmount || 0) -
                      (selectedOrder.taxAmount || 0) -
                      (selectedOrder.shippingCost || 0)
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Shipping</h3>
                  <p className="text-lg font-medium">${(selectedOrder.shippingCost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Tax</h3>
                  <p className="text-lg font-medium">${(selectedOrder.taxAmount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Total</h3>
                  <p className="text-lg font-medium">${(selectedOrder.totalAmount || 0).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Order Items</h3>
                  <div className="text-sm text-muted-foreground">
                    Profit:{" "}
                    <span
                      className={`font-medium ${(selectedOrder.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      ${(selectedOrder.profit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Price</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Item Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item, index) => {
                      const costPrice = (item as any).cost_price || 0
                      const itemProfit = (item.total_price || 0) - costPrice * (item.quantity || 0)

                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.sku || "N/A"}</TableCell>
                          <TableCell>{item.product_name || "N/A"}</TableCell>
                          <TableCell>{item.quantity || 0}</TableCell>
                          <TableCell>${(item.unit_price || 0).toFixed(2)}</TableCell>
                          <TableCell>${(item.total_price || 0).toFixed(2)}</TableCell>
                          <TableCell>${costPrice.toFixed(2)}</TableCell>
                          <TableCell className={`font-medium ${itemProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ${itemProfit.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewOrderOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
