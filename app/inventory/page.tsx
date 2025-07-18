"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Search, Plus, Package, TrendingUp, AlertTriangle, DollarSign, Download } from "lucide-react"
import { supabaseStore, type InventoryItem } from "@/lib/supabase-store"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isNewItemOpen, setIsNewItemOpen] = useState(false)
  const [isEditItemOpen, setIsEditItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    quantity: 0,
    unitCost: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const inventoryData = await supabaseStore.getInventory()
        setInventory(inventoryData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load inventory")
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCreateItem = async () => {
    // Validate form data
    if (!formData.sku || !formData.name) {
      alert("Please fill in required fields (SKU and Name)")
      return
    }

    try {
      await supabaseStore.addManualInventory({
        sku: formData.sku,
        name: formData.name,
        quantity: formData.quantity,
        unitCost: formData.unitCost,
      })

      const updatedInventory = await supabaseStore.getInventory()
      setInventory(updatedInventory)

      // Reset form
      setFormData({ sku: "", name: "", quantity: 0, unitCost: 0 })
      setIsNewItemOpen(false)

      alert(`Item ${formData.sku} added successfully!`)
    } catch (error) {
      console.error("Error creating item:", error)
      alert("Error creating item. Please try again.")
    }
  }

  const handleEditItem = async () => {
    if (!editingItem) return

    // Validate form data
    if (!formData.sku || !formData.name) {
      alert("Please fill in required fields (SKU and Name)")
      return
    }

    try {
      await supabaseStore.updateInventoryItem(editingItem.id, {
        sku: formData.sku,
        name: formData.name,
        quantity: formData.quantity,
        unitCost: formData.unitCost,
      })

      // Refresh the inventory list
      const updatedInventory = await supabaseStore.getInventory()
      setInventory(updatedInventory)

      // Reset form and close dialog
      setFormData({ sku: "", name: "", quantity: 0, unitCost: 0 })
      setIsEditItemOpen(false)
      setEditingItem(null)

      alert(`Item ${formData.sku} updated successfully!`)
    } catch (error) {
      console.error("Error updating item:", error)
      alert("Error updating item. Please try again.")
    }
  }

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item)
    setFormData({
      sku: item.sku,
      name: item.name,
      quantity: item.inStock,
      unitCost: item.unitCost,
    })
    setIsEditItemOpen(true)
  }

  const exportToCSV = () => {
    if (filteredInventory.length === 0) {
      alert("No data to export")
      return
    }

    const headers = ["SKU", "Product Name", "In Stock", "Incoming", "Reserved", "Unit Cost", "Total Value", "Status"]

    const csvData = filteredInventory.map((item) => {
      const totalValue = item.inStock * item.unitCost
      const status = item.inStock <= 0 ? "Out of Stock" : item.inStock <= 10 ? "Low Stock" : "In Stock"

      return [
        item.sku,
        `"${item.name.replace(/"/g, '""')}"`, // Escape quotes in product names
        item.inStock,
        item.incoming,
        item.reserved,
        item.unitCost.toFixed(2),
        totalValue.toFixed(2),
        status,
      ]
    })

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `inventory-export-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.inStock <= 0) return { label: "Out of Stock", color: "bg-red-100 text-red-800" }
    if (item.inStock <= 10) return { label: "Low Stock", color: "bg-yellow-100 text-yellow-800" }
    return { label: "In Stock", color: "bg-green-100 text-green-800" }
  }

  const filteredInventory = inventory.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalStats = {
    totalItems: filteredInventory.length,
    inStock: filteredInventory.filter((item) => item.inStock > 10).length,
    lowStock: filteredInventory.filter((item) => item.inStock > 0 && item.inStock <= 10).length,
    outOfStock: filteredInventory.filter((item) => item.inStock <= 0).length,
    totalValue: filteredInventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0),
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-0">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
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
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
          <SidebarTrigger className="-ml-1 lg:hidden" />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </header>
        <div className="p-6 ml-16 lg:ml-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-medium">Error loading inventory</h3>
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
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <div className="flex items-center justify-between w-full">
          <h1 className="text-lg font-semibold">Inventory</h1>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} size="sm" variant="outline" className="lg:hidden bg-transparent">
              <Download className="w-4 h-4" />
            </Button>
            <Button onClick={() => setIsNewItemOpen(true)} size="sm" className="lg:hidden">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold hidden lg:block">Inventory</h1>
          <div className="hidden lg:flex gap-2">
            <Button onClick={exportToCSV} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsNewItemOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Items</p>
                <p className="text-lg font-bold">{totalStats.totalItems}</p>
              </div>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">In Stock</p>
                <p className="text-lg font-bold text-green-600">{totalStats.inStock}</p>
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Low Stock</p>
                <p className="text-lg font-bold text-yellow-600">{totalStats.lowStock}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Out of Stock</p>
                <p className="text-lg font-bold text-red-600">{totalStats.outOfStock}</p>
              </div>
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Value</p>
                <p className="text-lg font-bold">${totalStats.totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </Card>
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
          {filteredInventory.length === 0 ? (
            <Card className="p-6 text-center">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">{searchTerm ? "No items found." : "No inventory items yet."}</p>
              {!searchTerm && (
                <Button onClick={() => setIsNewItemOpen(true)} className="mt-2" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Item
                </Button>
              )}
            </Card>
          ) : (
            filteredInventory.map((item) => {
              const status = getStockStatus(item)
              const totalValue = item.inStock * item.unitCost

              return (
                <Card key={item.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-medium">{item.sku}</h3>
                      <p className="text-sm text-gray-600 truncate">{item.name}</p>
                    </div>
                    <Badge className={`${status.color} text-xs`}>{status.label}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600">In Stock:</span>
                      <p className="font-medium">{item.inStock}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Unit Cost:</span>
                      <p className="font-medium">${item.unitCost.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Incoming:</span>
                      <p className="font-medium">{item.incoming}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Reserved:</span>
                      <p className="font-medium">{item.reserved}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-medium ml-1">${totalValue.toFixed(2)}</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                      Edit
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="w-[80px]">In Stock</TableHead>
                  <TableHead className="w-[80px]">Incoming</TableHead>
                  <TableHead className="w-[80px]">Reserved</TableHead>
                  <TableHead className="w-[100px]">Unit Cost</TableHead>
                  <TableHead className="w-[100px]">Total Value</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">{searchTerm ? "No items found." : "No inventory items yet."}</p>
                      {!searchTerm && (
                        <Button onClick={() => setIsNewItemOpen(true)} className="mt-2" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Item
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((item) => {
                    const status = getStockStatus(item)
                    const totalValue = item.inStock * item.unitCost

                    return (
                      <TableRow key={item.id} className="h-12">
                        <TableCell className="font-medium">{item.sku}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{item.name}</TableCell>
                        <TableCell>{item.inStock}</TableCell>
                        <TableCell>{item.incoming}</TableCell>
                        <TableCell>{item.reserved}</TableCell>
                        <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                        <TableCell>${totalValue.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={`${status.color} text-xs px-2 py-1`}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(item)} title="Edit Item">
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

        {/* Create New Item Dialog */}
        <Dialog open={isNewItemOpen} onOpenChange={setIsNewItemOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Inventory Item</DialogTitle>
              <DialogDescription>Add a new item to your inventory manually</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="sku">SKU *</label>
                  <Input
                    id="sku"
                    placeholder="ITEM-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="name">Product Name *</label>
                  <Input
                    id="name"
                    placeholder="Product Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="quantity">Quantity</label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="unit-cost">Unit Cost</label>
                  <Input
                    id="unit-cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsNewItemOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateItem}>Add Item</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item - {editingItem?.sku}</DialogTitle>
              <DialogDescription>Update inventory item details</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-sku">SKU *</label>
                  <Input
                    id="edit-sku"
                    placeholder="ITEM-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-name">Product Name *</label>
                  <Input
                    id="edit-name"
                    placeholder="Product Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="edit-quantity">Quantity</label>
                  <Input
                    id="edit-quantity"
                    type="number"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-unit-cost">Unit Cost</label>
                  <Input
                    id="edit-unit-cost"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
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
