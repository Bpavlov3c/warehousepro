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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Filter, Download, Eye, Calendar, DollarSign, Package, Trash2, Edit } from "lucide-react"
import { dataStore, type PurchaseOrder } from "@/lib/store"

function buildItemsWithCosts(
  items: { sku: string; productName: string; quantity: string; unitCost: string }[],
  deliveryCost: number,
) {
  const totalQty = items.reduce((sum, i) => sum + (Number.parseFloat(i.quantity) || 0), 0)
  const deliveryPerUnit = totalQty ? deliveryCost / totalQty : 0

  return items
    .filter((i) => i.sku && i.productName)
    .map((i) => {
      const qty = Number.parseFloat(i.quantity) || 0
      const unit = Number.parseFloat(i.unitCost) || 0
      return {
        sku: i.sku,
        name: i.productName,
        quantity: qty,
        unitCost: unit,
        deliveryCostPerUnit: deliveryPerUnit,
        totalCost: qty * unit + qty * deliveryPerUnit,
      }
    })
}

export default function PurchaseOrders() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [isNewPOOpen, setIsNewPOOpen] = useState(false)
  const [isEditStatusOpen, setIsEditStatusOpen] = useState(false)
  const [isEditPOOpen, setIsEditPOOpen] = useState(false)
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null)
  const [formData, setFormData] = useState({
    supplier: "",
    poDate: "",
    deliveryCost: "",
    notes: "",
  })

  const [poItems, setPoItems] = useState([{ sku: "", productName: "", quantity: "", unitCost: "" }])

  // Load data on component mount
  useEffect(() => {
    setPurchaseOrders(dataStore.getPurchaseOrders())
  }, [])

  const handleCreatePO = () => {
    // Validate form data
    if (!formData.supplier || !formData.poDate) {
      alert("Please fill in required fields (Supplier and PO Date)")
      return
    }

    // Calculate total cost from items
    const deliveryCost = Number.parseFloat(formData.deliveryCost) || 0
    const items = buildItemsWithCosts(poItems, deliveryCost)

    const newPOData = {
      supplier: formData.supplier,
      date: formData.poDate,
      status: "Draft" as const,
      totalCost: items.reduce((s, i) => s + i.totalCost, 0),
      itemCount: items.length,
      deliveryCost,
      items,
      notes: formData.notes,
    }

    // Save to store
    const createdPO = dataStore.createPurchaseOrder(newPOData)

    // Update local state
    setPurchaseOrders(dataStore.getPurchaseOrders())

    // Reset form
    setFormData({ supplier: "", poDate: "", deliveryCost: "", notes: "" })
    setPoItems([{ sku: "", productName: "", quantity: "", unitCost: "" }])
    setIsNewPOOpen(false)

    // Show success message
    alert(`Purchase Order ${createdPO.id} created successfully!`)
  }

  const handleUpdateStatus = (newStatus: PurchaseOrder["status"]) => {
    if (!selectedPO) return

    const updatedPO = dataStore.updatePurchaseOrder(selectedPO.id, { status: newStatus })
    if (updatedPO) {
      setPurchaseOrders(dataStore.getPurchaseOrders())
      setSelectedPO(updatedPO)
      setIsEditStatusOpen(false)
      alert(`Purchase Order ${updatedPO.id} status updated to ${newStatus}`)
    }
  }

  const handleEditPO = () => {
    if (!editingPO) return

    // Validate form data
    if (!formData.supplier || !formData.poDate) {
      alert("Please fill in required fields (Supplier and PO Date)")
      return
    }

    // Calculate total cost from items
    const deliveryCost = Number.parseFloat(formData.deliveryCost) || 0
    const items = buildItemsWithCosts(poItems, deliveryCost)

    const updatedPOData = {
      supplier: formData.supplier,
      date: formData.poDate,
      deliveryCost,
      items,
      notes: formData.notes,
    }

    // Save to store
    const updatedPO = dataStore.updatePurchaseOrder(editingPO.id, updatedPOData)

    if (updatedPO) {
      // Update local state
      setPurchaseOrders(dataStore.getPurchaseOrders())

      // Reset form
      setFormData({ supplier: "", poDate: "", deliveryCost: "", notes: "" })
      setPoItems([{ sku: "", productName: "", quantity: "", unitCost: "" }])
      setIsEditPOOpen(false)
      setEditingPO(null)

      // Show success message
      alert(`Purchase Order ${updatedPO.id} updated successfully!`)
    }
  }

  const openEditPODialog = (po: PurchaseOrder) => {
    setEditingPO(po)
    setFormData({
      supplier: po.supplier,
      poDate: po.date,
      deliveryCost: po.deliveryCost.toString(),
      notes: po.notes || "",
    })
    setPoItems(
      po.items.map((item) => ({
        sku: item.sku,
        productName: item.name,
        quantity: item.quantity.toString(),
        unitCost: item.unitCost.toString(),
      })),
    )
    setIsEditPOOpen(true)
  }

  const addPoItem = () => {
    setPoItems([...poItems, { sku: "", productName: "", quantity: "", unitCost: "" }])
  }

  const removePoItem = (index: number) => {
    if (poItems.length > 1) {
      setPoItems(poItems.filter((_, i) => i !== index))
    }
  }

  const updatePoItem = (index: number, field: string, value: string) => {
    const updatedItems = poItems.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    setPoItems(updatedItems)
  }

  const handleExport = () => {
    console.log("Exporting purchase orders...")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-800"
      case "Pending":
        return "bg-yellow-100 text-yellow-800"
      case "In Transit":
        return "bg-blue-100 text-blue-800"
      case "Delivered":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredPOs = purchaseOrders.filter(
    (po) =>
      po.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPOs = purchaseOrders.length
  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0)
  const pendingPOs = purchaseOrders.filter((po) => po.status === "Pending" || po.status === "In Transit").length
  const avgValue = totalPOs > 0 ? totalValue / totalPOs : 0

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Purchase Orders</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total POs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPOs}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All purchase orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending/In Transit</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPOs}</div>
              <p className="text-xs text-muted-foreground">Awaiting delivery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg PO Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Per order</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
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
            <Dialog open={isNewPOOpen} onOpenChange={setIsNewPOOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Purchase Order</DialogTitle>
                  <DialogDescription>Add a new purchase order to track inventory costs</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="supplier">Supplier *</Label>
                      <Input
                        id="supplier"
                        placeholder="Supplier name"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="po-date">PO Date *</Label>
                      <Input
                        id="po-date"
                        type="date"
                        value={formData.poDate}
                        onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery-cost">Delivery Cost</Label>
                    <Input
                      id="delivery-cost"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.deliveryCost}
                      onChange={(e) => setFormData({ ...formData, deliveryCost: e.target.value })}
                    />
                  </div>

                  {/* PO Items Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Purchase Order Items</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addPoItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {poItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-3">
                            <Label className="text-xs">SKU</Label>
                            <Input
                              placeholder="SKU"
                              value={item.sku}
                              onChange={(e) => updatePoItem(index, "sku", e.target.value)}
                            />
                          </div>
                          <div className="col-span-4">
                            <Label className="text-xs">Product Name</Label>
                            <Input
                              placeholder="Product name"
                              value={item.productName}
                              onChange={(e) => updatePoItem(index, "productName", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updatePoItem(index, "quantity", e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Unit Cost</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unitCost}
                              onChange={(e) => updatePoItem(index, "unitCost", e.target.value)}
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePoItem(index)}
                              disabled={poItems.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Preview */}
                    <div className="bg-muted p-3 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Items Total:</span>
                        <span>
                          $
                          {poItems
                            .reduce((sum, item) => {
                              const qty = Number.parseFloat(item.quantity) || 0
                              const cost = Number.parseFloat(item.unitCost) || 0
                              return sum + qty * cost
                            }, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Delivery Cost:</span>
                        <span>${Number.parseFloat(formData.deliveryCost || "0").toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2 mt-2">
                        <span>Total:</span>
                        <span>
                          $
                          {(
                            poItems.reduce((sum, item) => {
                              const qty = Number.parseFloat(item.quantity) || 0
                              const cost = Number.parseFloat(item.unitCost) || 0
                              return sum + qty * cost
                            }, 0) + Number.parseFloat(formData.deliveryCost || "0")
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsNewPOOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePO}>Create PO</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
            <CardDescription>Manage and track all purchase orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.id}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell>{po.date}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(po.status)}>{po.status}</Badge>
                    </TableCell>
                    <TableCell>{po.itemCount} items</TableCell>
                    <TableCell>${po.totalCost.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedPO(po)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Purchase Order Details - {selectedPO?.id}</DialogTitle>
                              <DialogDescription>Complete information for this purchase order</DialogDescription>
                            </DialogHeader>
                            {selectedPO && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm font-medium">Supplier</Label>
                                    <p className="text-sm text-muted-foreground">{selectedPO.supplier}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Date</Label>
                                    <p className="text-sm text-muted-foreground">{selectedPO.date}</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Status</Label>
                                    <div className="flex items-center space-x-2">
                                      <Badge className={getStatusColor(selectedPO.status)}>{selectedPO.status}</Badge>
                                      <Button variant="outline" size="sm" onClick={() => setIsEditStatusOpen(true)}>
                                        <Edit className="h-4 w-4 mr-1" />
                                        Change
                                      </Button>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-sm font-medium">Delivery Cost</Label>
                                    <p className="text-sm text-muted-foreground">${selectedPO.deliveryCost}</p>
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Items</Label>
                                  <div className="max-h-60 overflow-y-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>SKU</TableHead>
                                          <TableHead>Product Name</TableHead>
                                          <TableHead>Quantity</TableHead>
                                          <TableHead>Unit Cost</TableHead>
                                          <TableHead>Delivery/Unit</TableHead>
                                          <TableHead>Total</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {selectedPO.items.map((item, index) => (
                                          <TableRow key={index}>
                                            <TableCell>{item.sku}</TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>${(item.unitCost ?? 0).toFixed(2)}</TableCell>
                                            <TableCell>${(item.deliveryCostPerUnit ?? 0).toFixed(2)}</TableCell>
                                            <TableCell>
                                              $
                                              {(
                                                item.totalCost ??
                                                item.quantity * item.unitCost +
                                                  item.quantity * (item.deliveryCostPerUnit ?? 0)
                                              ).toFixed(2)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>

                                  <div className="mt-4 space-y-2 border-t pt-4">
                                    <div className="flex justify-between text-sm">
                                      <span>Items Subtotal:</span>
                                      <span>
                                        $
                                        {selectedPO.items
                                          .reduce((sum, item) => sum + item.unitCost * item.quantity, 0)
                                          .toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span>Delivery Cost:</span>
                                      <span>${selectedPO.deliveryCost.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-medium border-t pt-2">
                                      <span>Total:</span>
                                      <span>${selectedPO.totalCost.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                {selectedPO.notes && (
                                  <div>
                                    <Label className="text-sm font-medium">Notes</Label>
                                    <p className="text-sm text-muted-foreground">{selectedPO.notes}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        {po.status === "Draft" && (
                          <Button variant="ghost" size="sm" onClick={() => openEditPODialog(po)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Status Change Dialog */}
        <Dialog open={isEditStatusOpen} onOpenChange={setIsEditStatusOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change PO Status - {selectedPO?.id}</DialogTitle>
              <DialogDescription>
                Update the status of this purchase order. This will affect inventory tracking.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Status</Label>
                <Badge className={getStatusColor(selectedPO?.status || "")}>{selectedPO?.status}</Badge>
              </div>
              <div className="space-y-2">
                <Label>New Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => handleUpdateStatus("Draft")} className="justify-start">
                    Draft
                  </Button>
                  <Button variant="outline" onClick={() => handleUpdateStatus("Pending")} className="justify-start">
                    Pending
                  </Button>
                  <Button variant="outline" onClick={() => handleUpdateStatus("In Transit")} className="justify-start">
                    In Transit
                  </Button>
                  <Button variant="outline" onClick={() => handleUpdateStatus("Delivered")} className="justify-start">
                    Delivered
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Draft:</strong> No inventory impact
                </p>
                <p>
                  <strong>Pending/In Transit:</strong> Added to "Incoming" inventory
                </p>
                <p>
                  <strong>Delivered:</strong> Added to "In Stock" inventory
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit PO Dialog */}
        <Dialog open={isEditPOOpen} onOpenChange={setIsEditPOOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order - {editingPO?.id}</DialogTitle>
              <DialogDescription>Update purchase order details (only available for Draft status)</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier">Supplier *</Label>
                  <Input
                    id="edit-supplier"
                    placeholder="Supplier name"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-po-date">PO Date *</Label>
                  <Input
                    id="edit-po-date"
                    type="date"
                    value={formData.poDate}
                    onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-delivery-cost">Delivery Cost</Label>
                <Input
                  id="edit-delivery-cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.deliveryCost}
                  onChange={(e) => setFormData({ ...formData, deliveryCost: e.target.value })}
                />
              </div>

              {/* PO Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Purchase Order Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPoItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-3">
                  {poItems.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-3">
                        <Label className="text-xs">SKU</Label>
                        <Input
                          placeholder="SKU"
                          value={item.sku}
                          onChange={(e) => updatePoItem(index, "sku", e.target.value)}
                        />
                      </div>
                      <div className="col-span-4">
                        <Label className="text-xs">Product Name</Label>
                        <Input
                          placeholder="Product name"
                          value={item.productName}
                          onChange={(e) => updatePoItem(index, "productName", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => updatePoItem(index, "quantity", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitCost}
                          onChange={(e) => updatePoItem(index, "unitCost", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removePoItem(index)}
                          disabled={poItems.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Preview */}
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Items Total:</span>
                    <span>
                      $
                      {poItems
                        .reduce((sum, item) => {
                          const qty = Number.parseFloat(item.quantity) || 0
                          const cost = Number.parseFloat(item.unitCost) || 0
                          return sum + qty * cost
                        }, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Delivery Cost:</span>
                    <span>${Number.parseFloat(formData.deliveryCost || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>
                      $
                      {(
                        poItems.reduce((sum, item) => {
                          const qty = Number.parseFloat(item.quantity) || 0
                          const cost = Number.parseFloat(item.unitCost) || 0
                          return sum + qty * cost
                        }, 0) + Number.parseFloat(formData.deliveryCost || "0")
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditPOOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditPO}>Update PO</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
