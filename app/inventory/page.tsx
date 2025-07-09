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
import { Plus, Edit, Trash2, Package, AlertTriangle, TrendingDown, DollarSign, FileX } from "lucide-react"
import { toast } from "sonner"

interface InventoryItem {
  id: number
  sku: string
  name: string
  description?: string
  category: string
  quantity: number
  unit_price: number
  reorder_level: number
  supplier: string
  created_at: string
  updated_at: string
}

const categories = [
  "Electronics",
  "Clothing",
  "Food & Beverage",
  "Home & Garden",
  "Sports & Outdoors",
  "Books",
  "Toys & Games",
  "Health & Beauty",
  "Automotive",
  "Office Supplies",
  "Other",
]

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    category: "",
    quantity: "",
    unit_price: "",
    reorder_level: "",
    supplier: "",
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchInventoryItems(currentPage)
  }, [currentPage])

  const fetchInventoryItems = async (page: number) => {
    try {
      setLoading(true)
      setError(null)
      console.log(`🔄 Fetching inventory items for page ${page}...`)

      const response = await fetch(`/api/inventory?page=${page}&limit=${itemsPerPage}`)

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

      setInventoryItems(result.data || [])
      setTotalItems(result.total || 0)
      setTotalPages(Math.ceil((result.total || 0) / itemsPerPage))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      console.error("❌ Fetch error:", err)
      setError(errorMessage)
      toast.error("Failed to fetch inventory items: " + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!formData.sku.trim()) {
      errors.sku = "SKU is required"
    }
    if (!formData.name.trim()) {
      errors.name = "Name is required"
    }
    if (!formData.category) {
      errors.category = "Category is required"
    }
    if (!formData.supplier.trim()) {
      errors.supplier = "Supplier is required"
    }
    if (formData.quantity && isNaN(Number.parseInt(formData.quantity))) {
      errors.quantity = "Quantity must be a valid number"
    }
    if (formData.unit_price && isNaN(Number.parseFloat(formData.unit_price))) {
      errors.unit_price = "Unit price must be a valid number"
    }
    if (formData.reorder_level && isNaN(Number.parseInt(formData.reorder_level))) {
      errors.reorder_level = "Reorder level must be a valid number"
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const resetForm = () => {
    setFormData({
      sku: "",
      name: "",
      description: "",
      category: "",
      quantity: "",
      unit_price: "",
      reorder_level: "",
      supplier: "",
    })
    setEditingItem(null)
    setFormErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the form errors")
      return
    }

    try {
      const url = editingItem ? `/api/inventory/${editingItem.id}` : "/api/inventory"
      const method = editingItem ? "PUT" : "POST"

      console.log(`🔄 ${method} request to ${url}:`, formData)

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          quantity: formData.quantity ? Number.parseInt(formData.quantity) : 0,
          unit_price: formData.unit_price ? Number.parseFloat(formData.unit_price) : 0,
          reorder_level: formData.reorder_level ? Number.parseInt(formData.reorder_level) : 0,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save inventory item")
      }

      const result = await response.json()
      console.log("✅ Save result:", result)

      toast.success(editingItem ? "Inventory item updated successfully" : "Inventory item created successfully")

      setIsDialogOpen(false)
      resetForm()

      // Refresh the current page
      await fetchInventoryItems(currentPage)
    } catch (err) {
      console.error("❌ Save error:", err)
      toast.error(err instanceof Error ? err.message : "An error occurred")
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setFormData({
      sku: item.sku,
      name: item.name,
      description: item.description || "",
      category: item.category,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      reorder_level: item.reorder_level.toString(),
      supplier: item.supplier,
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: number) => {
    try {
      console.log(`🗑️ Deleting inventory item ${id}`)

      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete inventory item")
      }

      toast.success("Inventory item deleted successfully")

      // Refresh the current page
      await fetchInventoryItems(currentPage)
    } catch (err) {
      console.error("❌ Delete error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to delete inventory item")
    }
  }

  const formatPrice = (price: number | null | undefined): string => {
    const safePrice = price || 0
    return safePrice.toFixed(2)
  }

  const getLowStockItems = () => {
    return inventoryItems.filter((item) => item.quantity <= item.reorder_level)
  }

  const getTotalValue = () => {
    return inventoryItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading inventory items...</p>
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
            <Button onClick={() => fetchInventoryItems(currentPage)}>Try Again</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-gray-600">Track and manage your inventory items and stock levels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              New Inventory Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Inventory Item" : "Create New Inventory Item"}</DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update the inventory item details below."
                  : "Fill in the details to create a new inventory item."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="SKU-001"
                    className={formErrors.sku ? "border-red-500" : ""}
                  />
                  {formErrors.sku && <p className="text-red-500 text-sm mt-1">{formErrors.sku}</p>}
                </div>
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Product name"
                    className={formErrors.name ? "border-red-500" : ""}
                  />
                  {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger className={formErrors.category ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    placeholder="Supplier name"
                    className={formErrors.supplier ? "border-red-500" : ""}
                  />
                  {formErrors.supplier && <p className="text-red-500 text-sm mt-1">{formErrors.supplier}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className={formErrors.quantity ? "border-red-500" : ""}
                  />
                  {formErrors.quantity && <p className="text-red-500 text-sm mt-1">{formErrors.quantity}</p>}
                </div>
                <div>
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="0.00"
                    className={formErrors.unit_price ? "border-red-500" : ""}
                  />
                  {formErrors.unit_price && <p className="text-red-500 text-sm mt-1">{formErrors.unit_price}</p>}
                </div>
                <div>
                  <Label htmlFor="reorder_level">Reorder Level</Label>
                  <Input
                    id="reorder_level"
                    type="number"
                    min="0"
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                    placeholder="0"
                    className={formErrors.reorder_level ? "border-red-500" : ""}
                  />
                  {formErrors.reorder_level && <p className="text-red-500 text-sm mt-1">{formErrors.reorder_level}</p>}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingItem ? "Update Item" : "Create Item"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getLowStockItems().length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatPrice(getTotalValue())}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(inventoryItems.map((item) => item.category)).size}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            {totalItems > 0
              ? `A list of all inventory items with their stock levels and details. Showing ${inventoryItems.length} of ${totalItems} items.`
              : "No inventory items found in the database."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalItems === 0 ? (
            <div className="text-center py-16">
              <FileX className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Records Available</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                There are currently no inventory items in the database. Get started by creating your first inventory
                item.
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="mx-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create First Inventory Item
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${formatPrice(item.unit_price)}</TableCell>
                        <TableCell>${formatPrice(item.quantity * item.unit_price)}</TableCell>
                        <TableCell>
                          {item.quantity <= item.reorder_level ? (
                            <Badge variant="destructive">Low Stock</Badge>
                          ) : (
                            <Badge variant="secondary">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
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
                                    This action cannot be undone. This will permanently delete the inventory item "
                                    {item.name}" (SKU: {item.sku}).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
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
