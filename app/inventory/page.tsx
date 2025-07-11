"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Filter, Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react"
import { supabaseStore, type InventoryItem } from "@/lib/supabase-store"

interface InventoryFilters {
  search: string
  stockLevel: "all" | "in-stock" | "low-stock" | "out-of-stock"
  sortBy: "name" | "sku" | "stock" | "cost"
  sortOrder: "asc" | "desc"
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [filters, setFilters] = useState<InventoryFilters>({
    search: "",
    stockLevel: "all",
    sortBy: "name",
    sortOrder: "asc",
  })

  // Form state for adding new inventory
  const [newItem, setNewItem] = useState({
    sku: "",
    name: "",
    quantity: 0,
    unitCost: 0,
  })

  // Summary metrics
  const [metrics, setMetrics] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
  })

  useEffect(() => {
    loadInventory()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [inventory, filters])

  const loadInventory = async () => {
    try {
      setLoading(true)
      console.log("Loading inventory...")
      const data = await supabaseStore.getInventory()
      console.log("Loaded inventory data:", data.length, "items")
      console.log("Sample items:", data.slice(0, 3))
      setInventory(data)
    } catch (error) {
      console.error("Error loading inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    console.log("Applying filters to", inventory.length, "items")
    let filtered = [...inventory]

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(
        (item) => item.sku.toLowerCase().includes(searchLower) || item.name.toLowerCase().includes(searchLower),
      )
    }

    // Stock level filter
    switch (filters.stockLevel) {
      case "in-stock":
        filtered = filtered.filter((item) => item.inStock > 0)
        break
      case "low-stock":
        filtered = filtered.filter((item) => item.inStock > 0 && item.inStock <= 10)
        break
      case "out-of-stock":
        filtered = filtered.filter((item) => item.inStock === 0)
        break
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      switch (filters.sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "sku":
          aValue = a.sku.toLowerCase()
          bValue = b.sku.toLowerCase()
          break
        case "stock":
          aValue = a.inStock
          bValue = b.inStock
          break
        case "cost":
          aValue = a.unitCost
          bValue = b.unitCost
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (aValue < bValue) return filters.sortOrder === "asc" ? -1 : 1
      if (aValue > bValue) return filters.sortOrder === "asc" ? 1 : -1
      return 0
    })

    console.log("Filtered to", filtered.length, "items")
    setFilteredInventory(filtered)

    // Calculate metrics
    const totalItems = filtered.length
    const totalValue = filtered.reduce((sum, item) => sum + item.inStock * item.unitCost, 0)
    const lowStockItems = filtered.filter((item) => item.inStock > 0 && item.inStock <= 10).length
    const outOfStockItems = filtered.filter((item) => item.inStock === 0).length

    setMetrics({
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
    })
  }

  const handleAddInventory = async () => {
    try {
      if (!newItem.sku || !newItem.name || newItem.quantity <= 0 || newItem.unitCost <= 0) {
        alert("Please fill in all fields with valid values")
        return
      }

      await supabaseStore.addManualInventory(newItem)
      setShowAddDialog(false)
      setNewItem({ sku: "", name: "", quantity: 0, unitCost: 0 })
      await loadInventory()
    } catch (error) {
      console.error("Error adding inventory:", error)
      alert("Failed to add inventory item")
    }
  }

  const getStockBadge = (item: InventoryItem) => {
    if (item.inStock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>
    } else if (item.inStock <= 10) {
      return <Badge variant="secondary">Low Stock</Badge>
    } else {
      return <Badge variant="default">In Stock</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading inventory...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Inventory</h1>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Inventory Item</DialogTitle>
                <DialogDescription>Add a new item to your inventory manually</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="Enter SKU"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number.parseInt(e.target.value) || 0 })}
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost (лв)</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    step="0.01"
                    value={newItem.unitCost}
                    onChange={(e) => setNewItem({ ...newItem, unitCost: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="Enter unit cost"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddInventory}>Add Item</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Debug Info */}
        <div className="text-sm text-muted-foreground">
          Debug: Raw inventory items: {inventory.length}, Filtered items: {filteredInventory.length}
        </div>

        {/* Summary Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalItems}</div>
              <p className="text-xs text-muted-foreground">Unique SKUs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalValue.toLocaleString()} лв</div>
              <p className="text-xs text-muted-foreground">At cost price</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.lowStockItems}</div>
              <p className="text-xs text-muted-foreground">≤ 10 units</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">0 units</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search SKU or name..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Level</label>
                <Select
                  value={filters.stockLevel}
                  onValueChange={(value: any) => setFilters({ ...filters, stockLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Items</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="low-stock">Low Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(value: any) => setFilters({ ...filters, sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="sku">SKU</SelectItem>
                    <SelectItem value="stock">Stock Level</SelectItem>
                    <SelectItem value="cost">Unit Cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Order</label>
                <Select
                  value={filters.sortOrder}
                  onValueChange={(value: any) => setFilters({ ...filters, sortOrder: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFilters({
                    search: "",
                    stockLevel: "all",
                    sortBy: "name",
                    sortOrder: "asc",
                  })
                }
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>
              Showing {filteredInventory.length} of {inventory.length} items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>In Stock</TableHead>
                  <TableHead>Incoming</TableHead>
                  <TableHead>Reserved</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <span className={item.inStock <= 10 ? "text-orange-600 font-medium" : ""}>{item.inStock}</span>
                    </TableCell>
                    <TableCell>
                      {item.incoming > 0 && (
                        <Badge variant="outline" className="text-blue-600">
                          +{item.incoming}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.reserved > 0 && (
                        <Badge variant="outline" className="text-orange-600">
                          -{item.reserved}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{item.unitCost.toFixed(2)} лв</TableCell>
                    <TableCell>{(item.inStock * item.unitCost).toFixed(2)} лв</TableCell>
                    <TableCell>{getStockBadge(item)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredInventory.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No inventory items found</h3>
                <p className="text-muted-foreground">
                  {inventory.length === 0
                    ? "Add your first inventory item to get started"
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
