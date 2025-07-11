"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ShoppingCart, DollarSign, TrendingUp, ChevronDown, ChevronRight, Package, User, MapPin } from "lucide-react"
import { supabaseStore, type ShopifyOrder } from "@/lib/supabase-store"

export default function ShopifyOrdersPage() {
  const [orders, setOrders] = useState<ShopifyOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const data = await supabaseStore.getShopifyOrders()
      setOrders(data)
    } catch (error) {
      console.error("Error loading orders:", error)
    } finally {
      setLoading(false)
    }
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

  const getOrderStatusBadge = (status: string) => {
    const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
      refunded: "destructive",
    }
    return <Badge variant={statusColors[status] || "outline"}>{status}</Badge>
  }

  const calculateOrderProfit = (order: ShopifyOrder) => {
    return order.items.reduce((total, item) => {
      const profit = (item.unitPrice - (item.unitCost || 0)) * item.quantity
      return total + profit
    }, 0)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculate summary metrics
  const totalOrders = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalProfit = orders.reduce((sum, order) => sum + calculateOrderProfit(order), 0)

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
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <ShoppingCart className="h-5 w-5" />
          Shopify Orders
        </h1>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Gross sales</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</div>
              <p className="text-xs text-muted-foreground">After costs</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
            <CardDescription>Click on any order to see detailed information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orders.map((order) => {
                const isExpanded = expandedOrders.has(order.id)
                const orderProfit = calculateOrderProfit(order)

                return (
                  <Collapsible key={order.id} open={isExpanded} onOpenChange={() => toggleOrderExpansion(order.id)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-4">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div>
                            <div className="font-medium">Order #{order.orderNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.customerName} • {new Date(order.orderDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
                            <div className="text-sm text-green-600">Profit: {formatCurrency(orderProfit)}</div>
                          </div>
                          {getOrderStatusBadge(order.status)}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-6">
                        {/* Order Information */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <ShoppingCart className="h-4 w-4" />
                                Order Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Store:</span>
                                <span>{order.storeName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shopify ID:</span>
                                <span className="font-mono">{order.shopifyOrderId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Date:</span>
                                <span>{new Date(order.orderDate).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                {getOrderStatusBadge(order.status)}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                Financial Summary
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span>{formatCurrency(order.subtotal)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Shipping:</span>
                                <span>{formatCurrency(order.shippingCost)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Tax:</span>
                                <span>{formatCurrency(order.taxAmount)}</span>
                              </div>
                              <div className="flex justify-between font-medium">
                                <span>Total:</span>
                                <span>{formatCurrency(order.totalAmount)}</span>
                              </div>
                              <div className="flex justify-between font-medium text-green-600">
                                <span>Profit:</span>
                                <span>{formatCurrency(orderProfit)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Customer Information */}
                        <div className="grid gap-4 md:grid-cols-2">
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Customer Information
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span>{order.customerName}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span>{order.customerEmail}</span>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Shipping Address
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm">
                              <div className="space-y-1">
                                <div>{order.shippingAddress.address1}</div>
                                {order.shippingAddress.address2 && <div>{order.shippingAddress.address2}</div>}
                                <div>
                                  {order.shippingAddress.city}, {order.shippingAddress.province}{" "}
                                  {order.shippingAddress.zip}
                                </div>
                                <div>{order.shippingAddress.country}</div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Order Items */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              Order Items ({order.items.length})
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>SKU</TableHead>
                                  <TableHead>Product</TableHead>
                                  <TableHead className="text-right">Qty</TableHead>
                                  <TableHead className="text-right">Unit Price</TableHead>
                                  <TableHead className="text-right">Unit Cost</TableHead>
                                  <TableHead className="text-right">Item Profit</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {order.items.map((item, index) => {
                                  const itemProfit = (item.unitPrice - (item.unitCost || 0)) * item.quantity
                                  const itemTotal = item.unitPrice * item.quantity

                                  return (
                                    <TableRow key={index}>
                                      <TableCell className="font-mono">{item.sku}</TableCell>
                                      <TableCell>{item.productName}</TableCell>
                                      <TableCell className="text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                      <TableCell className="text-right">
                                        {item.unitCost ? formatCurrency(item.unitCost) : "N/A"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <span
                                          className={
                                            itemProfit > 0
                                              ? "text-green-600"
                                              : itemProfit < 0
                                                ? "text-red-600"
                                                : "text-gray-500"
                                          }
                                        >
                                          {formatCurrency(itemProfit)}
                                        </span>
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(itemTotal)}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}

              {orders.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No orders found</h3>
                  <p className="text-muted-foreground">Orders will appear here once they're imported from Shopify</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
