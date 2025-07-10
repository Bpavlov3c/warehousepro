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
import { Progress } from "@/components/ui/progress"
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Store,
  ShoppingCart,
  DollarSign,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { supabaseStore, type ShopifyOrder, type ShopifyStore } from "@/lib/supabase-store"

export default function ShopifyOrders() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all")
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, store: "" })
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [ordersData, storesData] = await Promise.all([
          supabaseStore.getShopifyOrders(),
          supabaseStore.getShopifyStores(),
        ])
        setOrders(ordersData)
        setStores(storesData)
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }
    loadData()
  }, [])

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

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

  const syncAllOrders = async () => {
    setIsSyncing(true)
    setSyncProgress({ current: 0, total: 0, store: "" })

    try {
      const storesData = await supabaseStore.getShopifyStores()
      setStores(storesData)
      const connectedStores = storesData.filter((store) => store.status === "Connected")
      let totalNewOrders = 0

      for (const store of connectedStores) {
        try {
          setSyncProgress({ current: 0, total: 0, store: store.name })

          // Update store status to show syncing
          await supabaseStore.updateShopifyStore(store.id, { status: "Testing" })
          const freshStores1 = await supabaseStore.getShopifyStores()
          setStores(freshStores1)

          // Sync orders from this store with progress tracking
          const newOrders = await syncStoreOrdersWithProgress(store)
          totalNewOrders += newOrders.length

          // Update store with successful sync
          await supabaseStore.updateShopifyStore(store.id, {
            status: "Connected",
            lastSync: new Date().toISOString(),
            totalOrders: store.totalOrders + newOrders.length,
          })
          const freshStores2 = await supabaseStore.getShopifyStores()
          setStores(freshStores2)
        } catch (error) {
          console.error(`Failed to sync orders for ${store.name}:`, error)
          await supabaseStore.updateShopifyStore(store.id, { status: "Error" })
          const freshStores3 = await supabaseStore.getShopifyStores()
          setStores(freshStores3)
        }
      }

      // Refresh data
      setOrders(await supabaseStore.getShopifyOrders())
      setStores(await supabaseStore.getShopifyStores())

      alert(`Successfully synced ${totalNewOrders} new orders from ${connectedStores.length} stores`)
    } catch (error) {
      console.error("Sync failed:", error)
      alert("Failed to sync orders. Please try again.")
    } finally {
      setIsSyncing(false)
      setSyncProgress({ current: 0, total: 0, store: "" })
    }
  }

  const syncStoreOrdersWithProgress = async (store: ShopifyStore): Promise<ShopifyOrder[]> => {
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
        store_id: store.id,
        shopify_order_id: shopifyOrder.id.toString(),
        order_number: shopifyOrder.order_number || shopifyOrder.name,
        customer_name: shopifyOrder.customer
          ? `${shopifyOrder.customer.first_name || ""} ${shopifyOrder.customer.last_name || ""}`.trim()
          : "Unknown Customer",
        customer_email: shopifyOrder.email || shopifyOrder.customer?.email || "",
        order_date: shopifyOrder.created_at,
        status: shopifyOrder.fulfillment_status || "unfulfilled",
        total_amount: Number.parseFloat(shopifyOrder.total_price || "0"),
        shipping_cost: Number.parseFloat(shopifyOrder.shipping_lines?.[0]?.price || "0"),
        tax_amount: Number.parseFloat(shopifyOrder.total_tax || "0"),
        items:
          shopifyOrder.line_items?.map((item: any, index: number) => ({
            sku: item.sku || `unknown-${item.id}`,
            product_name: item.title || item.name,
            quantity: item.quantity,
            unit_price: Number.parseFloat(item.price || "0"),
            total_price: Number.parseFloat(item.price || "0") * item.quantity,
          })) || [],
        shipping_address: shopifyOrder.shipping_address
          ? `${shopifyOrder.shipping_address.address1 || ""}, ${shopifyOrder.shipping_address.city || ""}, ${shopifyOrder.shipping_address.province || ""} ${shopifyOrder.shipping_address.zip || ""}`.trim()
          : "No address provided",
      }))

      const newOrders = await supabaseStore.addShopifyOrders(transformedOrders)
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

  const getOrderItemsForDisplay = (order: ShopifyOrder) =>
    // @ts-ignore – property added in QuickEdit above
    (order as any).shopify_order_items ?? order.items

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
              <div className="text-2xl font-bold">{totalRevenue.toLocaleString()} лв</div>
              <p className="text-xs text-muted-foreground">From Shopify stores</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Profit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProfit.toLocaleString()} лв</div>
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

        {/* Sync Progress */}
        {isSyncing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Syncing Orders</CardTitle>
              <CardDescription>{syncProgress.store && `Syncing from ${syncProgress.store}...`}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {syncProgress.current}
                    {syncProgress.total > 0 && `/${syncProgress.total}`} orders
                  </span>
                </div>
                <Progress
                  value={syncProgress.total > 0 ? (syncProgress.current / syncProgress.total) * 100 : 0}
                  className="w-full"
                />
              </div>
            </CardContent>
          </Card>
        )}

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
            <Button size="sm" onClick={() => syncAllOrders()} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync All Orders"}
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Orders synced from your Shopify stores - click to expand and view items</CardDescription>
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
                {orders.length === 0 && (
                  <Button onClick={() => syncAllOrders()} disabled={isSyncing}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                    Sync Orders Now
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Order ID</TableHead>
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
                    <>
                      {/* Main Order Row */}
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleOrderExpansion(order.id)}
                            className="p-0 h-6 w-6"
                          >
                            {expandedOrders.has(order.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium" onClick={() => toggleOrderExpansion(order.id)}>
                          {order.orderNumber}
                        </TableCell>
                        <TableCell onClick={() => toggleOrderExpansion(order.id)}>{order.storeName}</TableCell>
                        <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                          <div>
                            <div className="font-medium">{order.customerName}</div>
                            <div className="text-sm text-muted-foreground">{order.customerEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                          {new Date(order.orderDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                          <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                          <Badge variant="secondary">{order.items.length} items</Badge>
                        </TableCell>
                        <TableCell onClick={() => toggleOrderExpansion(order.id)}>
                          {order.totalAmount.toFixed(2)} лв
                        </TableCell>
                        <TableCell
                          className="text-green-600 font-medium"
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          {order.profit.toFixed(2)} лв
                        </TableCell>
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
                                            <TableHead>Sale Price</TableHead>
                                            <TableHead>Cost Price</TableHead>
                                            <TableHead>Total Sale</TableHead>
                                            <TableHead>Item Profit</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {getOrderItemsForDisplay(selectedOrder).map((item, index) => {
                                            const totalCost = item.cost_price * item.quantity
                                            const itemProfit = item.total_price - totalCost

                                            return (
                                              <TableRow key={index}>
                                                <TableCell>{item.sku}</TableCell>
                                                <TableCell>{item.product_name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>{item.unit_price.toFixed(2)} лв</TableCell>
                                                <TableCell>
                                                  {item.cost_price > 0 ? `${item.cost_price.toFixed(2)} лв` : "N/A"}
                                                </TableCell>
                                                <TableCell>{item.total_price.toFixed(2)} лв</TableCell>
                                                <TableCell
                                                  className={itemProfit >= 0 ? "text-green-600" : "text-red-600"}
                                                >
                                                  {item.cost_price > 0 ? `${itemProfit.toFixed(2)} лв` : "N/A"}
                                                </TableCell>
                                              </TableRow>
                                            )
                                          })}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm font-medium">Shipping Address</Label>
                                      <p className="text-sm text-muted-foreground">{selectedOrder.shipping_address}</p>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>
                                          {(
                                            selectedOrder.total_amount -
                                            selectedOrder.shipping_cost -
                                            selectedOrder.tax_amount
                                          ).toFixed(2)}{" "}
                                          лв
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Shipping:</span>
                                        <span>{selectedOrder.shipping_cost.toFixed(2)} лв</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span>{selectedOrder.tax_amount.toFixed(2)} лв</span>
                                      </div>
                                      <div className="flex justify-between font-medium">
                                        <span>Total:</span>
                                        <span>{selectedOrder.total_amount.toFixed(2)} лв</span>
                                      </div>
                                      <div className="flex justify-between text-green-600 font-medium">
                                        <span>Profit:</span>
                                        <span>{selectedOrder.profit.toFixed(2)} лв</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Items Row */}
                      {expandedOrders.has(order.id) && (
                        <TableRow>
                          <TableCell colSpan={10} className="p-0">
                            <div className="bg-muted/30 p-4 border-t">
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-medium text-sm">Order Items ({order.items.length})</h4>
                                  <div className="text-sm text-muted-foreground">
                                    Shipping: {order.shippingCost.toFixed(2)} лв | Tax: {order.taxAmount.toFixed(2)} лв
                                  </div>
                                </div>

                                <div className="grid gap-2">
                                  {getOrderItemsForDisplay(order).map((item, index) => {
                                    const totalCost = item.cost_price * item.quantity
                                    const itemProfit = item.total_price - totalCost

                                    return (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between bg-background p-3 rounded-md border"
                                      >
                                        <div className="flex-1">
                                          <div className="font-medium">{item.product_name}</div>
                                          <div className="text-sm text-muted-foreground">SKU: {item.sku}</div>
                                        </div>
                                        <div className="flex items-center space-x-4 text-sm">
                                          <div className="text-center">
                                            <div className="font-medium">{item.quantity}</div>
                                            <div className="text-muted-foreground">Qty</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-medium">{item.unit_price.toFixed(2)} лв</div>
                                            <div className="text-muted-foreground">Sale Price</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-medium">
                                              {item.cost_price > 0 ? `${item.cost_price.toFixed(2)} лв` : "N/A"}
                                            </div>
                                            <div className="text-muted-foreground">Cost Price</div>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-medium">{item.total_price.toFixed(2)} лв</div>
                                            <div className="text-muted-foreground">Total Sale</div>
                                          </div>
                                          <div className="text-center">
                                            <div
                                              className={`font-medium ${itemProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                                            >
                                              {item.cost_price > 0 ? `${itemProfit.toFixed(2)} лв` : "N/A"}
                                            </div>
                                            <div className="text-muted-foreground">Item Profit</div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>

                                {/* Order Profit Summary */}
                                <div className="mt-3 pt-3 border-t bg-background rounded-md p-3">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <div className="flex justify-between">
                                        <span>Subtotal (before tax/shipping):</span>
                                        <span>
                                          {(order.totalAmount - order.shippingCost - order.taxAmount).toFixed(2)} лв
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Total Cost of Items:</span>
                                        <span>
                                          {getOrderItemsForDisplay(order)
                                            .reduce((sum, item) => sum + item.cost_price * item.quantity, 0)
                                            .toFixed(2)}{" "}
                                          лв
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="flex justify-between">
                                        <span>Shipping:</span>
                                        <span>{order.shippingCost.toFixed(2)} лв</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span>{order.taxAmount.toFixed(2)} лв</span>
                                      </div>
                                      <div className="flex justify-between font-medium text-green-600 border-t pt-2">
                                        <span>Net Profit:</span>
                                        <span>{order.profit.toFixed(2)} лв</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {order.shippingAddress && (
                                  <div className="mt-3 pt-3 border-t">
                                    <div className="text-sm">
                                      <span className="font-medium">Shipping Address: </span>
                                      <span className="text-muted-foreground">{order.shippingAddress}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
