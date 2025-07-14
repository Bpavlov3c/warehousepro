"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Plus, Package, DollarSign, TrendingUp, Calendar, Trash2, Eye, Edit } from "lucide-react"
import { supabaseStore, type Return } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function Returns() {
  const [returns, setReturns] = useState<Return[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null)
  const [isNewReturnOpen, setIsNewReturnOpen] = useState(false)
  const [isViewReturnOpen, setIsViewReturnOpen] = useState(false)
  const [isEditReturnOpen, setIsEditReturnOpen] = useState(false)
  const [editingReturn, setEditingReturn] = useState<Return | null>(null)
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    orderNumber: "",
    returnDate: "",
    reason: "",
    notes: "",
  })

  const [returnItems, setReturnItems] = useState([
    { sku: "", productName: "", quantity: "", reason: "", condition: "", unitPrice: "", totalRefund: "" },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const returnsData = await supabaseStore.getReturns()
        setReturns(returnsData)
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
      const totalRefund = returnItems.reduce((sum, item) => sum + (Number.parseFloat(item.totalRefund) || 0), 0)

      const newReturnData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        order_number: formData.orderNumber,
        return_date: formData.returnDate,
        status: "Pending" as const,
        total_refund: totalRefund,
        reason: formData.reason,
        notes: formData.notes,
        items: returnItems
          .filter((item) => item.sku && item.productName)
          .map((item) => ({
            sku: item.sku,
            product_name: item.productName,
            quantity: Number.parseInt(item.quantity) || 0,
            reason: item.reason,
            condition: item.condition,
            unit_price: Number.parseFloat(item.unitPrice) || 0,
            total_refund: Number.parseFloat(item.totalRefund) || 0,
          })),
      }

      const createdReturn = await supabaseStore.createReturn(newReturnData)
      const updatedReturns = await supabaseStore.getReturns()
      setReturns(updatedReturns)

      // Reset form
      setFormData({
        customerName: "",
        customerEmail: "",
        orderNumber: "",
        returnDate: "",
        reason: "",
        notes: "",
      })
      setReturnItems([
        { sku: "", productName: "", quantity: "", reason: "", condition: "", unitPrice: "", totalRefund: "" },
      ])
      setIsNewReturnOpen(false)

      alert(`Return ${createdReturn.return_number} created successfully!`)
    } catch (error) {
      console.error("Error creating return:", error)
      alert("Error creating return. Please try again.")
    }
  }

  const handleEditReturn = async () => {
    if (!editingReturn) return

    // Validate form data
    if (!formData.customerName || !formData.returnDate) {
      alert("Please fill in required fields (Customer Name and Return Date)")
      return
    }

    try {
      const totalRefund = returnItems.reduce((sum, item) => sum + (Number.parseFloat(item.totalRefund) || 0), 0)

      const updateData = {
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        order_number: formData.orderNumber,
        return_date: formData.returnDate,
        total_refund: totalRefund,
        reason: formData.reason,
        notes: formData.notes,
      }

      console.log("Updating return with data:", updateData)

      await supabaseStore.updateReturn(editingReturn.id, updateData)

      // Refresh the returns list
      const updatedReturns = await supabaseStore.getReturns()
      setReturns(updatedReturns)

      // Reset form and close dialog
      setFormData({
        customerName: "",
        customerEmail: "",
        orderNumber: "",
        returnDate: "",
        reason: "",
        notes: "",
      })
      setReturnItems([
        { sku: "", productName: "", quantity: "", reason: "", condition: "", unitPrice: "", totalRefund: "" },
      ])
      setIsEditReturnOpen(false)
      setEditingReturn(null)

      alert(`Return ${editingReturn.return_number} updated successfully!`)
    } catch (error) {
      console.error("Error updating return:", error)
      alert("Error updating return. Please try again.")
    }
  }

  const openEditDialog = (returnOrder: Return) => {
    setEditingReturn(returnOrder)
    setFormData({
      customerName: returnOrder.customer_name,
      customerEmail: returnOrder.customer_email || "",
      orderNumber: returnOrder.order_number || "",
      returnDate: returnOrder.return_date,
      reason: returnOrder.reason || "",
      notes: returnOrder.notes || "",
    })

    // Populate items for editing
    const editItems = returnOrder.return_items.map((item) => ({
      sku: item.sku,
      productName: item.product_name,
      quantity: item.quantity.toString(),
      reason: item.reason,
      condition: item.condition,
      unitPrice: (item.unit_price || 0).toString(),
      totalRefund: (item.total_refund || 0).toString(),
    }))

    // Ensure at least one empty row
    if (editItems.length === 0) {
      editItems.push({
        sku: "",
        productName: "",
        quantity: "",
        reason: "",
        condition: "",
        unitPrice: "",
        totalRefund: "",
      })
    }

    setReturnItems(editItems)
    setIsEditReturnOpen(true)
  }

  const handleUpdateStatus = async (returnOrder: Return, newStatus: Return["status"]) => {
    try {
      console.log(`Updating return ${returnOrder.return_number} status from ${returnOrder.status} to ${newStatus}`)

      await supabaseStore.updateReturn(returnOrder.id, { status: newStatus })
      const updatedReturns = await supabaseStore.getReturns()
      setReturns(updatedReturns)

      if (newStatus === "Accepted" && returnOrder.status !== "Accepted") {
        alert(
          `Return ${returnOrder.return_number} accepted! Inventory has been updated with ${returnOrder.return_items.reduce((sum, item) => sum + item.quantity, 0)} returned items.`,
        )
      } else {
        alert(`Return ${returnOrder.return_number} status updated to ${newStatus}`)
      }
    } catch (error) {
      console.error("Error updating return:", error)
      alert("Error updating return status. Please try again.")
    }
  }

  const addReturnItem = () => {
    setReturnItems([
      ...returnItems,
      { sku: "", productName: "", quantity: "", reason: "", condition: "", unitPrice: "", totalRefund: "" },
    ])
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
      case "processing":
        return "bg-blue-100 text-blue-800"
      case "accepted":
        return "bg-green-100 text-green-800"
      case "rejected":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredReturns = returns.filter(
    (returnOrder) =>
      returnOrder.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnOrder.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (returnOrder.order_number && returnOrder.order_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      returnOrder.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const calculateReturnStats = (returnOrder: Return) => {
    const itemCount = returnOrder.return_items?.length || 0
    const totalRefund =
      returnOrder.return_items?.reduce((sum, item) => sum + (item.total_refund || 0), 0) ||
      returnOrder.total_refund ||
      0
    return { itemCount, totalRefund }
  }

  const handleDeleteReturn = async (returnOrder: Return) => {
    if (
      !confirm(`Are you sure you want to delete return ${returnOrder.return_number}? This action cannot be undone.`)
    ) {
      return
    }

    try {
      await supabaseStore.deleteReturn(returnOrder.id)
      const updatedReturns = await supabaseStore.getReturns()
      setReturns(updatedReturns)
      alert(`Return ${returnOrder.return_number} deleted successfully!`)
    } catch (error) {
      console.error("Error deleting return:", error)
      alert("Error deleting return. Please try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center space-x-2">
            <SidebarTrigger />
            <h2 className="text-3xl font-bold tracking-tight">Returns</h2>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading returns...</div>
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
            <h2 className="text-3xl font-bold tracking-tight">Returns</h2>
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
          <h2 className="text-3xl font-bold tracking-tight">Returns</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setIsNewReturnOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Return
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total Returns</div>
            </div>
            <div className="text-2xl font-bold">{returns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Pending</div>
            </div>
            <div className="text-2xl font-bold">{returns.filter((r) => r.status === "Pending").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Processing</div>
            </div>
            <div className="text-2xl font-bold">{returns.filter((r) => r.status === "Processing").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-medium">Total Refunds</div>
            </div>
            <div className="text-2xl font-bold">
              ${returns.reduce((sum, r) => sum + (r.total_refund || 0), 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search returns..."
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
                <TableHead>Return #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.map((returnOrder) => {
                const { itemCount, totalRefund } = calculateReturnStats(returnOrder)
                return (
                  <TableRow key={returnOrder.id}>
                    <TableCell className="font-medium">{returnOrder.return_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{returnOrder.customer_name}</div>
                        {returnOrder.customer_email && (
                          <div className="text-sm text-muted-foreground">{returnOrder.customer_email}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{returnOrder.order_number || "N/A"}</TableCell>
                    <TableCell>{new Date(returnOrder.return_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Select
                        value={returnOrder.status}
                        onValueChange={(value) => handleUpdateStatus(returnOrder, value as Return["status"])}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue>
                            <Badge className={getStatusColor(returnOrder.status)}>{returnOrder.status}</Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Processing">Processing</SelectItem>
                          <SelectItem value="Accepted">Accepted</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{itemCount} items</TableCell>
                    <TableCell>${totalRefund.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReturn(returnOrder)
                            setIsViewReturnOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(returnOrder)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteReturn(returnOrder)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Return Dialog */}
      <Dialog open={isNewReturnOpen} onOpenChange={setIsNewReturnOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Return</DialogTitle>
            <DialogDescription>Enter the details for the new return order.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name *</label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Email</label>
                <Input
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="Enter customer email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Number</label>
                <Input
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder="Enter order number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Return Date *</label>
                <Input
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Return Items</h3>
                <Button type="button" variant="outline" onClick={addReturnItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {returnItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-7 gap-2 p-4 border rounded-lg">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">SKU</label>
                        <Input
                          value={item.sku}
                          onChange={(e) => updateReturnItem(index, "sku", e.target.value)}
                          placeholder="SKU"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Product Name</label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateReturnItem(index, "productName", e.target.value)}
                          placeholder="Product Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Quantity</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateReturnItem(index, "quantity", e.target.value)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Condition</label>
                        <Select
                          value={item.condition}
                          onValueChange={(value) => updateReturnItem(index, "condition", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Used">Used</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                            <SelectItem value="Defective">Defective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Reason</label>
                        <Select value={item.reason} onValueChange={(value) => updateReturnItem(index, "reason", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Reason" />
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
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Refund</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.totalRefund}
                          onChange={(e) => updateReturnItem(index, "totalRefund", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeReturnItem(index)}
                          disabled={returnItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsNewReturnOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReturn}>Create Return</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Return Dialog */}
      <Dialog open={isEditReturnOpen} onOpenChange={setIsEditReturnOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Return</DialogTitle>
            <DialogDescription>Update the details for this return order.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Name *</label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Customer Email</label>
                <Input
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="Enter customer email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Order Number</label>
                <Input
                  value={formData.orderNumber}
                  onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                  placeholder="Enter order number"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Return Date *</label>
                <Input
                  type="date"
                  value={formData.returnDate}
                  onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Enter any additional notes"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Return Items</h3>
                <Button type="button" variant="outline" onClick={addReturnItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <ScrollArea className="h-64">
                <div className="space-y-4">
                  {returnItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-7 gap-2 p-4 border rounded-lg">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">SKU</label>
                        <Input
                          value={item.sku}
                          onChange={(e) => updateReturnItem(index, "sku", e.target.value)}
                          placeholder="SKU"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Product Name</label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateReturnItem(index, "productName", e.target.value)}
                          placeholder="Product Name"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Quantity</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateReturnItem(index, "quantity", e.target.value)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Condition</label>
                        <Select
                          value={item.condition}
                          onValueChange={(value) => updateReturnItem(index, "condition", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Used">Used</SelectItem>
                            <SelectItem value="Damaged">Damaged</SelectItem>
                            <SelectItem value="Defective">Defective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Reason</label>
                        <Select value={item.reason} onValueChange={(value) => updateReturnItem(index, "reason", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Reason" />
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
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Refund</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.totalRefund}
                          onChange={(e) => updateReturnItem(index, "totalRefund", e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeReturnItem(index)}
                          disabled={returnItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditReturnOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditReturn}>Update Return</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Return Dialog */}
      <Dialog open={isViewReturnOpen} onOpenChange={setIsViewReturnOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription>View the complete details of this return order.</DialogDescription>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Return Number</h3>
                  <p className="text-lg font-medium">{selectedReturn.return_number}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
                  <Badge className={getStatusColor(selectedReturn.status)}>{selectedReturn.status}</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Customer</h3>
                  <p className="font-medium">{selectedReturn.customer_name}</p>
                  {selectedReturn.customer_email && (
                    <p className="text-sm text-muted-foreground">{selectedReturn.customer_email}</p>
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Order Number</h3>
                  <p>{selectedReturn.order_number || "N/A"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Return Date</h3>
                  <p>{new Date(selectedReturn.return_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Total Refund</h3>
                  <p className="text-lg font-medium">${(selectedReturn.total_refund || 0).toFixed(2)}</p>
                </div>
              </div>

              {selectedReturn.notes && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Notes</h3>
                  <p>{selectedReturn.notes}</p>
                </div>
              )}

              <div>
                <h3 className="font-medium mb-4">Return Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Refund</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReturn.return_items?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.condition}</Badge>
                        </TableCell>
                        <TableCell>{item.reason}</TableCell>
                        <TableCell>${(item.total_refund || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsViewReturnOpen(false)}>
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
