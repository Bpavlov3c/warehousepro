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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Plus, Edit, Trash2, Package, Calendar, AlertTriangle, FileX, Truck } from "lucide-react"
import { toast } from "sonner"

interface PurchaseOrder {
  id: number
  po_number: string
  supplier_name: string
  po_date: string
  delivery_cost: number
  status: "Pending" | "Approved" | "Delivered" | "Cancelled"
  notes?: string
  items?: POItem[]
  created_at: string
  updated_at: string
}

interface POItem {
  id: number
  po_id: number
  sku: string
  product_name: string
  quantity: number
  unit_cost: number
  total_cost: number
  created_at: string
}

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-blue-100 text-blue-800",
  Delivered: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  const [formData, setFormData] = useState({
    po_number: "",
    supplier_name: "",
    po_date: "",
    delivery_cost: "",
    status: "Pending" as const,
    notes: "",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchPurchaseOrders(currentPage)
  }, [currentPage])

  const fetchPurchaseOrders = async (page: number) => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔄 Fetching purchase orders for page ${page}...`)

      const response = await fetch(`/api/purchase-orders?page=${page}&limit=${itemsPerPage}`)

      // Helper to safely extract the body regardless of Content-Type
      const safeParse = async () => {
        try {
          if (response.headers.get("content-type")?.includes("application/json")) {
            return await response.json()
          }
          return await response.text()
        } catch {
          return await response.text()
        }
      }

      if (!response.ok) {
        const errorPayload = await safeParse()
        const message =
          typeof errorPayload === "string"
            ? errorPayload
            : errorPayload?.details || errorPayload?.error || `HTTP error! status: ${response.status}`
        throw new Error(message)
      }

      const result = await safeParse()
      console.log("✅ Received data:", result)

      setPurchaseOrders(result.data || [])
      setTotalItems(result.total || 0)
      setTotalPages(Math.ceil((result.total || 0) / itemsPerPage))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error("❌ Fetch error:", err)
      setError(errorMessage)
      toast.error("Failed to fetch purchase orders: " + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.po_number.trim()) {
      errors.po_number = "PO Number is required"
    }
    if (!formData.supplier_name.trim()) {
      errors.supplier_name = "Supplier Name is required"
    }
    if (!formData.po_date) {
      errors.po_date = "PO Date is required"
    }
    if (formData.delivery_cost && isNaN(Number.parseFloat(formData.delivery_cost))) {
      errors.delivery_cost = "Delivery Cost must be a valid number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setFormData({
      po_number: "",
      supplier_name: "",
      po_date: "",
      delivery_cost: "",
      status: "Pending",
      notes: "",
    })
    setEditingOrder(null)
    setFormErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the form errors")
      return
    }

    try {
      const url = editingOrder ? `/api/purchase-orders/${editingOrder.id}` : "/api/purchase-orders"
      const method = editingOrder ? "PUT" : "POST"

      console.log(`🔄 ${method} request to ${url}:`, formData)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          delivery_cost: formData.delivery_cost ? Number.parseFloat(formData.delivery_cost) : 0,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save purchase order")
      }

      const result = await response.json()
      console.log("✅ Save result:", result)

      toast.success(editingOrder ? "Purchase order updated successfully" : "Purchase order created successfully")

      setIsDialogOpen(false)
      resetForm()

      // Refresh the current page
      await fetchPurchaseOrders(currentPage)
    } catch (err) {
      console.error("❌ Save error:", err)
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleEdit = (order: PurchaseOrder) => {
    setEditingOrder(order)
    setFormData({
      po_number: order.po_number,
      supplier_name: order.supplier_name,
      po_date: order.po_date,
      delivery_cost: order.delivery_cost.toString(),
      status: order.status,
      notes: order.notes || "",
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      console.log(`🗑️ Deleting purchase order ${id}`)

      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete purchase order")
      }

      toast.success("Purchase order deleted successfully")

      // Refresh the current page
      await fetchPurchaseOrders(currentPage)
    } catch (err) {
      console.error("❌ Delete error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete purchase order")
    }
  }

  const formatAmount = (amount: number | null | undefined): string => {
    const safeAmount = amount || 0
    return safeAmount.toFixed(2)
  }

  const calculateTotalValue = () => {
    return purchaseOrders.reduce((sum, po) => sum + (po.delivery_cost || 0), 0)
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
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => fetchPurchaseOrders(currentPage)}>Try Again</Button>
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingOrder ? "Edit Purchase Order" : "Create New Purchase Order"}</DialogTitle>
              <DialogDescription>
                {editingOrder
                  ? "Update the purchase order details below."
                  : "Fill in the details to create a new purchase order."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="po_number">PO Number *</Label>
                  <Input
                    id="po_number"
                    value={formData.po_number}
                    onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                    placeholder="PO-2024-001"
                    className={formErrors.po_number ? "border-red-500" : ""}
                  />
                  {formErrors.po_number && <p className="text-red-500 text-sm mt-1">{formErrors.po_number}</p>}
                </div>
                <div>
                  <Label htmlFor="supplier_name">Supplier Name *</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    placeholder="Enter supplier name"
                    className={formErrors.supplier_name ? "border-red-500" : ""}
                  />
                  {formErrors.supplier_name && <p className="text-red-500 text-sm mt-1">{formErrors.supplier_name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="po_date">PO Date *</Label>
                  <Input
                    id="po_date"
                    type="date"
                    value={formData.po_date}
                    onChange={(e) => setFormData({ ...formData, po_date: e.target.value })}
                    className={formErrors.po_date ? "border-red-500" : ""}
                  />
                  {formErrors.po_date && <p className="text-red-500 text-sm mt-1">{formErrors.po_date}</p>}
                </div>
                <div>
                  <Label htmlFor="delivery_cost">Delivery Cost</Label>
                  <Input
                    id="delivery_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_cost}
                    onChange={(e) => setFormData({ ...formData, delivery_cost: e.target.value })}
                    placeholder="0.00"
                    className={formErrors.delivery_cost ? "border-red-500" : ""}
                  />
                  {formErrors.delivery_cost && <p className="text-red-500 text-sm mt-1">{formErrors.delivery_cost}</p>}
                </div>
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
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "Pending").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Delivery Cost</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatAmount(calculateTotalValue())}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchaseOrders.filter((po) => po.status === "Delivered").length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            {totalItems > 0
              ? `A list of all purchase orders with their current status and details. Showing ${purchaseOrders.length} of ${totalItems} items.`
              : "No purchase orders found in the database."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <div className="text-center py-16">
              <FileX className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Records Available</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                There are currently no purchase orders in the database. Get started by creating your first purchase
                order.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="mx-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create First Purchase Order
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>PO Date</TableHead>
                      <TableHead>Delivery Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.po_number}</TableCell>
                        <TableCell>{order.supplier_name}</TableCell>
                        <TableCell>{new Date(order.po_date).toLocaleDateString()}</TableCell>
                        <TableCell>${formatAmount(order.delivery_cost)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>{order.status}</Badge>
                        </TableCell>
                        <TableCell>{order.items ? order.items.length : 0} items</TableCell>
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
                                    This action cannot be undone. This will permanently delete the purchase order "
                                    {order.po_number}".
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
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage > 1) setCurrentPage(currentPage - 1)
                          }}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault()
                              setCurrentPage(page)
                            }}
                            isActive={currentPage === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                          }}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
