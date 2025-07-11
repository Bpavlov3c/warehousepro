"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Package, DollarSign, TrendingUp, Calendar, Trash2, Eye, Download, Edit } from "lucide-react"
import { supabaseStore, type PurchaseOrder } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SidebarTrigger } from "@/components/ui/sidebar"

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [isNewPOOpen, setIsNewPOOpen] = useState(false)
  const [isViewPOOpen, setIsViewPOOpen] = useState(false)
  const [isEditPOOpen, setIsEditPOOpen] = useState(false)
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null)
  const [formData, setFormData] = useState({
    supplier: "",
    poDate: "",
    deliveryCost: "",
    notes: "",
  })

  const [poItems, setPoItems] = useState([{ sku: "", productName: "", quantity: "", unitCost: "" }])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const pos = await supabaseStore.getPurchaseOrders()
        setPurchaseOrders(pos)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load purchase orders")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCreatePO = async () => {
    // Validate form data
    if (!formData.supplier || !formData.poDate) {
      alert("Please fill in required fields (Supplier and PO Date)")
      return
    }

    try {
      const newPOData = {
        supplier_name: formData.supplier,
        po_date: formData.poDate,
        status: "Draft" as const,
        delivery_cost: Number.parseFloat(formData.deliveryCost) || 0,
        items: poItems
          .filter((item) => item.sku && item.productName)
          .map((item) => ({
            sku: item.sku,
            product_name: item.productName,
            quantity: Number.parseInt(item.quantity) || 0,
            unit_cost: Number.parseFloat(item.unitCost) || 0,
          })),
        notes: formData.notes,
      }

      const createdPO = await supabaseStore.createPurchaseOrder(newPOData)
      const updatedPOs = await supabaseStore.getPurchaseOrders()
      setPurchaseOrders(updatedPOs)

      // Reset form
      setFormData({ supplier: "", poDate: "", deliveryCost: "", notes: "" })
      setPoItems([{ sku: "", productName: "", quantity: "", unitCost: "" }])
      setIsNewPOOpen(false)

      alert(`Purchase Order ${createdPO.po_number} created successfully!`)
    } catch (error) {
      console.error("Error creating purchase order:", error)
      alert("Error creating purchase order. Please try again.")
    }
  }

  const handleUpdatePOStatus = async (poId: string, newStatus: string) => {
    try {
      await supabaseStore.updatePurchaseOrderStatus(poId, newStatus as any)
      const updatedPOs = await supabaseStore.getPurchaseOrders()
      setPurchaseOrders(updatedPOs)
      alert("Purchase order status updated successfully!")
    } catch (error) {
      console.error("Error updating purchase order status:", error)
      alert("Error updating purchase order status. Please try again.")
    }
  }

  const handleDeletePO = async (poId: string) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) return

    try {
      await supabaseStore.deletePurchaseOrder(poId)
      const updatedPOs = await supabaseStore.getPurchaseOrders()
      setPurchaseOrders(updatedPOs)
      alert("Purchase order deleted successfully!")
    } catch (error) {
      console.error("Error deleting purchase order:", error)
      alert("Error deleting purchase order. Please try again.")
    }
  }

  const handleEditPO = async () => {
    if (!editingPO) return

    try {
      const updatedData = {
        supplier_name: formData.supplier,
        delivery_cost: Number.parseFloat(formData.deliveryCost) || 0,
        notes: formData.notes,
        items: poItems
          .filter((item) => item.sku && item.productName)
          .map((item) => ({
            sku: item.sku,
            product_name: item.productName,
            quantity: Number.parseInt(item.quantity) || 0,
            unit_cost: Number.parseFloat(item.unitCost) || 0,
          })),
      }

      await supabaseStore.updatePurchaseOrder(editingPO.id, updatedData)
      const updatedPOs = await supabaseStore.getPurchaseOrders()
      setPurchaseOrders(updatedPOs)

      setIsEditPOOpen(false)
      setEditingPO(null)
      alert("Purchase order updated successfully!")
    } catch (error) {
      console.error("Error updating purchase order:", error)
      alert("Error updating purchase order. Please try again.")
    }
  }

  const openEditDialog = (po: PurchaseOrder) => {
    setEditingPO(po)
    setFormData({
      supplier: po.supplier_name,
      poDate: po.po_date,
      deliveryCost: po.delivery_cost.toString(),
      notes: po.notes || "",
    })
    setPoItems(
      po.items.map((item) => ({
        sku: item.sku,
        productName: item.product_name,
        quantity: item.quantity.toString(),
        unitCost: item.unit_cost.toString(),
      })),
    )
    setIsEditPOOpen(true)
  }

  const addPOItem = () => {
    setPoItems([...poItems, { sku: "", productName: "", quantity: "", unitCost: "" }])
  }

  const removePOItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index))
  }

  const updatePOItem = (index: number, field: string, value: string) => {
    const updated = [...poItems]
    updated[index] = { ...updated[index], [field]: value }
    setPoItems(updated)
  }

  const exportToCSV = () => {
    const headers = [
      "PO Number",
      "Supplier",
      "Date",
      "Status",
      "Items Count",
      "Total Cost",
      "Delivery Cost",
      "Grand Total",
    ]

    const rows = filteredPOs.map((po) => {
      const itemsTotal = po.items.reduce((sum, item) => sum + item.total_cost, 0)
      const grandTotal = itemsTotal + po.delivery_cost

      return [
        po.po_number,
        po.supplier_name,
        new Date(po.po_date).toLocaleDateString(),
        po.status,
        po.items.length.toString(),
        itemsTotal.toFixed(2),
        po.delivery_cost.toFixed(2),
        grandTotal.toFixed(2),
      ]
    })

    const csvContent = [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `purchase_orders_${new Date().toISOString().slice(0, 10)}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter purchase orders based on search term
  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate summary statistics
  const totalPOs = purchaseOrders.length
  const totalValue = purchaseOrders.reduce((sum, po) => {
    const itemsTotal = po.items.reduce((itemSum, item) => itemSum + item.total_cost, 0)
    return sum + itemsTotal + po.delivery_cost
  }, 0)
  const pendingPOs = purchaseOrders.filter((po) => po.status === "Pending" || po.status === "In Transit").length
  const deliveredPOs = purchaseOrders.filter((po) => po.status === "Delivered").length

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "secondary"
      case "Pending":
        return "default"
      case "In Transit":
        return "outline"
      case "Delivered":
        return "default"
      case "Cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Purchase Orders</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading purchase orders...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Purchase Orders</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
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
          <Package className="h-5 w-5" />
          <span className="hidden sm:inline">Purchase Orders</span>
          <span className="sm:hidden">POs</span>
        </h1>
      </header>

      <div className="flex-1 space-y-4 p-4 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total POs</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalPOs}</p>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="text-lg sm:text-2xl font-bold">{totalValue.toLocaleString()} лв</p>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">{pendingPOs}</p>
                </div>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Delivered</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{deliveredPOs}</p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-full sm:w-[300px]"
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} className="flex-1 sm:flex-none bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>

            <Button size="sm" onClick={() => setIsNewPOOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New PO</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <Card>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">PO Number</TableHead>
                    <TableHead className="min-w-[120px]">Supplier</TableHead>
                    <TableHead className="min-w-[100px] hidden sm:table-cell">Date</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="text-right min-w-[60px] hidden md:table-cell">Items</TableHead>
                    <TableHead className="text-right min-w-[100px]">Total</TableHead>
                    <TableHead className="text-center min-w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po) => {
                    const itemsTotal = po.items.reduce((sum, item) => sum + item.total_cost, 0)
                    const grandTotal = itemsTotal + po.delivery_cost

                    return (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{po.po_number}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{po.supplier_name}</TableCell>
                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                          {new Date(po.po_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(po.status)} className="text-xs">
                            {po.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">
                          {po.items.length}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs sm:text-sm">
                          {grandTotal.toFixed(2)} лв
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedPO(po)
                                setIsViewPOOpen(true)
                              }}
                              className="h-8 w-8"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(po)} className="h-8 w-8">
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePO(po.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {filteredPOs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No purchase orders match your search." : "No purchase orders found."}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* New PO Dialog */}
        <Dialog open={isNewPOOpen} onOpenChange={setIsNewPOOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
              <DialogDescription>Add a new purchase order to track incoming inventory.</DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier Name *</label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Enter supplier name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">PO Date *</label>
                    <Input
                      type="date"
                      value={formData.poDate}
                      onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.deliveryCost}
                      onChange={(e) => setFormData({ ...formData, deliveryCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addPOItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {poItems.map((item, index) => (
                      <div
                        key={index}
                        className="grid gap-2 grid-cols-1 sm:grid-cols-5 items-end p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-medium">SKU</label>
                          <Input
                            value={item.sku}
                            onChange={(e) => updatePOItem(index, "sku", e.target.value)}
                            placeholder="SKU"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Product Name</label>
                          <Input
                            value={item.productName}
                            onChange={(e) => updatePOItem(index, "productName", e.target.value)}
                            placeholder="Product name"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Quantity</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updatePOItem(index, "quantity", e.target.value)}
                            placeholder="0"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Unit Cost</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => updatePOItem(index, "unitCost", e.target.value)}
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePOItem(index)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsNewPOOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreatePO} className="w-full sm:w-auto">
                Create Purchase Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View PO Dialog */}
        <Dialog open={isViewPOOpen} onOpenChange={setIsViewPOOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
              <DialogDescription>
                {selectedPO && `PO Number: ${selectedPO.po_number} - ${selectedPO.supplier_name}`}
              </DialogDescription>
            </DialogHeader>

            {selectedPO && (
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Supplier</label>
                      <p className="text-sm">{selectedPO.supplier_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date</label>
                      <p className="text-sm">{new Date(selectedPO.po_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge variant={getStatusColor(selectedPO.status)}>{selectedPO.status}</Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Delivery Cost</label>
                      <p className="text-sm">{selectedPO.delivery_cost.toFixed(2)} лв</p>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Status</label>
                    <div className="flex gap-2">
                      <Select
                        value={selectedPO.status}
                        onValueChange={(value) => handleUpdatePOStatus(selectedPO.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Transit">In Transit</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Items</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Cost</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPO.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium text-sm">{item.sku}</TableCell>
                              <TableCell className="text-sm">{item.product_name}</TableCell>
                              <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-right text-sm">{item.unit_cost.toFixed(2)} лв</TableCell>
                              <TableCell className="text-right font-medium text-sm">
                                {item.total_cost.toFixed(2)} лв
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Totals */}
                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span>Items Total:</span>
                        <span>{selectedPO.items.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)} лв</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Delivery Cost:</span>
                        <span>{selectedPO.delivery_cost.toFixed(2)} лв</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span>Grand Total:</span>
                        <span>
                          {(
                            selectedPO.items.reduce((sum, item) => sum + item.total_cost, 0) + selectedPO.delivery_cost
                          ).toFixed(2)}{" "}
                          лв
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedPO.notes && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Notes</label>
                      <p className="text-sm">{selectedPO.notes}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => setIsViewPOOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit PO Dialog */}
        <Dialog open={isEditPOOpen} onOpenChange={setIsEditPOOpen}>
          <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
              <DialogDescription>
                {editingPO && `Editing PO: ${editingPO.po_number} - ${editingPO.supplier_name}`}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Supplier Name *</label>
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="Enter supplier name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.deliveryCost}
                      onChange={(e) => setFormData({ ...formData, deliveryCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Items</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addPOItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {poItems.map((item, index) => (
                      <div
                        key={index}
                        className="grid gap-2 grid-cols-1 sm:grid-cols-5 items-end p-3 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <label className="text-xs font-medium">SKU</label>
                          <Input
                            value={item.sku}
                            onChange={(e) => updatePOItem(index, "sku", e.target.value)}
                            placeholder="SKU"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Product Name</label>
                          <Input
                            value={item.productName}
                            onChange={(e) => updatePOItem(index, "productName", e.target.value)}
                            placeholder="Product name"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Quantity</label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updatePOItem(index, "quantity", e.target.value)}
                            placeholder="0"
                            className="text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium">Unit Cost</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.unitCost}
                            onChange={(e) => updatePOItem(index, "unitCost", e.target.value)}
                            placeholder="0.00"
                            className="text-sm"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePOItem(index)}
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsEditPOOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleEditPO} className="w-full sm:w-auto">
                Update Purchase Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
