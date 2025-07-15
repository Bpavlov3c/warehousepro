"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Package, DollarSign, TrendingDown, Users, Eye, Download, Plus } from "lucide-react"
import { supabaseStore, type Return } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Skeleton components
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
            <TableHead>Return #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Order #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Refund</TableHead>
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
                <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [isViewReturnOpen, setIsViewReturnOpen] = useState(false)
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // New return form state
  const [newReturn, setNewReturn] = useState({
    customer_name: "",
    customer_email: "",
    order_number: "",
    return_date: new Date().toISOString().split("T")[0],
    status: "Pending" as const,
    notes: "",
    items: [
      {
        sku: "",
        product_name: "",
        quantity: 1,
        condition: "Good" as const,
        reason: "Defective" as const,
        total_refund: 0,
        unit_price: 0,
      },
    ],
    total_refund: 0,
  })

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Load returns
  const loadReturns = useCallback(async () => {
    try {
      setLoading(true)
      const data = await supabaseStore.getReturns()
      setReturns(data)
    } catch (err) {
      console.error("Error loading returns:", err)
      setError("Failed to load returns")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReturns()
  }, [loadReturns])

  // Memoized filtered returns
  const filteredReturns = useMemo(() => {
    if (!debouncedSearchTerm) return returns

    return returns.filter(
      (returnItem) =>
        returnItem.return_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        returnItem.customer_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        (returnItem.customer_email &&
          returnItem.customer_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (returnItem.order_number && returnItem.order_number.toLowerCase().includes(debouncedSearchTerm.toLowerCase())),
    )
  }, [returns, debouncedSearchTerm])

  // Memoized metrics
  const metrics = useMemo(() => {
    const totalReturns = filteredReturns.length
    const totalRefund = filteredReturns.reduce((sum, returnItem) => sum + (returnItem.total_refund || 0), 0)
    const avgRefund = totalReturns > 0 ? totalRefund / totalReturns : 0
    const pendingReturns = filteredReturns.filter((r) => r.status === "Pending").length

    return {
      totalReturns,
      totalRefund,
      avgRefund,
      pendingReturns,
    }
  }, [filteredReturns])

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "accepted":
        return "bg-green-100 text-green-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }, [])

  // Handle status change
  const handleStatusChange = useCallback(
    async (returnId: string, newStatus: string) => {
      try {
        await supabaseStore.updateReturn(returnId, { status: newStatus as any })
        await loadReturns() // Reload to get updated data
      } catch (err) {
        console.error("Error updating return status:", err)
        setError("Failed to update return status")
      }
    },
    [loadReturns],
  )

  const exportToCSV = useCallback(() => {
    const headers = [
      "Return Number",
      "Customer Name",
      "Customer Email",
      "Order Number",
      "Return Date",
      "Status",
      "Total Refund",
      "Items Count",
    ]

    const csvData = filteredReturns.map((returnItem) => [
      returnItem.return_number,
      returnItem.customer_name,
      returnItem.customer_email || "",
      returnItem.order_number || "",
      new Date(returnItem.return_date).toLocaleDateString(),
      returnItem.status,
      (returnItem.total_refund || 0).toFixed(2),
      returnItem.return_items.length,
    ])

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `returns-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [filteredReturns])

  // Handle new return form submission
  const handleCreateReturn = useCallback(async () => {
    try {
      await supabaseStore.createReturn(newReturn)
      setIsNewReturnOpen(false)
      setNewReturn({
        customer_name: "",
        customer_email: "",
        order_number: "",
        return_date: new Date().toISOString().split("T")[0],
        status: "Pending",
        notes: "",
        items: [
          {
            sku: "",
            product_name: "",
            quantity: 1,
            condition: "Good",
            reason: "Defective",
            total_refund: 0,
            unit_price: 0,
          },
        ],
        total_refund: 0,
      })
      await loadReturns()
    } catch (err) {
      console.error("Error creating return:", err)
      setError("Failed to create return")
    }
  }, [newReturn, loadReturns])

  if (error && returns.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Returns</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading returns</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <Button onClick={loadReturns} className="mt-3 bg-transparent" variant="outline">
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
          <h1 className="text-lg font-semibold">Returns</h1>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsNewReturnOpen(true)} size="sm" className="lg:hidden">
              <Plus className="w-4 h-4" />
            </Button>
            <Button onClick={exportToCSV} size="sm" className="lg:hidden" disabled={loading}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Returns</h1>
          <div className="hidden lg:flex items-center gap-2">
            <Button onClick={() => setIsNewReturnOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              New Return
            </Button>
            <Button onClick={exportToCSV} size="sm" disabled={loading}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Returns</p>
                    <p className="text-lg font-bold">{metrics.totalReturns}</p>
                  </div>
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Refund</p>
                    <p className="text-lg font-bold">${metrics.totalRefund.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-5 h-5 text-red-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Avg Refund</p>
                    <p className="text-lg font-bold">${metrics.avgRefund.toFixed(2)}</p>
                  </div>
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Pending</p>
                    <p className="text-lg font-bold">{metrics.pendingReturns}</p>
                  </div>
                  <Users className="w-5 h-5 text-yellow-600" />
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search returns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Mobile Card View / Desktop Table View */}
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
          ) : filteredReturns.length === 0 ? (
            <Card className="p-6 text-center">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No returns found." : "No returns yet."}</p>
            </Card>
          ) : (
            filteredReturns.map((returnItem) => (
              <Card key={returnItem.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{returnItem.return_number}</h3>
                    <p className="text-sm text-gray-600 truncate">{returnItem.customer_name}</p>
                    <p className="text-xs text-gray-500">{returnItem.order_number || "No order"}</p>
                  </div>
                  <Select value={returnItem.status} onValueChange={(value) => handleStatusChange(returnItem.id, value)}>
                    <SelectTrigger className="w-24 h-6 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">Pending</Badge>
                      </SelectItem>
                      <SelectItem value="Processing">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">Processing</Badge>
                      </SelectItem>
                      <SelectItem value="Accepted">
                        <Badge className="bg-green-100 text-green-800 text-xs">Accepted</Badge>
                      </SelectItem>
                      <SelectItem value="Rejected">
                        <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Refund:</span>
                    <p className="font-medium">${(returnItem.total_refund || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p>{new Date(returnItem.return_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Items:</span>
                    <p>{returnItem.return_items.length}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <Badge className={`${getStatusColor(returnItem.status)} text-xs`}>{returnItem.status}</Badge>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedReturn(returnItem)
                    setIsViewReturnOpen(true)
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

        {/* Desktop Table View */}
        {loading ? (
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        ) : (
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-10">
                    <TableHead>Return #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[100px]">Refund</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{searchTerm ? "No returns found." : "No returns yet."}</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReturns.map((returnItem) => (
                      <TableRow key={returnItem.id} className="h-12">
                        <TableCell className="font-medium">{returnItem.return_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{returnItem.customer_name}</div>
                            <div className="text-sm text-gray-500 truncate max-w-[150px]">
                              {returnItem.customer_email || "No email"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{returnItem.order_number || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(returnItem.return_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={returnItem.status}
                            onValueChange={(value) => handleStatusChange(returnItem.id, value)}
                          >
                            <SelectTrigger className="w-full h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Processing">Processing</SelectItem>
                              <SelectItem value="Accepted">Accepted</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>${(returnItem.total_refund || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReturn(returnItem)
                              setIsViewReturnOpen(true)
                            }}
                            title="View Return Details"
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

        {/* View Return Dialog */}
        <Dialog open={isViewReturnOpen} onOpenChange={setIsViewReturnOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Return Details - {selectedReturn?.return_number}</DialogTitle>
              <DialogDescription>Complete return information and items</DialogDescription>
            </DialogHeader>

            {selectedReturn && (
              <div className="space-y-6">
                {/* Return Header */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Customer Information</h3>
                      <div className="mt-2 text-sm">
                        <p>
                          <strong>Name:</strong> {selectedReturn.customer_name}
                        </p>
                        <p>
                          <strong>Email:</strong> {selectedReturn.customer_email || "Not provided"}
                        </p>
                        <p>
                          <strong>Order #:</strong> {selectedReturn.order_number || "Not provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Return Information</h3>
                      <div className="mt-2 text-sm">
                        <p>
                          <strong>Date:</strong> {new Date(selectedReturn.return_date).toLocaleDateString()}
                        </p>
                        <p>
                          <strong>Status:</strong>
                          <Badge className={`${getStatusColor(selectedReturn.status)} text-xs ml-2`}>
                            {selectedReturn.status}
                          </Badge>
                        </p>
                        <p>
                          <strong>Total Refund:</strong> ${(selectedReturn.total_refund || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Items */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Return Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="w-[80px]">Qty</TableHead>
                          <TableHead className="w-[100px]">Condition</TableHead>
                          <TableHead className="w-[120px]">Reason</TableHead>
                          <TableHead className="w-[100px]">Refund</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReturn.return_items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.sku}</TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell>{item.condition}</TableCell>
                            <TableCell>{item.reason}</TableCell>
                            <TableCell>${(item.total_refund || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Notes */}
                {selectedReturn.notes && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm">{selectedReturn.notes}</div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* New Return Dialog */}
        <Dialog open={isNewReturnOpen} onOpenChange={setIsNewReturnOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Return</DialogTitle>
              <DialogDescription>Enter return details and items</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={newReturn.customer_name}
                    onChange={(e) => setNewReturn({ ...newReturn, customer_name: e.target.value })}
                    placeholder="Enter customer name"
                  />
                </div>
                <div>
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={newReturn.customer_email}
                    onChange={(e) => setNewReturn({ ...newReturn, customer_email: e.target.value })}
                    placeholder="Enter customer email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="order_number">Order Number</Label>
                  <Input
                    id="order_number"
                    value={newReturn.order_number}
                    onChange={(e) => setNewReturn({ ...newReturn, order_number: e.target.value })}
                    placeholder="Enter order number"
                  />
                </div>
                <div>
                  <Label htmlFor="return_date">Return Date</Label>
                  <Input
                    id="return_date"
                    type="date"
                    value={newReturn.return_date}
                    onChange={(e) => setNewReturn({ ...newReturn, return_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newReturn.notes}
                  onChange={(e) => setNewReturn({ ...newReturn, notes: e.target.value })}
                  placeholder="Enter any additional notes"
                  rows={3}
                />
              </div>

              <div>
                <Label>Return Items</Label>
                {newReturn.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 mt-2">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`sku_${index}`}>SKU</Label>
                        <Input
                          id={`sku_${index}`}
                          value={item.sku}
                          onChange={(e) => {
                            const updatedItems = [...newReturn.items]
                            updatedItems[index].sku = e.target.value
                            setNewReturn({ ...newReturn, items: updatedItems })
                          }}
                          placeholder="Enter SKU"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`product_name_${index}`}>Product Name</Label>
                        <Input
                          id={`product_name_${index}`}
                          value={item.product_name}
                          onChange={(e) => {
                            const updatedItems = [...newReturn.items]
                            updatedItems[index].product_name = e.target.value
                            setNewReturn({ ...newReturn, items: updatedItems })
                          }}
                          placeholder="Enter product name"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <Label htmlFor={`quantity_${index}`}>Quantity</Label>
                        <Input
                          id={`quantity_${index}`}
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updatedItems = [...newReturn.items]
                            updatedItems[index].quantity = Number.parseInt(e.target.value) || 1
                            setNewReturn({ ...newReturn, items: updatedItems })
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`condition_${index}`}>Condition</Label>
                        <Select
                          value={item.condition}
                          onValueChange={(value) => {
                            const updatedItems = [...newReturn.items]
                            updatedItems[index].condition = value as any
                            setNewReturn({ ...newReturn, items: updatedItems })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Used">Used</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                            <SelectItem value="Defective">Defective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor={`reason_${index}`}>Reason</Label>
                        <Select
                          value={item.reason}
                          onValueChange={(value) => {
                            const updatedItems = [...newReturn.items]
                            updatedItems[index].reason = value as any
                            setNewReturn({ ...newReturn, items: updatedItems })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Defective">Defective</SelectItem>
                            <SelectItem value="Wrong Item">Wrong Item</SelectItem>
                            <SelectItem value="Not as Described">Not as Described</SelectItem>
                            <SelectItem value="Changed Mind">Changed Mind</SelectItem>
                            <SelectItem value="Damaged in Transit">Damaged in Transit</SelectItem>
                            <SelectItem value="Quality Issues">Quality Issues</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`total_refund_${index}`}>Refund Amount</Label>
                      <Input
                        id={`total_refund_${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.total_refund}
                        onChange={(e) => {
                          const updatedItems = [...newReturn.items]
                          updatedItems[index].total_refund = Number.parseFloat(e.target.value) || 0
                          const totalRefund = updatedItems.reduce((sum, it) => sum + it.total_refund, 0)
                          setNewReturn({ ...newReturn, items: updatedItems, total_refund: totalRefund })
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNewReturn({
                      ...newReturn,
                      items: [
                        ...newReturn.items,
                        {
                          sku: "",
                          product_name: "",
                          quantity: 1,
                          condition: "Good",
                          reason: "Defective",
                          total_refund: 0,
                          unit_price: 0,
                        },
                      ],
                    })
                  }}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-lg font-medium">Total Refund: ${newReturn.total_refund.toFixed(2)}</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsNewReturnOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateReturn}
                    disabled={!newReturn.customer_name || newReturn.items.length === 0}
                  >
                    Create Return
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
