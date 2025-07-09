"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Store,
  ShoppingCart,
  DollarSign,
  Eye,
  Settings,
  AlertCircle,
} from "lucide-react"
import { dataStore, type ShopifyOrder, type ShopifyStore } from "@/lib/store"

export default function ShopifyOrders() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all")
  const [isSyncing, setIsSyncing] = useState(false)

  // Load data on component mount
  useEffect(() => {
    setOrders(dataStore.getShopifyOrders())
    setStores(dataStore.getShopifyStores())
  }, [])

  const handleExport = () => {
    // Create CSV content with headers
    const csvContent = [
      [
        "Order Number",
        "Store",
        "Shopify Order ID",
        "Customer Name",
        "Customer Email",
        "Order Date",
        "Status",
        "Total Amount",
        "Shipping Cost",
        "Tax Amount",
        "Profit",
        "Items Count",
        "Shipping Address",
      ],
      ...filteredOrders.map((order) => [
        order.orderNumber,
        order.storeName,
        order.shopifyOrderId,
        order.customerName,
        order.customerEmail,
        new Date(order.orderDate).toLocaleDateString(),
        order.status,
        order.totalAmount.toFixed(2),
        order.shippingCost.toFixed(2),
        order.taxAmount.toFixed(2),
        order.profit.toFixed(2),
        order.items.length.toString(),
        order.shippingAddress,
      ]),
    ]

    // Convert to CSV string
    const csvString = csvContent.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    // Create and download file
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `shopify_orders_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleSyncAllOrders = async () => {
    setIsSyncing(true)
    try {
      const connectedStores = stores.filter((store) => store.status === "Connected")
      let totalNewOrders = 0

      for (const store of connectedStores) {
        try {
          // Update store status to show syncing
          dataStore.updateShopifyStore(store.id, { status: "Testing" })
          setStores(dataStore.getShopifyStores())

          // Sync orders from this store
          const newOrders = await syncStoreOrders(store)
          totalNewOrders += newOrders.length

          // Update store with successful sync
          dataStore.updateShopifyStore(store.id, {
            status: "Connected",
            lastSync: "Just now",
            totalOrders: store.totalOrders + newOrders.length,
          })
        } catch (error) {
          console.error(`Failed to sync orders for ${store.name}:`, error)
          dataStore.updateShopifyStore(store.id, { status: "Error" })
        }
      }

      // Refresh data
      setOrders(dataStore.getShopifyOrders())
      setStores(dataStore.getShopifyStores())

      alert(`Successfully synced ${totalNewOrders} new orders from ${connectedStores.length} stores`)
    } catch (error) {
      console.error("Sync failed:", error)
      alert("Failed to sync orders. Please try again.")
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSyncStoreOrders = async (storeId: string) => {
    const store = stores.find((s) => s.id === storeId)
    if (!store) return

    setIsSyncing(true)
    try {
      // Update store status to show syncing
      dataStore.updateShopifyStore(storeId, { status: "Testing" })
      setStores(dataStore.getShopifyStores())

      // Sync orders
      const newOrders = await syncStoreOrders(store)

      // Update store with new sync time and order count
      dataStore.updateShopifyStore(storeId, {
        status: "Connected",
        lastSync: "Just now",
        totalOrders: store.totalOrders + newOrders.length,
      })

      // Refresh data
      setOrders(dataStore.getShopifyOrders())
      setStores(dataStore.getShopifyStores())

      alert(`Successfully synced ${newOrders.length} new orders from ${store.name}`)
    } catch (error) {
      console.error("Sync failed:", error)
      dataStore.updateShopifyStore(storeId, { status: "Error" })
      setStores(dataStore.getShopifyStores())
      alert("Failed to sync orders. Please check your store connection.")
    } finally {
      setIsSyncing(false)
    }
  }

  const syncStoreOrders = async (store: ShopifyStore): Promise<ShopifyOrder[]> => {
    try {
      const res = await fetch("/api/shopify-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: store.shopifyDomain,
          accessToken: store.accessToken,
        }),
      })

      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Unknown error")

      // Transform Shopify orders to our format
      const transformedOrders = data.orders.map((shopifyOrder: any) => ({
        storeId: store.id,
        storeName: store.name,
        shopifyOrderId: shopifyOrder.id.toString(),
        orderNumber: shopifyOrder.order_number || shopifyOrder.name,
        customerName: shopifyOrder.customer
          ? `${shopifyOrder.customer.first_name || ""} ${shopifyOrder.customer.last_name || ""}`.trim()
          : "Unknown Customer",
        customerEmail: shopifyOrder.email || shopifyOrder.customer?.email || "",
        orderDate: shopifyOrder.created_at,
        status: shopifyOrder.fulfillment_status || "unfulfilled",
        totalAmount: Number.parseFloat(shopifyOrder.total_price || "0"),
        shippingCost: Number.parseFloat(shopifyOrder.shipping_lines?.[0]?.price || "0"),
        taxAmount: Number.parseFloat(shopifyOrder.total_tax || "0"),
        items:
          shopifyOrder.line_items?.map((item: any, index: number) => ({
            id: `item-${shopifyOrder.id}-${index}`,
            sku: item.sku || `unknown-${item.id}`,
            productName: item.title || item.name,
            quantity: item.quantity,
            unitPrice: Number.parseFloat(item.price || "0"),
            totalPrice: Number.parseFloat(item.price || "0") * item.quantity,
          })) || [],
        shippingAddress: shopifyOrder.shipping_address
          ? `${shopifyOrder.shipping_address.address1 || ""}, ${shopifyOrder.shipping_address.city || ""}, ${shopifyOrder.shipping_address.province || ""} ${shopifyOrder.shipping_address.zip || ""}`.trim()
          : "No address provided",
        profit: 0, // Will be calculated
      }))

      // Calculate profit for each order
      transformedOrders.forEach((order: any) => {
        order.profit = dataStore.calculateOrderProfit(order)
      })

      // Add orders to store
      const newOrders = dataStore.addShopifyOrders(transformedOrders)
      console.log(`Added ${newOrders.length} new orders from ${store.name}`)

      return newOrders
    } catch (err) {
      console.error("Order sync failed:", err)
      throw err
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "fulfilled":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "shipped":
        return "bg-purple-100 text-purple-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "unfulfilled":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStoreStatusColor = (status: string) => {
    switch (status) {
      case "Connected":
        return "bg-green-100 text-green-800"
      case "Error":
        return "bg-red-100 text-red-800"
      case "Testing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Filter orders based on search term and selected store
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      String(order.orderNumber).toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStore = selectedStoreId === "all" || order.storeId === selectedStoreId

    return matchesSearch && matchesStore
  })

  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalProfit = orders.reduce((sum, order) => sum + order.profit, 0)
  const connectedStores = stores.filter((s) => s.status === "Connected")

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Shopify Orders</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">From all stores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From Shopify stores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalProfit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Gross profit</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connected Stores</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{connectedStores.length}</div>
              <p className="text-xs text-muted-foreground">Active connections</p>
            </CardContent>
          </Card>
        </div>

        {/* Store Connections */}
        <Card>
          <CardHeader>
            <CardTitle>Store Connections</CardTitle>
            <CardDescription>Manage your Shopify store integrations and sync orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stores.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Stores Connected</h3>
                  <p className="text-muted-foreground mb-4">Connect your first Shopify store to start syncing orders</p>
                  <Button asChild>
                    <a href="/stores">Add Store</a>
                  </Button>
                </div>
              ) : (
                stores.map((store, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Store className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{store.name}</p>
                        <p className="text-sm text-muted-foreground">{store.shopifyDomain}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge className={getStoreStatusColor(store.status)}>{store.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Last sync: {store.lastSync}</p>
                        <p className="text-xs text-muted-foreground">{store.totalOrders} orders</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncStoreOrders(store.id)}
                        disabled={isSyncing || store.status !== "Connected"}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                        Sync
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href="/stores">
                          <Settings className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by store" />
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
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={handleSyncAllOrders} disabled={isSyncing || connectedStores.length === 0}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync All Orders"}
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Orders synced from your Shopify stores</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
                <p className="text-muted-foreground mb-4">
                  {orders.length === 0
                    ? "Sync your first orders from connected stores"
                    : "Try adjusting your search or filter criteria"}
                </p>
                {orders.length === 0 && connectedStores.length > 0 && (
                  <Button onClick={handleSyncAllOrders} disabled={isSyncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                    Sync Orders Now
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.storeName}</TableCell>
                      <TableCell>{order.customerName}</TableCell>
                      <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-green-600 font-medium">${order.profit.toFixed(2)}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
                              <DialogDescription>Complete order information and profit breakdown</DialogDescription>
                            </DialogHeader>
                            {selectedOrder && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Shopify Order ID</Label>
                                    <p className="text-sm text-muted-foreground">{selectedOrder.shopifyOrderId}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Store</Label>
                                    <p className="text-sm text-muted-foreground">{selectedOrder.storeName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Customer</Label>
                                    <p className="text-sm text-muted-foreground">{selectedOrder.customerName}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Email</Label>
                                    <p className="text-sm text-muted-foreground">{selectedOrder.customerEmail}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Status</Label>
                                    <Badge className={getStatusColor(selectedOrder.status)}>
                                      {selectedOrder.status}
                                    </Badge>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Order Date</Label>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(selectedOrder.orderDate).toLocaleString()}
                                    </p>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Items</Label>
                                  <div className="max-h-60 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>SKU</TableHead>
                                          <TableHead>Product</TableHead>
                                          <TableHead>Quantity</TableHead>
                                          <TableHead>Price</TableHead>
                                          <TableHead>Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedOrder.items.map((item, index) => (
                                          <TableRow key={index}>
                                            <TableCell>{item.sku}</TableCell>
                                            <TableCell>{item.productName}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                                            <TableCell>${item.totalPrice.toFixed(2)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Shipping Address</Label>
                                    <p className="text-sm text-muted-foreground">{selectedOrder.shippingAddress}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span>Subtotal:</span>
                                      <span>
                                        $
                                        {(
                                          selectedOrder.totalAmount -
                                          selectedOrder.shippingCost -
                                          selectedOrder.taxAmount
                                        ).toFixed(2)}
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
                                    <div className="flex justify-between font-medium">
                                      <span>Total:</span>
                                      <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-green-600 font-medium">
                                      <span>Profit:</span>
                                      <span>${selectedOrder.profit.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
