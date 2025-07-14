"use client"

import type React from "react"

import { useEffect, useState, useMemo, useCallback } from "react"
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

// Debounce hook for search optimization
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

// Skeleton components for loading states
const TableRowSkeleton = () => (
  <TableRow>
    {[...Array(10)].map((_, i) => (
      <TableCell key={i}>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
      </TableCell>
    ))}
  </TableRow>
)

const SummaryCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
    </CardHeader>
    <CardContent>
      <div className="h-8 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
      <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
    </CardContent>
  </Card>
)

export default function Inventory() {
  /* ------------------------------------------------------------------ */
  /*                            state / refs                            */
  /* ------------------------------------------------------------------ */

  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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
  /*                         memoized calculations                      */
  /* ------------------------------------------------------------------ */

  // Memoized filtered inventory to avoid recalculating on every render
  const filteredInventory = useMemo(() => {
    if (!debouncedSearchTerm) return inventory

    const lower = debouncedSearchTerm.toLowerCase()
    return inventory.filter((item) => item.sku.toLowerCase().includes(lower) || item.name.toLowerCase().includes(lower))
  }, [inventory, debouncedSearchTerm])

  // Memoized aggregated data
  const aggregatedData = useMemo(() => {
    const totalItems = inventory.length
    const totalValue = inventory.reduce((sum, i) => sum + i.inStock * i.unitCost, 0)
    const lowStockItems = inventory.filter((i) => i.inStock - i.reserved <= 10 && i.inStock > 0).length
    const outOfStockItems = inventory.filter((i) => i.inStock === 0).length

    return { totalItems, totalValue, lowStockItems, outOfStockItems }
  }, [inventory])

  /* ------------------------------------------------------------------ */
  /*                         lifecycle / handlers                       */
  /* ------------------------------------------------------------------ */

  // initial load
  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true)
      console.log("Loading inventory data...")
      const data = await supabaseStore.getInventory()

      // 🔐 Ensure numeric fields are never undefined or null
      const sanitized = data.map((i) => ({
        ...i,
        inStock: i.inStock ?? 0,
        incoming: i.incoming ?? 0,
        reserved: i.reserved ?? 0,
        unitCost: i.unitCost ?? 0,
      }))

      console.log("Loaded inventory items:", sanitized.length)
      setInventory(sanitized)
    } catch (err) {
      console.error("Error loading inventory", err)
    } finally {
      setLoading(false)
    }
  }, [])

  /* ------------------------- add / edit logic ----------------------- */

  const handleAddItem = useCallback(async () => {
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
  }, [newItem, loadInventory])

  const handleEditItem = useCallback(async () => {
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
  }, [selectedItem, editItem, loadInventory])

  const openEditDialog = useCallback((item: InventoryItem) => {
    setSelectedItem(item)
    setEditItem({
      sku: item.sku,
      name: item.name,
      quantity: item.inStock.toString(),
      unitCost: item.unitCost.toString(),
    })
    setIsEditDialogOpen(true)
  }, [])

  /* ---------------------------- export CSV -------------------------- */

  const handleExport = useCallback(() => {
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
  }, [filteredInventory])

  /* -------------------------- helpers / utils ----------------------- */

  const getStockStatus = useCallback((item: InventoryItem) => {
    const available = item.inStock - item.reserved
    const total = item.inStock + item.incoming

    if (total === 0) return { status: "Out of Stock", badge: "destructive" }
    if (item.inStock === 0) return { status: "Incoming Only", badge: "secondary" }
    if (available <= 10) return { status: "Low Stock", badge: "secondary" }
    return { status: "In Stock", badge: "default" }
  }, [])

  const currency = useCallback(
    (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n),
    [],
  )

  /* ------------------------------------------------------------------ */
  /*                                 UI                                 */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col min-h-screen">
      {/* --------------------------- header --------------------------- */}
      <header className="flex h-16 items-center gap-2 border-b px-4 ml-16 lg:ml-0">
        <SidebarTrigger className="-ml-1 lg:hidden" />
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <Package className="h-5 w-5" />
          Inventory
        </h1>
      </header>

      {/* ------------------------ main content ----------------------- */}
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6 ml-16 lg:ml-0">
        {/* summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : (
            <>
              <SummaryCard
                icon={<Package className="h-4 w-4 text-muted-foreground" />}
                title="Total Items"
                value={aggregatedData.totalItems.toString()}
                subtitle="Unique SKUs"
              />
              <SummaryCard
                icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                title="Total Value"
                value={currency(aggregatedData.totalValue)}
                subtitle="Current stock value"
              />
              <SummaryCard
                icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
                title="Low Stock"
                value={aggregatedData.lowStockItems.toString()}
                subtitle="≤10 available"
              />
              <SummaryCard
                icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
                title="Out of Stock"
                value={aggregatedData.outOfStockItems.toString()}
                subtitle="0 units"
              />
            </>
          )}
        </div>

        {/* actions bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-[260px]"
                placeholder="Search inventory…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm" onClick={loadInventory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>

            {/* add-item dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Inventory Item</DialogTitle>
                  <DialogDescription>Manually add new stock to your inventory.</DialogDescription>
                </DialogHeader>

                <ItemForm state={newItem} setState={setNewItem} disableSku={false} />

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddItem}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* inventory table */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>
              Showing {filteredInventory.length} of {aggregatedData.totalItems}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="text-right">Incoming</TableHead>
                  <TableHead className="text-right">Reserved</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : (
                  <>
                    {filteredInventory.map((item) => {
                      const status = getStockStatus(item)
                      const available = item.inStock - item.reserved
                      const totalVal = item.inStock * item.unitCost

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>{item.name}</TableCell>
                          <TableCell className="text-right">{item.inStock.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.incoming.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{item.reserved.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{available.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{currency(item.unitCost)}</TableCell>
                          <TableCell className="text-right">{currency(totalVal)}</TableCell>
                          <TableCell>
                            <Badge variant={status.badge}>{status.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {filteredInventory.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground">
                          {searchTerm
                            ? "No items match your search."
                            : "Inventory is empty. Add items or import purchase orders."}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* edit dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>
                Update details for <strong>{selectedItem?.sku}</strong>.
              </DialogDescription>
            </DialogHeader>

            <ItemForm state={editItem} setState={setEditItem} disableSku />

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditItem}>Update</Button>
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
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="sku" className="text-right">
          SKU *
        </Label>
        <Input
          id="sku"
          disabled={disableSku}
          value={state.sku}
          onChange={(e) => setState({ ...state, sku: e.target.value })}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right">
          Name *
        </Label>
        <Input
          id="name"
          value={state.name}
          onChange={(e) => setState({ ...state, name: e.target.value })}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="qty" className="text-right">
          Quantity *
        </Label>
        <Input
          id="qty"
          type="number"
          min="0"
          value={state.quantity}
          onChange={(e) => setState({ ...state, quantity: e.target.value })}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="cost" className="text-right">
          Unit Cost *
        </Label>
        <Input
          id="cost"
          type="number"
          min="0"
          step="0.01"
          value={state.unitCost}
          onChange={(e) => setState({ ...state, unitCost: e.target.value })}
          className="col-span-3"
        />
      </div>
    </div>
  )
}
