"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, Edit, Trash2, Eye, Package, Calendar, Truck } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  sku: string
  name: string
  category: string
  supplier: string
  unit_cost: number
  current_stock: number
  reorder_point: number
}

interface PurchaseOrderItem {
  id?: string
  product_id: string
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  delivery_cost_per_unit?: number
  total_cost?: number
}

interface PurchaseOrder {
  id?: string
  po_number: string
  supplier: string
  status: "draft" | "sent" | "delivered"
  order_date: string
  expected_delivery: string | null
  delivery_cost: number
  notes: string | null
  items: PurchaseOrderItem[]
  created_at?: string
  updated_at?: string
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [formData, setFormData] = useState<PurchaseOrder>({
    po_number: "",
    supplier: "",
    status: "draft",
    order_date: new Date().toISOString().split("T")[0],
    expected_delivery: null,
    delivery_cost: 0,
    notes: null,
    items: [],
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [poResponse, productsResponse] = await Promise.all([fetch("/api/purchase-orders"), fetch("/api/inventory")])

      if (!poResponse.ok) {
        throw new Error(`Failed to fetch purchase orders: ${poResponse.statusText}`)
      }
      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.statusText}`)
      }

      const poData = await poResponse.json()
      const productsData = await productsResponse.json()

      setPurchaseOrders(poData)
      setProducts(productsData)
    } catch (error) {
      console.error("Error loading data:", error)
      setError(error instanceof Error ? error.message : "Failed to load data")
      toast.error("Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const generatePONumber = () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")
    return `PO-${year}${month}${day}-${random}`
  }

  const resetForm = () => {
    setFormData({
      po_number: generatePONumber(),
      supplier: "",
      status: "draft",
      order_date: new Date().toISOString().split("T")[0],
      expected_delivery: null,
      delivery_cost: 0,
      notes: null,
      items: [],
    })
  }

  const handleCreate = () => {
    resetForm()
    setIsCreateDialogOpen(true)
  }

  const handleEdit = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setFormData({
      ...po,
      order_date: po.order_date
        ? new Date(po.order_date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      expected_delivery: po.expected_delivery ? new Date(po.expected_delivery).toISOString().split("T")[0] : null,
    })
    setIsEditDialogOpen(true)
  }

  const handleView = (po: PurchaseOrder) => {
    setSelectedPO(po)
    setIsViewDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.items.length === 0) {
      toast.error("Please add at least one item to the purchase order")
      return
    }

    try {
      const url = selectedPO ? `/api/purchase-orders/${selectedPO.id}` : "/api/purchase-orders"
      const method = selectedPO ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          purchaseOrder: {
            po_number: formData.po_number,
            supplier: formData.supplier,
            status: formData.status,
            order_date: formData.order_date,
            expected_delivery: formData.expected_delivery,
            delivery_cost: formData.delivery_cost,
            notes: formData.notes,
          },
          items: formData.items,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save purchase order")
      }

      toast.success(selectedPO ? "Purchase order updated successfully" : "Purchase order created successfully")
      setIsCreateDialogOpen(false)
      setIsEditDialogOpen(false)
      setSelectedPO(null)
      await loadData()
    } catch (error) {
      console.error("Error saving purchase order:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save purchase order")
    }
  }

  const handleDelete = async (po: PurchaseOrder) => {
    try {
      const response = await fetch(`/api/purchase-orders/${po.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete purchase order")
      }

      toast.success("Purchase order deleted successfully")
      await loadData()
    } catch (error) {
      console.error("Error deleting purchase order:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete purchase order")
    }
  }

  const handleMarkDelivered = async (po: PurchaseOrder) => {
    try {
      const response = await fetch(`/api/purchase-orders/${po.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          markAsDelivered: true,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to mark as delivered")
      }

      toast.success("Purchase order marked as delivered and inventory updated")
      await loadData()
    } catch (error) {
      console.error("Error marking as delivered:", error)
      toast.error(error instanceof Error ? error.message : "Failed to mark as delivered")
    }
  }

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: "",
          sku: "",
          product_name: "",
          quantity: 1,
          unit_cost: 0,
        },
      ],
    }))
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value }

          // Auto-fill product details when product is selected
          if (field === "product_id" && value) {
            const product = products.find((p) => p.id === value)
            if (product) {
              updatedItem.sku = product.sku
              updatedItem.product_name = product.name
              updatedItem.unit_cost = product.unit_cost
            }
          }

          return updatedItem
        }
        return item
      }),
    }))
  }

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>
      case "sent":
        return <Badge variant="default">Sent</Badge>
      case "delivered":
        return (
          <Badge variant="outline" className="border-green-500 text-green-700">
            Delivered
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const calculateTotal = (items: PurchaseOrderItem[], deliveryCost = 0) => {
    const itemsTotal = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0)
    return itemsTotal + deliveryCost
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading purchase orders...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={loadData}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage your purchase orders and track deliveries</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Purchase Order
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total POs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "draft").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "sent").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "delivered").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>A list of all purchase orders with their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first purchase order.</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Purchase Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.supplier}</TableCell>
                    <TableCell>{getStatusBadge(po.status)}</TableCell>
                    <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : "Not set"}
                    </TableCell>
                    <TableCell>${calculateTotal(po.items, po.delivery_cost).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleView(po)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {po.status !== "delivered" && (
                          <Button variant="outline" size="sm" onClick={() => handleEdit(po)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {po.status === "sent" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Truck className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mark as Delivered</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will mark the purchase order as delivered and update inventory levels. This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleMarkDelivered(po)}>
                                  Mark as Delivered
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {po.status === "draft" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the purchase order.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(po)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false)
            setIsEditDialogOpen(false)
            setSelectedPO(null)
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPO ? "Edit Purchase Order" : "Create Purchase Order"}</DialogTitle>
            <DialogDescription>
              {selectedPO ? "Update the purchase order details" : "Create a new purchase order for your supplier"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="po_number">PO Number</Label>
                <Input
                  id="po_number"
                  value={formData.po_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, po_number: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData((prev) => ({ ...prev, supplier: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "draft" | "sent" | "delivered") =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    {selectedPO && <SelectItem value="delivered">Delivered</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="order_date">Order Date</Label>
                <Input
                  id="order_date"
                  type="date"
                  value={formData.order_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, order_date: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="expected_delivery">Expected Delivery</Label>
                <Input
                  id="expected_delivery"
                  type="date"
                  value={formData.expected_delivery || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expected_delivery: e.target.value || null,
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="delivery_cost">Delivery Cost</Label>
              <Input
                id="delivery_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.delivery_cost}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    delivery_cost: Number.parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    notes: e.target.value || null,
                  }))
                }
                rows={3}
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <Label className="text-base font-semibold">Items</Label>
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>

              <ScrollArea className="h-64 border rounded-md p-4">
                {formData.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No items added yet. Click "Add Item" to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Item {index + 1}</h4>
                          <Button type="button" variant="outline" size="sm" onClick={() => removeItem(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Product</Label>
                            <Select
                              value={item.product_id}
                              onValueChange={(value) => updateItem(index, "product_id", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Unit Cost</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_cost}
                              onChange={(e) => updateItem(index, "unit_cost", Number.parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div>
                            <Label>Total</Label>
                            <Input value={`$${(item.quantity * item.unit_cost).toFixed(2)}`} disabled />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total (including delivery):</span>
                <span>${calculateTotal(formData.items, formData.delivery_cost).toFixed(2)}</span>
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">{selectedPO ? "Update Purchase Order" : "Create Purchase Order"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>View purchase order information and items</DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">PO Number</Label>
                  <p className="text-sm">{selectedPO.po_number}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Supplier</Label>
                  <p className="text-sm">{selectedPO.supplier}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedPO.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Order Date</Label>
                  <p className="text-sm">{new Date(selectedPO.order_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Expected Delivery</Label>
                  <p className="text-sm">
                    {selectedPO.expected_delivery
                      ? new Date(selectedPO.expected_delivery).toLocaleDateString()
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Delivery Cost</Label>
                  <p className="text-sm">${selectedPO.delivery_cost?.toFixed(2) || "0.00"}</p>
                </div>
              </div>

              {selectedPO.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1">{selectedPO.notes}</p>
                </div>
              )}

              <div>
                <Label className="text-base font-semibold">Items</Label>
                <ScrollArea className="h-64 mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Delivery Cost/Unit</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>${item.unit_cost?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>${item.delivery_cost_per_unit?.toFixed(2) || "0.00"}</TableCell>
                          <TableCell>
                            ${item.total_cost?.toFixed(2) || (item.quantity * item.unit_cost).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>${calculateTotal(selectedPO.items, selectedPO.delivery_cost).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
