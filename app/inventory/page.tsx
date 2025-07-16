"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Search, Plus, Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react"
import { supabaseStore, type InventoryItem } from "@/lib/supabase-store"

// Debounce hook for search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Skeleton components
const StatCardSkeleton = () => (
  <Card className="p-3">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-3 bg-gray-200 rounded w-16 mb-1 animate-pulse"></div>
        <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
      </div>
      <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
    </div>
  </Card>
)

const TableSkeleton = () => (
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead>SKU</TableHead>
            <TableHead>Product Name</TableHead>
            <TableHead className="w-[80px]">In Stock</TableHead>
            <TableHead className="w-[80px]">Incoming</TableHead>
            <TableHead className="w-[80px]">Reserved</TableHead>
            <TableHead className="w-[100px]">Unit Cost</TableHead>
            <TableHead className="w-[100px]">Total Value</TableHead>
            <TableHead className="w-[80px]">Status</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(10)].map((_, i) => (
            <TableRow key={i} className="h-12">
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
)

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    quantity: "",
    unitCost: "",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isEditItemOpen, setIsEditItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [editFormData, setEditFormData] = useState({
    sku: "",
    name: "",
    quantity: "",
    unitCost: "",
  })

  // Debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Load data on component mount
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const inventoryData = await supabaseStore.getInventory()
      setInventory(inventoryData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Memoized filtered inventory
  const filteredInventory = useMemo(() => {
    if (!debouncedSearchTerm) return inventory

    return inventory.filter(
      (item) =>
        item.sku.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()),
    )
  }, [inventory, debouncedSearchTerm])

  // Memoized metrics
  const metrics = useMemo(() => {
    const totalItems = filteredInventory.length
    const totalStock = filteredInventory.reduce((sum, item) => sum + item.inStock, 0)
    const lowStockItems = filteredInventory.filter((item) => item.inStock <= 10).length
    const totalValue = filteredInventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0)

    return {
      totalItems,
      totalStock,
      lowStockItems,
      totalValue,
    }
  }, [filteredInventory])

  const handleAddItem = useCallback(async () => {
    // Validate form data
    if (!formData.sku || !formData.name || !formData.quantity || !formData.unitCost) {
      alert("Please fill in all fields")
      return
    }

    const quantity = Number.parseInt(formData.quantity)
    const unitCost = Number.parseFloat(formData.unitCost)

    if (isNaN(quantity) || quantity <= 0) {
      alert("Please enter a valid quantity")
      return
    }

    if (isNaN(unitCost) || unitCost < 0) {
      alert("Please enter a valid unit cost")
      return
    }

    try {
      await supabaseStore.addManualInventory({
        sku: formData.sku,
        name: formData.name,
        quantity,
        unitCost,
      })

      // Refresh inventory data
      await loadData()

      // Reset form
      setFormData({ sku: "", name: "", quantity: "", unitCost: "" })
      setIsAddItemOpen(false)

      alert(`Item ${formData.sku} added successfully!`)
    } catch (error) {
      console.error("Error adding inventory item:", error)
      alert("Error adding item. Please try again.")
    }
  }, [formData, loadData])

  const handleEditItem = useCallback(async () => {
    if (!editingItem || !editFormData.sku || !editFormData.name || !editFormData.quantity || !editFormData.unitCost) {
      alert("Please fill in all fields")
      return
    }

    const quantity = Number.parseInt(editFormData.quantity)
    const unitCost = Number.parseFloat(editFormData.unitCost)

    if (isNaN(quantity) || quantity < 0) {
      alert("Please enter a valid quantity")
      return
    }

    if (isNaN(unitCost) || unitCost < 0) {
      alert("Please enter a valid unit cost")
      return
    }

    try {
      await supabaseStore.updateInventoryItem(editingItem.id, {
        sku: editFormData.sku,
        name: editFormData.name,
        quantity,
        unitCost,
      })

      // Refresh inventory data
      await loadData()

      // Reset form
      setEditFormData({ sku: "", name: "", quantity: "", unitCost: "" })
      setEditingItem(null)
      setIsEditItemOpen(false)

      alert(`Item ${editFormData.sku} updated successfully!`)
    } catch (error) {
      console.error("Error updating inventory item:", error)
      alert("Error updating item. Please try again.")
    }
  }, [editFormData, editingItem, loadData])

  const openEditDialog = useCallback((item: InventoryItem) => {
    setEditingItem(item)
    setEditFormData({
      sku: item.sku,
      name: item.name,
      quantity: item.inStock.toString(),
      unitCost: item.unitCost.toString(),
    })
    setIsEditItemOpen(true)
  }, [])

  const getStockStatus = useCallback((item: InventoryItem) => {
    if (item.inStock === 0) {
      return { label: "Out of Stock", color: "bg-red-100 text-red-800" }
    } else if (item.inStock <= 10) {
      return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" }
    } else {
      return { label: "In Stock", color: "bg-green-100 text-green-800" }
    }
  }, [])

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading inventory</h3>
            <p className="text-red-600 mt-1">{error}</p>
            <Button onClick={loadData} className="mt-3 bg-transparent" variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-semibold">Inventory</h1>
          <Button onClick={() => setIsAddItemOpen(true)} size="sm" className="lg:hidden">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Inventory</h1>
          <Button onClick={() => setIsAddItemOpen(true)} size="sm" className="hidden lg:flex">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Items</p>
                    <p className="text-lg font-bold">{metrics.totalItems}</p>
                  </div>
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Stock</p>
                    <p className="text-lg font-bold">{metrics.totalStock}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Low Stock</p>
                    <p className="text-lg font-bold text-red-600">{metrics.lowStockItems}</p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              </Card>

              <Card className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Total Value</p>
                    <p className="text-lg font-bold">${metrics.totalValue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Mobile Card View / Desktop Table View */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            [...Array(5)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </Card>
            ))
          ) : filteredInventory.length === 0 ? (
            <Card className="p-6 text-center">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No items found." : "No inventory items yet."}</p>
              {!searchTerm && (
                <Button onClick={() => setIsAddItemOpen(true)} className="mt-2" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </Card>
          ) : (
            filteredInventory.map((item) => {
              const status = getStockStatus(item)
              return (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{item.sku}</h3>
                      <p className="text-sm text-gray-600 truncate">{item.name}</p>
                    </div>
                    <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <span className="text-gray-600 block">In Stock</span>
                      <p className="font-medium">{item.inStock}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">Incoming</span>
                      <p className="font-medium">{item.incoming}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">Reserved</span>
                      <p className="font-medium">{item.reserved}</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
                    <span>Total Unit Cost: ${item.unitCost.toFixed(2)}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Value: ${(item.inStock * item.unitCost).toLocaleString()}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(item)}
                        className="h-6 px-2 text-xs"
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Desktop Table View */}
        {loading ? (
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
        ) : (
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="h-10">
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="w-[80px]">In Stock</TableHead>
                    <TableHead className="w-[80px]">Incoming</TableHead>
                    <TableHead className="w-[80px]">Reserved</TableHead>
                    <TableHead className="w-[100px]">Total Unit Cost</TableHead>
                    <TableHead className="w-[100px]">Total Value</TableHead>
                    <TableHead className="w-[80px]">Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">{searchTerm ? "No items found." : "No inventory items yet."}</p>
                        {!searchTerm && (
                          <Button onClick={() => setIsAddItemOpen(true)} className="mt-2" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add First Item
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => {
                      const status = getStockStatus(item)
                      return (
                        <TableRow key={item.id} className="h-12">
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{item.name}</TableCell>
                          <TableCell className="text-center">{item.inStock}</TableCell>
                          <TableCell className="text-center">{item.incoming}</TableCell>
                          <TableCell className="text-center">{item.reserved}</TableCell>
                          <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                          <TableCell>${(item.inStock * item.unitCost).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge className={`${status.color} text-xs px-2 py-1`}>{status.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(item)}
                              className="h-8 px-3"
                            >
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Add Item Dialog */}
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>Add a new item to your inventory manually</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="sku">SKU *</label>
                  <Input
                    id="sku"
                    placeholder="WH-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="name">Product Name *</label>
                  <Input
                    id="name"
                    placeholder="Wireless Headphones"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="quantity">Quantity *</label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="50"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="unitCost">Total Unit Cost (incl. shipping) *</label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    placeholder="75.00"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddItem}>Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>Update the inventory item details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-sku">SKU *</label>
                  <Input
                    id="edit-sku"
                    placeholder="WH-001"
                    value={editFormData.sku}
                    onChange={(e) => setEditFormData({ ...editFormData, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-name">Product Name *</label>
                  <Input
                    id="edit-name"
                    placeholder="Wireless Headphones"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-quantity">Quantity *</label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    placeholder="50"
                    value={editFormData.quantity}
                    onChange={(e) => setEditFormData({ ...editFormData, quantity: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-unitCost">Total Unit Cost (incl. shipping) *</label>
                  <Input
                    id="edit-unitCost"
                    type="number"
                    step="0.01"
                    placeholder="75.00"
                    value={editFormData.unitCost}
                    onChange={(e) => setEditFormData({ ...editFormData, unitCost: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditItemOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditItem}>Update Item</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
