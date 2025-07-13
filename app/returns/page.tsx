"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Plus, RotateCcw, Package, CheckCircle, Clock, Eye, Download } from "lucide-react"
import { supabaseStore, type ReturnOrder } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"

export default function Returns() {
  const [returns, setReturns] = useState<ReturnOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReturn, setSelectedReturn] = useState<ReturnOrder | null>(null)
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false)
  const [isViewReturnOpen, setIsViewReturnOpen] = useState(false)
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    orderNumber: "",
    returnDate: "",
    notes: "",
  })

  const [returnItems, setReturnItems] = useState([
    {
      sku: "",
      productName: "",
      quantity: "",
      condition: "Good",
      reason: "Defective",
    },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const returnOrders = await supabaseStore.getReturns()
        setReturns(returnOrders)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load returns")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCreateReturn = async () => {
    // Validate form data
    if (!formData.customerName || !formData.returnDate) {
      alert("Please fill in required fields (Customer Name and Return Date)")
      return
    }

    try {
      const newReturnData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        order_number: formData.orderNumber,
        return_date: formData.returnDate,
        status: "Pending" as const,
        items: returnItems
          .filter((item) => item.sku && item.productName)
          .map((item) => ({
            sku: item.sku,
            product_name: item.productName,
            quantity: Number.parseInt(item.quantity) || 0,
            condition: item.condition,
            reason: item.reason,
          })),
        notes: formData.notes,
      }

      const createdReturn = await supabaseStore.createReturn(newReturnData)
      const updatedReturns = await supabaseStore.getReturns()
      setReturns(updatedReturns)

      // Reset form
      setFormData({ customerName: "", customerEmail: "", orderNumber: "", returnDate: "", notes: "" })
      setReturnItems([{ sku: "", productName: "", quantity: "", condition: "Good", reason: "Defective" }])
      setIsNewReturnOpen(false)

      alert(`Return ${createdReturn.return_number} created successfully!`)
    } catch (error) {
      console.error("Error creating return:", error)
      alert("Error creating return. Please try again.")
    }
  }

  const handleUpdateStatus = async (returnOrder: ReturnOrder, newStatus: ReturnOrder["status"]) => {
    try {
      console.log(`Updating return ${returnOrder.return_number} status from ${returnOrder.status} to ${newStatus}`)

      await supabaseStore.updateReturn(returnOrder.id, { status: newStatus })
      const updatedReturns = await supabaseStore.getReturns()
      setReturns(updatedReturns)

      if (newStatus === "Accepted" && returnOrder.status !== "Accepted") {
        alert(
          `Return ${returnOrder.return_number} accepted! Inventory has been updated with ${returnOrder.items.reduce((sum, item) => sum + item.quantity, 0)} returned items.`,
        )
      } else {
        alert(`Return ${returnOrder.return_number} status updated to ${newStatus}`)
      }
    } catch (error) {
      console.error("Error updating return status:", error)
      alert("Error updating return status. Please try again.")
    }
  }

  const addReturnItem = () => {
    setReturnItems([...returnItems, { sku: "", productName: "", quantity: "", condition: "Good", reason: "Defective" }])
  }

  const removeReturnItem = (index: number) => {
    if (returnItems.length > 1) {
      setReturnItems(returnItems.filter((_, i) => i !== index))
    }
  }

  const updateReturnItem = (index: number, field: string, value: string) => {
    const updatedItems = returnItems.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    setReturnItems(updatedItems)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      case "processing":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "good":
        return "bg-green-100 text-green-800"
      case "damaged":
        return "bg-red-100 text-red-800"
      case "used":
        return "bg-yellow-100 text-yellow-800"
      case "defective":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredReturns = returns.filter(
    (returnOrder) =>
      returnOrder.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnOrder.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnOrder.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalStats = filteredReturns.reduce(
    (acc, returnOrder) => {
      const itemCount = returnOrder.items?.length || 0
      const totalQuantity = returnOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
      return {
        totalReturns: acc.totalReturns + 1,
        totalItems: acc.totalItems + itemCount,
        totalQuantity: acc.totalQuantity + totalQuantity,
        acceptedReturns: acc.acceptedReturns + (returnOrder.status.toLowerCase() === "accepted" ? 1 : 0),
      }
    },
    { totalReturns: 0, totalItems: 0, totalQuantity: 0, acceptedReturns: 0 },
  )

  const handleExportReturn = (returnOrder: ReturnOrder) => {
    // Create CSV content with headers
    const csvContent = [
      // Return Header Information
      ["Return Order Export"],
      [""],
      ["Return Number", returnOrder.return_number],
      ["Customer", returnOrder.customer_name],
      ["Email", returnOrder.customer_email || ""],
      ["Order Number", returnOrder.order_number || ""],
      ["Return Date", new Date(returnOrder.return_date).toLocaleDateString()],
      ["Status", returnOrder.status],
      ["Notes", returnOrder.notes || ""],
      [""],
      // Items Header
      ["Items"],
      ["SKU", "Product Name", "Quantity", "Condition", "Reason"],
      // Items Data
      ...returnOrder.items.map((item) => [
        item.sku,
        item.product_name,
        item.quantity.toString(),
        item.condition,
        item.reason,
      ]),
      [""],
      // Summary
      ["Summary"],
      ["Total Items", returnOrder.items.length.toString()],
      ["Total Quantity", returnOrder.items.reduce((sum, item) => sum + item.quantity, 0).toString()],
    ]

    // Convert to CSV string
    const csvString = csvContent.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    // Create and download file
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Return_${returnOrder.return_number}_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-64">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Returns</h1>
        </header>
        <div className="flex-1 p-4 ml-16 lg:ml-64">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-64">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Returns</h1>
        </header>
        <div className="flex-1 p-4 ml-16 lg:ml-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading returns</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-3" variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-64">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-semibold">Returns</h1>
          <Button onClick={() => setIsNewReturnOpen(true)} size="sm" className="lg:hidden">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 ml-16 lg:ml-64 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Returns</h1>
          <Button onClick={() => setIsNewReturnOpen(true)} size="sm" className="hidden lg:flex">
            <Plus className="w-4 h-4 mr-2" />
            New Return
          </Button>
        </div>

        {/* Stats Cards - Mobile responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Returns</p>
                <p className="text-lg font-bold">{totalStats.totalReturns}</p>
              </div>
              <RotateCcw className="w-5 h-5 text-blue-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Items</p>
                <p className="text-lg font-bold">{totalStats.totalItems}</p>
              </div>
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Quantity</p>
                <p className="text-lg font-bold">{totalStats.totalQuantity}</p>
              </div>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Accepted</p>
                <p className="text-lg font-bold">{totalStats.acceptedReturns}</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </Card>
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
          {filteredReturns.length === 0 ? (
            <Card className="p-6 text-center">
              <RotateCcw className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No returns found." : "No returns yet."}</p>
              {!searchTerm && (
                <Button onClick={() => setIsNewReturnOpen(true)} className="mt-2" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Return
                </Button>
              )}
            </Card>
          ) : (
            filteredReturns.map((returnOrder) => (
              <Card key={returnOrder.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium">{returnOrder.return_number}</h3>
                    <p className="text-sm text-gray-600 truncate">{returnOrder.customer_name}</p>
                  </div>
                  <Badge className={`${getStatusColor(returnOrder.status)} text-xs`}>{returnOrder.status}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <p>{new Date(returnOrder.return_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Items:</span>
                    <p>{returnOrder.items?.length || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <p>{returnOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <Select
                      value={returnOrder.status}
                      onValueChange={(newStatus) => handleUpdateStatus(returnOrder, newStatus as ReturnOrder["status"])}
                    >
                      <SelectTrigger className="w-full h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Processing">Processing</SelectItem>
                        <SelectItem value="Accepted">Accepted</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedReturn(returnOrder)
                      setIsViewReturnOpen(true)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportReturn(returnOrder)}>
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden lg:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="w-[120px]">Return Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[60px] text-right">Items</TableHead>
                  <TableHead className="w-[80px] text-right">Quantity</TableHead>
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RotateCcw className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">{searchTerm ? "No returns found." : "No returns yet."}</p>
                      {!searchTerm && (
                        <Button onClick={() => setIsNewReturnOpen(true)} className="mt-2" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Return
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((returnOrder) => (
                    <TableRow key={returnOrder.id} className="h-12">
                      <TableCell className="font-medium">{returnOrder.return_number}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{returnOrder.customer_name}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(returnOrder.return_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(returnOrder.status)} text-xs px-2 py-1`}>
                          {returnOrder.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{returnOrder.items?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        {returnOrder.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 items-center">
                          <Select
                            value={returnOrder.status}
                            onValueChange={(newStatus) =>
                              handleUpdateStatus(returnOrder, newStatus as ReturnOrder["status"])
                            }
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Processing">Processing</SelectItem>
                              <SelectItem value="Accepted">Accepted</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedReturn(returnOrder)
                              setIsViewReturnOpen(true)
                            }}
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportReturn(returnOrder)}
                            title="Export Return"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* View Return Dialog */}
        <Dialog open={isViewReturnOpen} onOpenChange={setIsViewReturnOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col w-[95vw] lg:w-full">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Return Details - {selectedReturn?.return_number}</DialogTitle>
                  <DialogDescription className="mt-1">
                    {selectedReturn &&
                      `${selectedReturn.items?.length || 0} items • Total Quantity: ${selectedReturn.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}`}
                  </DialogDescription>
                </div>
                {selectedReturn && (
                  <Button variant="outline" size="sm" onClick={() => handleExportReturn(selectedReturn)}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </DialogHeader>

            {selectedReturn && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                {/* Header Info */}
                <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Customer</p>
                    <p className="font-medium">{selectedReturn.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-medium">{selectedReturn.customer_email || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Order Number</p>
                    <p className="font-medium">{selectedReturn.order_number || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Return Date</p>
                    <p className="font-medium">{new Date(selectedReturn.return_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Status</p>
                    <Badge className={getStatusColor(selectedReturn.status)}>{selectedReturn.status}</Badge>
                  </div>
                </div>

                {/* Notes */}
                {selectedReturn.notes && (
                  <div className="flex-shrink-0">
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p className="text-sm bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">{selectedReturn.notes}</p>
                  </div>
                )}

                {/* Items */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <p className="text-gray-600 text-sm mb-2 flex-shrink-0">
                    Items ({selectedReturn.items?.length || 0})
                  </p>

                  {/* Mobile Cards View */}
                  <div className="lg:hidden flex-1 overflow-y-auto space-y-3">
                    {selectedReturn.items?.map((item, index) => (
                      <Card key={item.id || index} className="p-3">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-sm">{item.product_name}</p>
                              <p className="text-xs text-gray-600 font-mono">{item.sku}</p>
                            </div>
                            <Badge variant="outline">{item.quantity}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600">Condition:</span>
                              <Badge className={`${getConditionColor(item.condition)} text-xs ml-1`}>
                                {item.condition}
                              </Badge>
                            </div>
                            <div>
                              <span className="text-gray-600">Reason:</span>
                              <p className="text-xs">{item.reason}</p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )) || []}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block flex-1 border rounded-lg">
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 border-b">
                          <TableRow>
                            <TableHead className="w-[100px]">SKU</TableHead>
                            <TableHead className="min-w-[200px]">Product</TableHead>
                            <TableHead className="w-[80px] text-right">Quantity</TableHead>
                            <TableHead className="w-[100px]">Condition</TableHead>
                            <TableHead className="w-[150px]">Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedReturn.items?.map((item, index) => (
                            <TableRow key={item.id || index} className="hover:bg-gray-50">
                              <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                              <TableCell className="max-w-[200px]">
                                <div className="truncate" title={item.product_name}>
                                  {item.product_name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell>
                                <Badge className={`${getConditionColor(item.condition)} text-xs`}>
                                  {item.condition}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">{item.reason}</TableCell>
                            </TableRow>
                          )) || []}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>

                {/* Summary */}
                <div className="flex-shrink-0 bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Items</p>
                      <p className="font-medium">{selectedReturn.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Quantity</p>
                      <p className="font-medium">
                        {selectedReturn.items?.reduce((sum, item) => sum + item.quantity, 0) || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status</p>
                      <Badge className={getStatusColor(selectedReturn.status)}>{selectedReturn.status}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create New Return Dialog */}
        <Dialog open={isNewReturnOpen} onOpenChange={setIsNewReturnOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] lg:w-full">
            <DialogHeader>
              <DialogTitle>Create New Return</DialogTitle>
              <DialogDescription>Add a new return request to track returned items</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="customer-name">Customer Name *</label>
                  <Input
                    id="customer-name"
                    placeholder="Customer name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="customer-email">Customer Email</label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="order-number">Order Number</label>
                  <Input
                    id="order-number"
                    placeholder="Original order number"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="return-date">Return Date *</label>
                  <Input
                    id="return-date"
                    type="date"
                    value={formData.returnDate}
                    onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Return Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-base font-medium">Return Items</label>
                  <Button type="button" variant="outline" size="sm" onClick={addReturnItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {returnItems.map((item, index) => (
                    <div key={index} className="space-y-3 lg:space-y-0">
                      {/* Mobile Layout */}
                      <div className="lg:hidden space-y-3 p-3 border rounded-lg">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs">SKU</label>
                            <Input
                              placeholder="SKU"
                              value={item.sku}
                              onChange={(e) => updateReturnItem(index, "sku", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs">Quantity</label>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updateReturnItem(index, "quantity", e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs">Product Name</label>
                          <Input
                            placeholder="Product name"
                            value={item.productName}
                            onChange={(e) => updateReturnItem(index, "productName", e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs">Condition</label>
                            <Select
                              value={item.condition}
                              onValueChange={(value) => updateReturnItem(index, "condition", value)}
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
                            <label className="text-xs">Reason</label>
                            <Select
                              value={item.reason}
                              onValueChange={(value) => updateReturnItem(index, "reason", value)}
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
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReturnItem(index)}
                            disabled={returnItems.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-2">
                          <label className="text-xs">SKU</label>
                          <Input
                            placeholder="SKU"
                            value={item.sku}
                            onChange={(e) => updateReturnItem(index, "sku", e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="text-xs">Product Name</label>
                          <Input
                            placeholder="Product name"
                            value={item.productName}
                            onChange={(e) => updateReturnItem(index, "productName", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-xs">Quantity</label>
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => updateReturnItem(index, "quantity", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs">Condition</label>
                          <Select
                            value={item.condition}
                            onValueChange={(value) => updateReturnItem(index, "condition", value)}
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
                        <div className="col-span-3">
                          <label className="text-xs">Reason</label>
                          <Select
                            value={item.reason}
                            onValueChange={(value) => updateReturnItem(index, "reason", value)}
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
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReturnItem(index)}
                            disabled={returnItems.length === 1}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="notes">Notes</label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes about the return..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse lg:flex-row justify-end space-y-2 space-y-reverse lg:space-y-0 lg:space-x-2">
              <Button variant="outline" onClick={() => setIsNewReturnOpen(false)} className="w-full lg:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreateReturn} className="w-full lg:w-auto">
                Create Return
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
