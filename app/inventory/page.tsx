"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Edit,
  Download,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react"
import { supabaseStore, type InventoryItem } from "@/lib/supabase-store"

export default function Inventory() {
  /* ------------------------------------------------------------------ */
  /*                            state / refs                            */
  /* ------------------------------------------------------------------ */

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState("")

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const [newItem, setNewItem] = useState({
    sku: "",
    name: "",
    quantity: "",
    unitCost: "",
  })

  const [editItem, setEditItem] = useState({
    sku: "",
    name: "",
    quantity: "",
    unitCost: "",
  })

  /* ------------------------------------------------------------------ */
  /*                         lifecycle / handlers                       */
  /* ------------------------------------------------------------------ */

  // initial load
  useEffect(() => {
    loadInventory()
  }, [])

  // filter whenever inventory or search term changes
  useEffect(() => {
    const lower = searchTerm.toLowerCase()
    setFilteredInventory(
      inventory.filter((item) => item.sku.toLowerCase().includes(lower) || item.name.toLowerCase().includes(lower)),
    )
  }, [inventory, searchTerm])

  async function loadInventory() {
    try {
      setLoading(true)
      console.log("Loading inventory data...")
      const data = await supabaseStore.getInventory()
      console.log("Loaded inventory items:", data.length)
      console.log("Sample inventory items:", data.slice(0, 3))
      setInventory(data)
    } catch (err) {
      console.error("Error loading inventory", err)
    } finally {
      setLoading(false)
    }
  }

  /* ------------------------- add / edit logic ----------------------- */

  async function handleAddItem() {
    try {
      const quantity = Number.parseInt(newItem.quantity)
      const unitCost = Number.parseFloat(newItem.unitCost)

      if (
        !newItem.sku ||
        !newItem.name ||
        Number.isNaN(quantity) ||
        Number.isNaN(unitCost) ||
        quantity <= 0 ||
        unitCost <= 0
      ) {
        alert("Please enter valid values for all required fields")
        return
      }

      await supabaseStore.addManualInventory({
        sku: newItem.sku,
        name: newItem.name,
        quantity,
        unitCost,
      })

      setNewItem({ sku: "", name: "", quantity: "", unitCost: "" })
      setIsAddDialogOpen(false)
      await loadInventory()
      alert("Item added!")
    } catch (err) {
      console.error("Add item error", err)
      alert("Unable to add inventory item")
    }
  }

  async function handleEditItem() {
    if (!selectedItem) return

    try {
      const quantity = Number.parseInt(editItem.quantity)
      const unitCost = Number.parseFloat(editItem.unitCost)

      if (!editItem.name || Number.isNaN(quantity) || Number.isNaN(unitCost) || quantity < 0 || unitCost <= 0) {
        alert("Please enter valid values")
        return
      }

      // difference to apply (positive or negative)
      const deltaQty = quantity - selectedItem.inStock

      // we treat edits as manual adjustments
      await supabaseStore.addManualInventory({
        sku: editItem.sku,
        name: editItem.name,
        quantity: deltaQty,
        unitCost,
      })

      setIsEditDialogOpen(false)
      setSelectedItem(null)
      await loadInventory()
      alert("Item updated!")
    } catch (err) {
      console.error("Edit item error", err)
      alert("Unable to update inventory item")
    }
  }

  function openEditDialog(item: InventoryItem) {
    setSelectedItem(item)
    setEditItem({
      sku: item.sku,
      name: item.name,
      quantity: item.inStock.toString(),
      unitCost: item.unitCost.toString(),
    })
    setIsEditDialogOpen(true)
  }

  /* ---------------------------- export CSV -------------------------- */

  function handleExport() {
    try {
      const headers = [
        "SKU",
        "Product Name",
        "In Stock",
        "Incoming",
        "Reserved",
        "Available",
        "Unit Cost",
        "Total Value",
        "Status",
      ]

      const rows = filteredInventory.map((item) => {
        const available = item.inStock - item.reserved
        const status = getStockStatus(item).status
        const totalValue = item.inStock * item.unitCost

        return [
          item.sku,
          item.name,
          item.inStock.toString(),
          item.incoming.toString(),
          item.reserved.toString(),
          available.toString(),
          item.unitCost.toFixed(2),
          totalValue.toFixed(2),
          status,
        ]
      })

      const csv = [headers, ...rows].map((row) => row.map((f) => `"${f}"`).join(",")).join("\n") + "\n"

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export error", err)
      alert("Could not export CSV")
    }
  }

  /* -------------------------- helpers / utils ----------------------- */

  function getStockStatus(item: InventoryItem) {
    const available = item.inStock - item.reserved
    const total = item.inStock + item.incoming

    if (total === 0) return { status: "Out of Stock", badge: "destructive" }
    if (item.inStock === 0) return { status: "Incoming Only", badge: "secondary" }
    if (available <= 10) return { status: "Low Stock", badge: "secondary" }
    return { status: "In Stock", badge: "default" }
  }

  const currency = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

  /* --------------------------- aggregated data ---------------------- */

  const totalItems = inventory.length
  const totalValue = inventory.reduce((sum, i) => sum + i.inStock * i.unitCost, 0)

  const lowStockItems = inventory.filter((i) => i.inStock - i.reserved <= 10 && i.inStock > 0).length

  const outOfStockItems = inventory.filter((i) => i.inStock === 0).length

  /* ------------------------------------------------------------------ */
  /*                                 UI                                 */
  /* ------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <header className="flex h-16 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading inventory...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* --------------------------- header --------------------------- */}
      <header className="flex h-16 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5" />
          <span className="hidden sm:inline">Inventory</span>
        </h1>
      </header>

      {/* ------------------------ main content ----------------------- */}
      <main className="flex-1 space-y-4 p-4 pt-6">
        {/* summary cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<Package className="h-4 w-4 text-muted-foreground" />}
            title="Total Items"
            value={totalItems.toString()}
            subtitle="Unique SKUs"
          />
          <SummaryCard
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            title="Total Value"
            value={currency(totalValue)}
            subtitle="Current stock value"
          />
          <SummaryCard
            icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
            title="Low Stock"
            value={lowStockItems.toString()}
            subtitle="≤10 available"
          />
          <SummaryCard
            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
            title="Out of Stock"
            value={outOfStockItems.toString()}
            subtitle="0 units"
          />
        </div>

        {/* actions bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-full sm:w-[260px]"
                placeholder="Search inventory…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none bg-transparent">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={loadInventory}
                className="flex-1 sm:flex-none bg-transparent"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 sm:flex-none bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </Button>

            {/* add-item dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="w-[95vw] max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                  <DialogDescription>Manually add new stock to your inventory.</DialogDescription>
                </DialogHeader>

                <ItemForm state={newItem} setState={setNewItem} disableSku={false} />

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem} className="w-full sm:w-auto">
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* inventory table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Inventory Items</CardTitle>
            <CardDescription className="text-sm">
              Showing {filteredInventory.length} of {totalItems}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[80px]">SKU</TableHead>
                    <TableHead className="min-w-[120px]">Product Name</TableHead>
                    <TableHead className="text-right min-w-[70px]">In Stock</TableHead>
                    <TableHead className="text-right min-w-[70px]">Incoming</TableHead>
                    <TableHead className="text-right min-w-[70px]">Reserved</TableHead>
                    <TableHead className="text-right min-w-[70px]">Available</TableHead>
                    <TableHead className="text-right min-w-[80px] hidden sm:table-cell">Unit Cost</TableHead>
                    <TableHead className="text-right min-w-[90px] hidden md:table-cell">Total Value</TableHead>
                    <TableHead className="min-w-[80px] hidden sm:table-cell">Status</TableHead>
                    <TableHead className="text-center min-w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredInventory.map((item) => {
                    const status = getStockStatus(item)
                    const available = item.inStock - item.reserved
                    const totalVal = item.inStock * item.unitCost

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{item.sku}</TableCell>
                        <TableCell className="min-w-0">
                          <div className="truncate text-xs sm:text-sm" title={item.name}>
                            {item.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm">{item.inStock.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-blue-600 font-medium text-xs sm:text-sm">
                          {item.incoming.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-red-600 font-medium text-xs sm:text-sm">
                          {item.reserved.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium text-xs sm:text-sm">
                          {available.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm hidden sm:table-cell">
                          {currency(item.unitCost)}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm hidden md:table-cell">
                          {currency(totalVal)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={status.badge} className="text-xs">
                            {status.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8">
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}

                  {filteredInventory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                        {searchTerm
                          ? "No items match your search."
                          : "Inventory is empty. Add items or import purchase orders."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* edit dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>
                Update details for <strong>{selectedItem?.sku}</strong>.
              </DialogDescription>
            </DialogHeader>

            <ItemForm state={editItem} setState={setEditItem} disableSku />

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleEditItem} className="w-full sm:w-auto">
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------- */
/*                      small reusable sub-components                   */
/* -------------------------------------------------------------------- */

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-lg sm:text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  )
}

function ItemForm({
  state,
  setState,
  disableSku = false,
}: {
  state: { sku: string; name: string; quantity: string; unitCost: string }
  setState: React.Dispatch<
    React.SetStateAction<{
      sku: string
      name: string
      quantity: string
      unitCost: string
    }>
  >
  disableSku?: boolean
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <Label htmlFor="sku" className="sm:text-right">
          SKU *
        </Label>
        <Input
          id="sku"
          disabled={disableSku}
          value={state.sku}
          onChange={(e) => setState({ ...state, sku: e.target.value })}
          className="sm:col-span-3"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="sm:text-right">
          Name *
        </Label>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => setState({ ...state, name: e.target.value })}
          className="sm:col-span-3"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <Label htmlFor="qty" className="sm:text-right">
          Quantity *
        </Label>
        <Input
          id="qty"
          type="number"
          min="0"
          value={state.quantity}
          onChange={(e) => setState({ ...state, quantity: e.target.value })}
          className="sm:col-span-3"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-4">
        <Label htmlFor="cost" className="sm:text-right">
          Unit Cost *
        </Label>
        <Input
          id="cost"
          type="number"
          min="0"
          step="0.01"
          value={state.unitCost}
          onChange={(e) => setState({ ...state, unitCost: e.target.value })}
          className="sm:col-span-3"
        />
      </div>
    </div>
  )
}
