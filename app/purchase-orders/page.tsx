"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Plus, Package, DollarSign, TrendingUp, Calendar, Trash2, Eye, Download, Edit } from "lucide-react"
import { supabaseStore, type PurchaseOrder } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

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

  const handleEditPO = async () => {
    if (!editingPO) return

    // Validate form data
    if (!formData.supplier || !formData.poDate) {
      alert("Please fill in required fields (Supplier and PO Date)")
      return
    }

    try {
      // Prepare items data - filter out empty items
      const validItems = poItems
        .filter((item) => item.sku.trim() && item.productName.trim())
        .map((item) => ({
          sku: item.sku.trim(),
          product_name: item.productName.trim(),
          quantity: Number.parseInt(item.quantity) || 0,
          unit_cost: Number.parseFloat(item.unitCost) || 0,
        }))

      const updateData = {
        supplier_name: formData.supplier,
        po_date: formData.poDate,
        delivery_cost: Number.parseFloat(formData.deliveryCost) || 0,
        notes: formData.notes,
        items: validItems,
      }

      console.log("Updating PO with data:", updateData)

      await supabaseStore.updatePurchaseOrderWithItems(editingPO.id, updateData)

      // Refresh the purchase orders list
      const updatedPOs = await supabaseStore.getPurchaseOrders()
      setPurchaseOrders(updatedPOs)

      // Reset form and close dialog
      setFormData({ supplier: "", poDate: "", deliveryCost: "", notes: "" })
      setPoItems([{ sku: "", productName: "", quantity: "", unitCost: "" }])
      setIsEditPOOpen(false)
      setEditingPO(null)

      alert(`Purchase Order ${editingPO.po_number} updated successfully!`)
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

    // Populate items for editing
    const editItems = po.items.map((item) => ({
      sku: item.sku,
      productName: item.product_name,
      quantity: item.quantity.toString(),
      unitCost: item.unit_cost.toString(),
    }))

    // Ensure at least one empty row
    if (editItems.length === 0) {
      editItems.push({ sku: "", productName: "", quantity: "", unitCost: "" })
    }

    setPoItems(editItems)
    setIsEditPOOpen(true)
  }

  const handleUpdateStatus = async (po: PurchaseOrder, newStatus: PurchaseOrder["status"]) => {
    try {
      console.log(`Updating PO ${po.po_number} status from ${po.status} to ${newStatus}`)

      await supabaseStore.updatePurchaseOrder(po.id, { status: newStatus })
      const updatedPOs = await supabaseStore.getPurchaseOrders()
      setPurchaseOrders(updatedPOs)

      if (newStatus === "Delivered" && po.status !== "Delivered") {
        alert(
          `Purchase Order ${po.po_number} marked as delivered! Inventory has been updated with ${po.items.reduce((sum, item) => sum + item.quantity, 0)} items.`,
        )
      } else {
        alert(`Purchase Order ${po.po_number} status updated to ${newStatus}`)
      }
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

  const handleExportPO = (po: PurchaseOrder) => {
    const { itemCount, totalCost } = calculateOrderStats(po)
    const shippingCostPerLineItem = po.items.length > 0 ? po.delivery_cost / po.items.length : 0

    // Create CSV content with headers
    const csvContent = [
      // PO Header Information
      ["Purchase Order Export"],
      [""],
      ["PO Number", po.po_number],
      ["Supplier", po.supplier_name],
      ["Date", new Date(po.po_date).toLocaleDateString()],
      ["Status", po.status],
      ["Delivery Cost", `$${po.delivery_cost.toFixed(2)}`],
      ["Total Cost", `$${totalCost.toFixed(2)}`],
      ["Notes", po.notes || ""],
      [""],
      // Items Header
      ["Items"],
      ["SKU", "Product Name", "Quantity", "Unit Cost", "Shipping/Unit", "Total Unit Cost", "Line Total"],
      // Items Data
      ...po.items.map((item) => [
        item.sku,
        item.product_name,
        item.quantity.toString(),
        `$${item.unit_cost.toFixed(2)}`,
        `$${(shippingCostPerLineItem / item.quantity).toFixed(2)}`,
        `$${(item.unit_cost + shippingCostPerLineItem / item.quantity).toFixed(2)}`,
        `$${item.total_cost.toFixed(2)}`,
      ]),
      [""],
      // Summary
      ["Summary"],
      ["Total Items", itemCount.toString()],
      ["Total Quantity", po.items.reduce((sum, item) => sum + item.quantity, 0).toString()],
      ["Subtotal", `$${po.items.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}`],
      ["Delivery Cost", `$${po.delivery_cost.toFixed(2)}`],
      [
        "Shipping Cost Per Unit",
        `$${(shippingCostPerLineItem / po.items.reduce((sum, item) => sum + item.quantity, 0)).toFixed(2)}`,
      ],
      ["Grand Total", `$${totalCost.toFixed(2)}`],
    ]

    // Convert to CSV string
    const csvString = csvContent.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    // Create and download file
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `PO_${po.po_number}_${new Date().toISOString().split("T")[0]}.csv`)
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
          <h1 className="text-lg font-semibold">Purchase Orders</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-64">
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
          <h1 className="text-lg font-semibold">Purchase Orders</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-64">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading purchase orders</h3>
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
          <h1 className="text-lg font-semibold">Purchase Orders</h1>
          <Button onClick={() => setIsNewPOOpen(true)} size="sm" className="lg:hidden">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-64">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Purchase Orders</h1>
          <Button onClick={() => setIsNewPOOpen(true)} size="sm" className="hidden lg:flex">
            <Plus className="w-4 h-4 mr-2" />
            New PO
          </Button>
        </div>

        {/* Compact Stats Cards - Mobile responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

        {/* Mobile Card View / Desktop Table View */}
        <div className="lg:hidden space-y-3">
          {filteredOrders.length === 0 ? (
            <Card className="p-6 text-center">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No purchase orders found." : "No purchase orders yet."}</p>
              {!searchTerm && (
                <Button onClick={() => setIsNewPOOpen(true)} className="mt-2" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First PO
                </Button>
              )}
            </Card>
          ) : (
            filteredOrders.map((po) => {
              const { itemCount, totalCost } = calculateOrderStats(po)
              const isEditable = po.status.toLowerCase() !== "delivered"

              return (
                <Card key={po.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{po.po_number}</h3>
                      <p className="text-sm text-gray-600 truncate">{po.supplier_name}</p>
                    </div>
                    <Badge className={`${getStatusColor(po.status)} text-xs`}>{po.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <p>{new Date(po.po_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Items:</span>
                      <p>{itemCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <p className="font-medium">${totalCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <Select
                        value={po.status}
                        onValueChange={(newStatus) => handleUpdateStatus(po, newStatus as PurchaseOrder["status"])}
                      >
                        <SelectTrigger className="w-full h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Transit">In Transit</SelectItem>
                          <SelectItem value="Delivered">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {isEditable && (
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(po)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedPO(po)
                        setIsViewPOOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleExportPO(po)}>
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Desktop Table View */}
        <Card className="hidden lg:block">
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
                  <TableHead className="w-[160px] text-right">Actions</TableHead>
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
                    const isEditable = po.status.toLowerCase() !== "delivered"

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
                          <div className="flex justify-end gap-1 items-center">
                            <Select
                              value={po.status}
                              onValueChange={(newStatus) =>
                                handleUpdateStatus(po, newStatus as PurchaseOrder["status"])
                              }
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Transit">In Transit</SelectItem>
                                <SelectItem value="Delivered">Delivered</SelectItem>
                              </SelectContent>
                            </Select>

                            {isEditable && (
                              <Button variant="ghost" size="sm" onClick={() => openEditDialog(po)} title="Edit PO">
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPO(po)
                                setIsViewPOOpen(true)
                              }}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleExportPO(po)} title="Export PO">
                              <Download className="w-4 h-4" />
                            </Button>
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

        {/* View PO Dialog - Mobile responsive */}
        <Dialog open={isViewPOOpen} onOpenChange={setIsViewPOOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col w-[95vw] lg:w-full">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>Purchase Order Details - {selectedPO?.po_number}</DialogTitle>
                  <DialogDescription className="mt-1">
                    {selectedPO &&
                      `${selectedPO.items.length} items • Total: $${calculateOrderStats(selectedPO).totalCost.toFixed(2)}`}
                  </DialogDescription>
                </div>
                {selectedPO && (
                  <Button variant="outline" size="sm" onClick={() => handleExportPO(selectedPO)}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </DialogHeader>

            {selectedPO && (
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                {/* Header Info - Mobile responsive grid */}
                <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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

                {/* Notes - Fixed height if present */}
                {selectedPO.notes && (
                  <div className="flex-shrink-0">
                    <p className="text-gray-600 text-sm">Notes</p>
                    <p className="text-sm bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">{selectedPO.notes}</p>
                  </div>
                )}

                {/* Items Table - Mobile responsive */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <p className="text-gray-600 text-sm mb-2 flex-shrink-0">Items ({selectedPO.items.length})</p>

                  {/* Mobile Cards View */}
                  <div className="lg:hidden flex-1 overflow-y-auto space-y-3">
                    {selectedPO.items.map((item, index) => {
                      const shippingCostPerLineItem =
                        selectedPO.items.length > 0 ? selectedPO.delivery_cost / selectedPO.items.length : 0
                      const shippingCostPerUnit = item.quantity > 0 ? shippingCostPerLineItem / item.quantity : 0
                      const totalUnitCost = item.unit_cost + shippingCostPerUnit

                      return (
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
                                <span className="text-gray-600">Unit Cost:</span>
                                <p>${item.unit_cost.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Shipping/Unit:</span>
                                <p>${shippingCostPerUnit.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Total Unit:</span>
                                <p className="font-medium">${totalUnitCost.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-gray-600">Line Total:</span>
                                <p className="font-medium">${item.total_cost.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden lg:block flex-1 border rounded-lg">
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10 border-b">
                          <TableRow>
                            <TableHead className="w-[100px]">SKU</TableHead>
                            <TableHead className="min-w-[200px]">Product</TableHead>
                            <TableHead className="w-[80px] text-right">Qty</TableHead>
                            <TableHead className="w-[100px] text-right">Unit Cost</TableHead>
                            <TableHead className="w-[100px] text-right">Shipping/Unit</TableHead>
                            <TableHead className="w-[120px] text-right">Total Unit Cost</TableHead>
                            <TableHead className="w-[100px] text-right">Line Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedPO.items.map((item, index) => {
                            const shippingCostPerLineItem =
                              selectedPO.items.length > 0 ? selectedPO.delivery_cost / selectedPO.items.length : 0
                            const shippingCostPerUnit = item.quantity > 0 ? shippingCostPerLineItem / item.quantity : 0
                            const totalUnitCost = item.unit_cost + shippingCostPerUnit

                            return (
                              <TableRow key={item.id || index} className="hover:bg-gray-50">
                                <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                                <TableCell className="max-w-[200px]">
                                  <div className="truncate" title={item.product_name}>
                                    {item.product_name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">${item.unit_cost.toFixed(2)}</TableCell>
                                <TableCell className="text-right">${shippingCostPerUnit.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">${totalUnitCost.toFixed(2)}</TableCell>
                                <TableCell className="text-right">${item.total_cost.toFixed(2)}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </div>

                {/* Summary - Fixed at bottom, mobile responsive */}
                <div className="flex-shrink-0 bg-gray-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Items</p>
                      <p className="font-medium">{selectedPO.items.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Quantity</p>
                      <p className="font-medium">{selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Subtotal</p>
                      <p className="font-medium">
                        ${selectedPO.items.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Grand Total</p>
                      <p className="font-bold text-lg">${calculateOrderStats(selectedPO).totalCost.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create New PO Dialog - Mobile responsive */}
        <Dialog open={isNewPOOpen} onOpenChange={setIsNewPOOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] lg:w-full">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
              <DialogDescription>Add a new purchase order to track inventory costs</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

              {/* PO Items Section - Mobile responsive */}
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
                    <div key={index} className="space-y-3 lg:space-y-0">
                      {/* Mobile Layout */}
                      <div className="lg:hidden space-y-3 p-3 border rounded-lg">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs">SKU</label>
                            <Input
                              placeholder="SKU"
                              value={item.sku}
                              onChange={(e) => updatePoItem(index, "sku", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs">Quantity</label>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updatePoItem(index, "quantity", e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs">Product Name</label>
                          <Input
                            placeholder="Product name"
                            value={item.productName}
                            onChange={(e) => updatePoItem(index, "productName", e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs">Unit Cost</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unitCost}
                              onChange={(e) => updatePoItem(index, "unitCost", e.target.value)}
                            />
                          </div>
                          <div className="flex items-end">
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
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:grid grid-cols-12 gap-2 items-end">
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
            <div className="flex flex-col-reverse lg:flex-row justify-end space-y-2 space-y-reverse lg:space-y-0 lg:space-x-2">
              <Button variant="outline" onClick={() => setIsNewPOOpen(false)} className="w-full lg:w-auto">
                Cancel
              </Button>
              <Button onClick={handleCreatePO} className="w-full lg:w-auto">
                Create PO
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit PO Dialog - Mobile responsive */}
        <Dialog open={isEditPOOpen} onOpenChange={setIsEditPOOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] lg:w-full">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order - {editingPO?.po_number}</DialogTitle>
              <DialogDescription>Modify purchase order details and items</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-supplier">Supplier *</label>
                  <Input
                    id="edit-supplier"
                    placeholder="Supplier name"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-po-date">PO Date *</label>
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
                <label htmlFor="edit-delivery-cost">Delivery Cost</label>
                <Input
                  id="edit-delivery-cost"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.deliveryCost}
                  onChange={(e) => setFormData({ ...formData, deliveryCost: e.target.value })}
                />
              </div>

              {/* PO Items Section - Mobile responsive */}
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
                    <div key={index} className="space-y-3 lg:space-y-0">
                      {/* Mobile Layout */}
                      <div className="lg:hidden space-y-3 p-3 border rounded-lg">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs">SKU</label>
                            <Input
                              placeholder="SKU"
                              value={item.sku}
                              onChange={(e) => updatePoItem(index, "sku", e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-xs">Quantity</label>
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => updatePoItem(index, "quantity", e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs">Product Name</label>
                          <Input
                            placeholder="Product name"
                            value={item.productName}
                            onChange={(e) => updatePoItem(index, "productName", e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs">Unit Cost</label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.unitCost}
                              onChange={(e) => updatePoItem(index, "unitCost", e.target.value)}
                            />
                          </div>
                          <div className="flex items-end">
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
                      </div>

                      {/* Desktop Layout */}
                      <div className="hidden lg:grid grid-cols-12 gap-2 items-end">
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
                <label htmlFor="edit-notes">Notes</label>
                <Input
                  id="edit-notes"
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col-reverse lg:flex-row justify-end space-y-2 space-y-reverse lg:space-y-0 lg:space-x-2">
              <Button variant="outline" onClick={() => setIsEditPOOpen(false)} className="w-full lg:w-auto">
                Cancel
              </Button>
              <Button onClick={handleEditPO} className="w-full lg:w-auto">
                Update PO
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
