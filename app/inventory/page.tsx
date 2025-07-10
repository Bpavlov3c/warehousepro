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
import {
  Search,
  Filter,
  Download,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
} from "lucide-react"
import { dataStore, type InventoryItem } from "@/lib/store"
import { supabaseStore } from "@/lib/supabase-store"

export default function Inventory() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddInventoryOpen, setIsAddInventoryOpen] = useState(false)
  const [isEditQuantityOpen, setIsEditQuantityOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isReorderReportOpen, setIsReorderReportOpen] = useState(false)
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    quantity: "",
    unitCost: "",
  })
  const [editQuantity, setEditQuantity] = useState("")

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const inventory = await supabaseStore.getInventory()
        setInventoryItems(inventory)
      } catch (error) {
        console.error("Error loading inventory:", error)
      }
    }
    loadData()
  }, [])

  const handleAddInventory = async () => {
    if (!formData.sku || !formData.name || !formData.quantity || !formData.unitCost) {
      alert("Please fill in all fields")
      return
    }

    const quantity = Number.parseInt(formData.quantity)
    const unitCost = Number.parseFloat(formData.unitCost)

    if (quantity <= 0 || unitCost <= 0) {
      alert("Quantity and unit cost must be positive numbers")
      return
    }

    try {
      const success = await supabaseStore.addManualInventory(formData.sku, formData.name, quantity, unitCost)

      if (success) {
        const updatedInventory = await supabaseStore.getInventory()
        setInventoryItems(updatedInventory)
        setFormData({ sku: "", name: "", quantity: "", unitCost: "" })
        setIsAddInventoryOpen(false)
        alert(`Successfully added ${quantity} units of ${formData.name}`)
      } else {
        alert("Failed to add inventory")
      }
    } catch (error) {
      console.error("Error adding inventory:", error)
      alert("Error adding inventory. Please try again.")
    }
  }

  const handleEditQuantity = () => {
    if (!selectedItem || !editQuantity) {
      alert("Please enter a valid quantity")
      return
    }

    const newQuantity = Number.parseInt(editQuantity)
    if (newQuantity < 0) {
      alert("Quantity cannot be negative")
      return
    }

    const success = dataStore.updateInventoryQuantity(selectedItem.sku, newQuantity)

    if (success) {
      setInventoryItems(dataStore.getInventory())
      setIsEditQuantityOpen(false)
      setSelectedItem(null)
      setEditQuantity("")
      alert(`Successfully updated ${selectedItem.name} quantity to ${newQuantity}`)
    } else {
      alert("Failed to update quantity")
    }
  }

  const handleExport = () => {
    const csvContent = [
      ["SKU", "Product Name", "In Stock", "Incoming", "Reserved", "Available", "Status", "Unit Cost"],
      ...inventoryItems.map((item) => {
        const available = (item.inStock ?? 0) - (item.reserved ?? 0)
        const status = getStockStatus(item.inStock, item.incoming).status
        const rawUnitCost = dataStore.getInventoryUnitCost(item.sku)
        const unitCost = Number.isFinite(rawUnitCost) ? rawUnitCost : 0

        return [
          item.sku,
          item.name,
          (item.inStock ?? 0).toString(),
          (item.incoming ?? 0).toString(),
          (item.reserved ?? 0).toString(),
          Number(available).toString(),
          status,
          unitCost.toFixed(2),
        ]
      }),
    ]

    const csvString = csvContent.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "inventory_export.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReorderReport = () => {
    setIsReorderReportOpen(true)
  }

  const generateReorderReport = () => {
    const lowStockItems = inventoryItems.filter((item) => {
      const available = (item.inStock ?? 0) - (item.reserved ?? 0)
      return available <= 10 || (item.inStock ?? 0) === 0 // Items with 10 or fewer available or out of stock
    })

    const csvContent = [
      ["SKU", "Product Name", "Current Stock", "Available", "Status", "Suggested Reorder Qty", "Unit Cost"],
      ...lowStockItems.map((item) => {
        const available = (item.inStock ?? 0) - (item.reserved ?? 0)
        const status = getStockStatus(item.inStock, item.incoming).status
        const rawUnitCost = dataStore.getInventoryUnitCost(item.sku)
        const unitCost = Number.isFinite(rawUnitCost) ? rawUnitCost : 0
        const suggestedReorder = Math.max(50 - available, 20) // Suggest reordering to 50 units or minimum 20

        return [
          item.sku,
          item.name,
          (item.inStock ?? 0).toString(),
          Number(available).toString(),
          status,
          suggestedReorder.toString(),
          unitCost.toFixed(2),
        ]
      }),
    ]

    const csvString = csvContent.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "reorder_report.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setIsReorderReportOpen(false)
  }

  const getStockStatus = (inStock: number, incoming: number) => {
    const total = inStock + incoming
    if (inStock === 0 && incoming === 0) return { status: "Out of Stock", color: "bg-red-100 text-red-800" }
    if (inStock === 0 && incoming > 0) return { status: "Incoming Only", color: "bg-yellow-100 text-yellow-800" }
    if (inStock > 0 && incoming === 0) return { status: "In Stock", color: "bg-green-100 text-green-800" }
    return { status: "Good", color: "bg-green-100 text-green-800" }
  }

  const totalItems = inventoryItems.length
  const totalInStock = inventoryItems.reduce((sum, item) => sum + (item.inStock ?? 0), 0)
  const totalIncoming = inventoryItems.reduce((sum, item) => sum + (item.incoming ?? 0), 0)
  const outOfStockItems = inventoryItems.filter((item) => (item.inStock ?? 0) === 0).length

  const filteredItems = inventoryItems.filter(
    (item) =>
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const lowStockItems = inventoryItems.filter((item) => {
    const available = (item.inStock ?? 0) - (item.reserved ?? 0)
    return available <= 10 || (item.inStock ?? 0) === 0
  })

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">Inventory Management</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Active SKUs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Stock</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInStock.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Available now
                </span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Incoming Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{totalIncoming.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From pending POs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">Items need reorder</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search inventory..."
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
            <Dialog open={isAddInventoryOpen} onOpenChange={setIsAddInventoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Inventory
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Manual Inventory</DialogTitle>
                  <DialogDescription>Add inventory manually without a purchase order</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input
                        id="sku"
                        placeholder="Product SKU"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Product Name *</Label>
                      <Input
                        id="name"
                        placeholder="Product name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Quantity to add"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitCost">Unit Cost *</Label>
                      <Input
                        id="unitCost"
                        type="number"
                        step="0.01"
                        placeholder="Cost per unit"
                        value={formData.unitCost}
                        onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddInventoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddInventory}>Add Inventory</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" onClick={handleReorderReport}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Reorder Report
            </Button>
          </div>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Inventory</CardTitle>
            <CardDescription>Real-time inventory tracking with PO status integration</CardDescription>
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
                  <TableHead>Available</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const stockInfo = getStockStatus(item.inStock, item.incoming)
                  const available = (item.inStock ?? 0) - (item.reserved ?? 0)
                  const rawUnitCost = dataStore.getInventoryUnitCost(item.sku)
                  const unitCost = Number.isFinite(rawUnitCost) ? rawUnitCost : 0
                  return (
                    <TableRow key={item.sku}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className={item.inStock === 0 ? "text-red-600" : ""}>
                            {(item.inStock ?? 0).toLocaleString()}
                          </span>
                          {(item.inStock ?? 0) === 0 && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={item.incoming > 0 ? "text-blue-600 font-medium" : "text-muted-foreground"}>
                          {(item.incoming ?? 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-orange-600">{(item.reserved ?? 0).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <span className={available <= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                          {available.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${unitCost.toFixed(2)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={stockInfo.color}>{stockInfo.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedItem(item)
                            setEditQuantity((item.inStock ?? 0).toString())
                            setIsEditQuantityOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Quantity Dialog */}
        <Dialog open={isEditQuantityOpen} onOpenChange={setIsEditQuantityOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stock Quantity</DialogTitle>
              <DialogDescription>
                Update the in-stock quantity for {selectedItem?.name} ({selectedItem?.sku})
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editQuantity">New In-Stock Quantity</Label>
                <Input
                  id="editQuantity"
                  type="number"
                  min="0"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Current: {selectedItem?.inStock} units</p>
                <p>Reserved: {selectedItem?.reserved} units</p>
                <p>
                  Available after change: {(Number.parseInt(editQuantity) || 0) - (selectedItem?.reserved ?? 0)} units
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditQuantityOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditQuantity}>Update Quantity</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reorder Report Dialog */}
        <Dialog open={isReorderReportOpen} onOpenChange={setIsReorderReportOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Reorder Report</DialogTitle>
              <DialogDescription>Items that are low in stock or out of stock and need reordering</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Found {lowStockItems.length} items that need attention
              </div>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Suggested Reorder</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item) => {
                      const available = (item.inStock ?? 0) - (item.reserved ?? 0)
                      const stockInfo = getStockStatus(item.inStock, item.incoming)
                      const suggestedReorder = Math.max(50 - available, 20)

                      return (
                        <TableRow key={item.sku}>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{(item.inStock ?? 0).toLocaleString()}</TableCell>
                          <TableCell className={available <= 0 ? "text-red-600 font-medium" : ""}>
                            {available.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={stockInfo.color}>{stockInfo.status}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">{suggestedReorder} units</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReorderReportOpen(false)}>
                Close
              </Button>
              <Button onClick={generateReorderReport}>
                <Download className="h-4 w-4 mr-2" />
                Download Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Inventory Status Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Status Guide</CardTitle>
            <CardDescription>Understanding inventory tracking with PO integration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Stock Categories</h4>
                  <div className="text-sm space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>
                        <strong>In Stock:</strong> Available for immediate sale
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>
                        <strong>Incoming:</strong> From Pending/In Transit POs
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>
                        <strong>Reserved:</strong> Allocated to orders
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">PO Status Impact</h4>
                  <div className="text-sm space-y-2">
                    <div>
                      <strong>Draft:</strong> No inventory impact
                    </div>
                    <div>
                      <strong>Pending/In Transit:</strong> Added to "Incoming"
                    </div>
                    <div>
                      <strong>Delivered:</strong> Moved to "In Stock"
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
