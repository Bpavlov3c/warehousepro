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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Plus, Edit, Trash2, Package, Calendar, DollarSign, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface PurchaseOrderItem {
  id?: string
  productName: string
  sku: string
  quantity: number
  unitCost: number
  deliveryCostPerUnit?: number
  totalCost?: number
}

interface PurchaseOrder {
  id: string
  supplier: string
  orderDate: string
  expectedDelivery: string
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
  items: PurchaseOrderItem[]
  totalCost: number
  notes?: string
  createdAt: string
  updatedAt: string
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [formData, setFormData] = useState({
    supplier: "",
    orderDate: "",
    expectedDelivery: "",
    status: "pending" as const,
    deliveryCost: 0,
    notes: "",
  })
  const [items, setItems] = useState<PurchaseOrderItem[]>([{ productName: "", sku: "", quantity: 1, unitCost: 0 }])

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/purchase-orders")
      if (!response.ok) {
        throw new Error("Failed to fetch purchase orders")
      }
      const data = await response.json()
      setPurchaseOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      toast.error("Failed to fetch purchase orders")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      supplier: "",
      orderDate: "",
      expectedDelivery: "",
      status: "pending",
      deliveryCost: 0,
      notes: "",
    })
    setItems([{ productName: "", sku: "", quantity: 1, unitCost: 0 }])
    setEditingOrder(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.supplier || !formData.orderDate || !formData.expectedDelivery) {
      toast.error("Please fill in all required fields")
      return
    }

    if (items.some((item) => !item.productName || !item.sku || item.quantity <= 0 || item.unitCost < 0)) {
      toast.error("Please fill in all item details correctly")
      return
    }

    try {
      const orderData = {
        ...formData,
        items,
        deliveryCost: formData.deliveryCost,
      }

      const url = editingOrder ? `/api/purchase-orders/${editingOrder.id}` : "/api/purchase-orders"
      const method = editingOrder ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${editingOrder ? "update" : "create"} purchase order`)
      }

      const result = await response.json()

      if (editingOrder) {
        setPurchaseOrders((prev) => prev.map((po) => (po.id === result.id ? result : po)))
        toast.success("Purchase order updated successfully")
      } else {
        setPurchaseOrders((prev) => [result, ...prev])
        toast.success("Purchase order created successfully")
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order)
    setFormData({
      supplier: order.supplier,
      orderDate: order.orderDate,
      expectedDelivery: order.expectedDelivery,
      status: order.status,
      deliveryCost: 0, // We don't store delivery cost separately, so default to 0
      notes: order.notes || "",
    })
    setItems(
      order.items.map((item) => ({
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
    )
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete purchase order")
      }

      setPurchaseOrders((prev) => prev.filter((po) => po.id !== id))
      toast.success("Purchase order deleted successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete purchase order")
    }
  }

  const addItem = () => {
    setItems([...items, { productName: "", sku: "", quantity: 1, unitCost: 0 }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    const updatedItems = [...items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }
    setItems(updatedItems)
  }

  const calculateTotal = () => {
    const itemsTotal = items.reduce((sum, item) => {
      return sum + item.quantity * item.unitCost
    }, 0)
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    const deliveryCostPerUnit = totalQuantity > 0 ? formData.deliveryCost / totalQuantity : 0
    return itemsTotal + formData.deliveryCost
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading purchase orders...</p>
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
            <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchPurchaseOrders} className="mt-4">
              Try Again
            </Button>
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
          <p className="text-gray-600">Manage your purchase orders and track deliveries</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "Edit Purchase Order" : "Create New Purchase Order"}</DialogTitle>
              <DialogDescription>
                {editingOrder
                  ? "Update the purchase order details below."
                  : "Fill in the details to create a new purchase order."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Enter supplier name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orderDate">Order Date *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => setFormData({ ...formData, orderDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="expectedDelivery">Expected Delivery *</Label>
                  <Input
                    id="expectedDelivery"
                    type="date"
                    value={formData.expectedDelivery}
                    onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryCost">Delivery Cost</Label>
                  <Input
                    id="deliveryCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deliveryCost}
                    onChange={(e) => setFormData({ ...formData, deliveryCost: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Items *</Label>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label>Product Name</Label>
                        <Input
                          value={item.productName}
                          onChange={(e) => updateItem(index, "productName", e.target.value)}
                          placeholder="Product name"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>SKU</Label>
                        <Input
                          value={item.sku}
                          onChange={(e) => updateItem(index, "sku", e.target.value)}
                          placeholder="SKU"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, "quantity", Number.parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Unit Cost</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitCost}
                          onChange={(e) => updateItem(index, "unitCost", Number.parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>Total</Label>
                        <div className="text-sm font-medium py-2">${(item.quantity * item.unitCost).toFixed(2)}</div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Cost:</span>
                    <span className="text-lg font-bold">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingOrder ? "Update Order" : "Create Order"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "pending").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${purchaseOrders.reduce((sum, po) => sum + po.totalCost, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
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
          <CardDescription>A list of all purchase orders with their current status and details.</CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No purchase orders found</p>
              <p className="text-sm text-gray-400">Create your first purchase order to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.supplier}</TableCell>
                    <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(order.expectedDelivery).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[order.status]}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell>${order.totalCost.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(order)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the purchase order.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(order.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
