"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ShoppingCart, DollarSign, TrendingUp, Users, Eye, Download, RefreshCw } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { ShopifyOrder } from "@/lib/supabase-store"

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
        <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse" />
        <div className="h-6 bg-gray-200 rounded w-12 animate-pulse" />
      </div>
      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
    </div>
  </Card>
)

const TableSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            {["Order #", "Customer", "Store", "Date", "Status", "Total", "Profit", "Actions"].map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, i) => (
            <TableRow key={i} className="h-12">
              {Array.from({ length: 8 }).map((__, j) => (
                <TableCell key={j}>
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

/* --------------------------- main component --------------------------- */

interface Props {
  initialOrders: ShopifyOrder[]
}

export default function ShopifyOrdersClient({ initialOrders }: Props) {
  const [orders, setOrders] = useState<ShopifyOrder[]>(initialOrders)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearch = useDebounce(searchTerm)
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  /* ------------------------- helpers / derived ------------------------ */

  const filtered = useMemo(() => {
    if (!debouncedSearch) return orders
    const lo = debouncedSearch.toLowerCase()
    return orders.filter(
      (o) =>
        o.orderNumber?.toLowerCase().includes(lo) ||
        o.customerName?.toLowerCase().includes(lo) ||
        o.customerEmail?.toLowerCase().includes(lo) ||
        o.storeName?.toLowerCase().includes(lo),
    )
  }, [orders, debouncedSearch])

  const stats = useMemo(() => {
    const totalRevenue = filtered.reduce((s, o) => s + (o.totalAmount || 0), 0)
    const totalProfit = filtered.reduce((s, o) => s + (o.profit || 0), 0)
    const avg = filtered.length ? totalRevenue / filtered.length : 0
    return {
      count: filtered.length,
      revenue: totalRevenue,
      profit: totalProfit,
      avg,
    }
  }, [filtered])

  const statusColor = useCallback((status: string) => {
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

  /* ---------------------------- actions ------------------------------- */

  const refreshOrders = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/shopify-orders/list")
      if (!res.ok) throw new Error("Failed to fetch")
      const data: ShopifyOrder[] = await res.json()
      setOrders(data)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  const exportCsv = useCallback(() => {
    const headers = ["Order #", "Customer", "Email", "Store", "Date", "Status", "Total", "Profit", "Items"]
    const rows = filtered.map((o) => [
      o.orderNumber,
      o.customerName,
      o.customerEmail,
      o.storeName,
      new Date(o.orderDate).toLocaleDateString(),
      o.status,
      o.totalAmount.toFixed(2),
      o.profit.toFixed(2),
      o.items.length,
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "shopify-orders.csv"
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered])

  /* ------------------------------ UI ---------------------------------- */

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">Error: {error}</p>
        <Button onClick={refreshOrders} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* header */}
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <h1 className="text-lg font-semibold flex-1">Shopify Orders</h1>
        <Button variant="ghost" size="icon" onClick={refreshOrders} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} />
        </Button>
        <Button variant="ghost" size="icon" onClick={exportCsv} disabled={loading}>
          <Download />
        </Button>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8">
        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Orders</p>
                  <p className="text-lg font-bold">{stats.count}</p>
                </div>
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </Card>
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Revenue</p>
                  <p className="text-lg font-bold">${stats.revenue.toFixed(2)}</p>
                </div>
                <DollarSign className="w-5 h-5 text-green-600" />
              </Card>
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Profit</p>
                  <p className="text-lg font-bold">${stats.profit.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </Card>
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Avg Order</p>
                  <p className="text-lg font-bold">${stats.avg.toFixed(2)}</p>
                </div>
                <Users className="w-5 h-5 text-purple-600" />
              </Card>
            </>
          )}
        </div>

        {/* search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {loading ? (
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
          ) : filtered.length === 0 ? (
            <Card className="p-6 text-center">
              <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No orders found." : "No orders yet."}</p>
            </Card>
          ) : (
            filtered.map((order) => (
              <Card key={order.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{order.orderNumber}</h3>
                    <p className="text-sm text-gray-600 truncate">{order.customerName}</p>
                    <p className="text-xs text-gray-500">{order.storeName}</p>
                  </div>
                  <Badge className={`${statusColor(order.status)} text-xs`}>{order.status}</Badge>
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
                    setIsDialogOpen(true)
                  }}
                  className="w-full"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table */}
        {loading ? (
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        ) : (
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Order #", "Customer", "Store", "Date", "Status", "Total", "Profit", "Actions"].map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <ShoppingCart className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{searchTerm ? "No orders found." : "No orders yet."}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.orderNumber}</TableCell>
                        <TableCell>
                          <div className="font-medium">{o.customerName}</div>
                          <div className="text-sm text-gray-500 truncate max-w-[150px]">{o.customerEmail}</div>
                        </TableCell>
                        <TableCell>{o.storeName}</TableCell>
                        <TableCell>{new Date(o.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge className={`${statusColor(o.status)} text-xs`}>{o.status}</Badge>
                        </TableCell>
                        <TableCell>${o.totalAmount.toFixed(2)}</TableCell>
                        <TableCell className={o.profit >= 0 ? "text-green-600" : "text-red-600"}>
                          ${o.profit.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View"
                            onClick={() => {
                              setSelectedOrder(o)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Order Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                          <Badge className={`${statusColor(selectedOrder.status)} text-xs ml-2`}>
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
                          <TableHead className="w-[100px]">Total</TableHead>
                          <TableHead className="w-[100px]">Item Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => {
                          const costPrice = (item as any).cost_price || 0
                          const itemProfit = (item.total_price || 0) - costPrice * (item.quantity || 0)

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.sku}</TableCell>
                              <TableCell>{item.product_name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                              <TableCell className="text-orange-600 font-medium">${costPrice.toFixed(2)}</TableCell>
                              <TableCell>${item.total_price.toFixed(2)}</TableCell>
                              <TableCell className={itemProfit >= 0 ? "text-green-600" : "text-red-600"}>
                                ${itemProfit.toFixed(2)}
                              </TableCell>
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
                      <div className="flex justify-between font-medium text-base border-t pt-2">
                        <span>Total:</span>
                        <span>${selectedOrder.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-base">
                        <span>Total Cost:</span>
                        <span className="text-orange-600">
                          $
                          {selectedOrder.items
                            .reduce((sum, item) => sum + ((item as any).cost_price || 0) * item.quantity, 0)
                            .toFixed(2)}
                        </span>
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

            <div className="flex justify-end mt-6">
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
