"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Package, DollarSign, TrendingUp, Calendar, Trash2, Eye } from "lucide-react"
import { supabaseStore, type PurchaseOrder } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

  const handleUpdateStatus = async (po: PurchaseOrder, newStatus: PurchaseOrder["status"]) => {
    try {
      await supabaseStore.updatePurchaseOrder(po.id, { status: newStatus })
      const updatedPOs = await supabaseStore.getPurchaseOrders()
      setPurchaseOrders(updatedPOs)
      alert(`Purchase Order ${po.po_number} status updated to ${newStatus}`)
    } catch (error) {
      console.error("Error updating purchase order:", error)
      alert("Error updating purchase order status. Please try again.")
    }
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in transit":
        return "bg-blue-100 text-blue-800"
      case "delivered":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredOrders = purchaseOrders.filter(
    (po) =>
      po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.status.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const calculateOrderStats = (po: PurchaseOrder) => {
    const itemCount = po.items?.length || 0
    const totalCost = (po.items?.reduce((sum, item) => sum + item.total_cost, 0) || 0) + po.delivery_cost
    return { itemCount, totalCost }
  }

  const totalStats = filteredOrders.reduce(
    (acc, po) => {
      const { itemCount, totalCost } = calculateOrderStats(po)
      return {
        totalOrders: acc.totalOrders + 1,
        totalItems: acc.totalItems + itemCount,
        totalValue: acc.totalValue + totalCost,
        deliveredOrders: acc.deliveredOrders + (po.status.toLowerCase() === "delivered" ? 1 : 0),
      }
    },
    { totalOrders: 0, totalItems: 0, totalValue: 0, deliveredOrders: 0 },
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
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
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error loading purchase orders</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-3" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Button onClick={() => setIsNewPOOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New PO
        </Button>
      </div>

      {/* Compact Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Orders</p>
              <p className="text-lg font-bold">{totalStats.totalOrders}</p>
            </div>
            <Package className="w-5 h-5 text-blue-600" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Items</p>
              <p className="text-lg font-bold">{totalStats.totalItems}</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Value</p>
              <p className="text-lg font-bold">${totalStats.totalValue.toFixed(2)}</p>
            </div>
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Delivered</p>
              <p className="text-lg font-bold">{totalStats.deliveredOrders}</p>
            </div>
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Compact Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search purchase orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Compact Table View */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="h-10">
                <TableHead className="w-[120px]">PO Number</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[60px] text-right">Items</TableHead>
                <TableHead className="w-[100px] text-right">Total</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      {searchTerm ? "No purchase orders found." : "No purchase orders yet."}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setIsNewPOOpen(true)} className="mt-2" size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First PO
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((po) => {
                  const { itemCount, totalCost } = calculateOrderStats(po)
                  return (
                    <TableRow key={po.id} className="h-12">
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell className="max-w-[150px] truncate">{po.supplier_name}</TableCell>
                      <TableCell className="text-sm">{new Date(po.po_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(po.status)} text-xs px-2 py-1`}>{po.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{itemCount}</TableCell>
                      <TableCell className="text-right font-medium">${totalCost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPO(po)
                              setIsViewPOOpen(true)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {po.status === "Draft" && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(po, "Pending")}>
                              Submit
                            </Button>
                          )}
                          {po.status === "Pending" && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(po, "In Transit")}>
                              Ship
                            </Button>
                          )}
                          {po.status === "In Transit" && (
                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(po, "Delivered")}>
                              Deliver
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View PO Dialog */}
      <Dialog open={isViewPOOpen} onOpenChange={setIsViewPOOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Order Details - {selectedPO?.po_number}</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Supplier</p>
                  <p className="font-medium">{selectedPO.supplier_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Date</p>
                  <p className="font-medium">{new Date(selectedPO.po_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-gray-600">Status</p>
                  <Badge className={getStatusColor(selectedPO.status)}>{selectedPO.status}</Badge>
                </div>
                <div>
                  <p className="text-gray-600">Delivery Cost</p>
                  <p className="font-medium">${selectedPO.delivery_cost.toFixed(2)}</p>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <p className="text-gray-600 text-sm">Notes</p>
                  <p className="text-sm bg-gray-50 p-2 rounded">{selectedPO.notes}</p>
                </div>
              )}

              <div>
                <p className="text-gray-600 text-sm mb-2">Items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.unit_cost.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${item.total_cost.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New PO Dialog */}
      <Dialog open={isNewPOOpen} onOpenChange={setIsNewPOOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
            <DialogDescription>Add a new purchase order to track inventory costs</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="supplier">Supplier *</label>
                <Input
                  id="supplier"
                  placeholder="Supplier name"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="po-date">PO Date *</label>
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
              <label htmlFor="delivery-cost">Delivery Cost</label>
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
                <label className="text-base font-medium">Purchase Order Items</label>
                <Button type="button" variant="outline" size="sm" onClick={addPoItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {poItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <label className="text-xs">SKU</label>
                      <Input
                        placeholder="SKU"
                        value={item.sku}
                        onChange={(e) => updatePoItem(index, "sku", e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-xs">Product Name</label>
                      <Input
                        placeholder="Product name"
                        value={item.productName}
                        onChange={(e) => updatePoItem(index, "productName", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs">Quantity</label>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updatePoItem(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs">Unit Cost</label>
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
              <label htmlFor="notes">Notes</label>
              <Input
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
  )
}
