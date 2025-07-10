"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Plus, Package, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react"
import { supabaseStore, type InventoryItem } from "@/lib/supabase-store"

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newItem, setNewItem] = useState({
    sku: "",
    name: "",
    quantity: "",
    unitCost: "",
  })

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const data = await supabaseStore.getInventory()
      console.log("Loaded inventory data:", data)
      setInventory(data)
    } catch (error) {
      console.error("Error loading inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    try {
      const quantity = Number.parseInt(newItem.quantity)
      const unitCost = Number.parseFloat(newItem.unitCost)

      if (!newItem.sku || !newItem.name || isNaN(quantity) || isNaN(unitCost)) {
        alert("Please fill in all fields with valid values")
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
      loadInventory()
    } catch (error) {
      console.error("Error adding inventory item:", error)
      alert("Error adding inventory item")
    }
  }

  const getStockStatus = (item: InventoryItem) => {
    const totalStock = item.inStock + item.incoming
    if (totalStock === 0) return { status: "Out of Stock", color: "destructive" }
    if (item.inStock <= 10) return { status: "Low Stock", color: "warning" }
    return { status: "In Stock", color: "default" }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  // Calculate summary stats
  const totalItems = inventory.length
  const totalValue = inventory.reduce((sum, item) => sum + item.inStock * item.unitCost, 0)
  const lowStockItems = inventory.filter((item) => item.inStock <= 10 && item.inStock > 0).length
  const outOfStockItems = inventory.filter((item) => item.inStock === 0).length

  if (loading) {
    return (
      <>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Inventory</h1>
          </div>
        </header>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="text-center">Loading inventory...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Inventory</h1>
        </div>
      </header>

      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalItems}</div>
              <p className="text-xs text-muted-foreground">Unique SKUs in inventory</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
              <p className="text-xs text-muted-foreground">Current inventory value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lowStockItems}</div>
              <p className="text-xs text-muted-foreground">Items with ≤10 units</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">Items with 0 units</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>Manage your product inventory and stock levels</CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Inventory Item</DialogTitle>
                    <DialogDescription>Add a new item to your inventory manually</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="sku" className="text-right">
                        SKU
                      </Label>
                      <Input
                        id="sku"
                        value={newItem.sku}
                        onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                        className="col-span-3"
                        placeholder="e.g., WH-001"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="col-span-3"
                        placeholder="Product name"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="quantity" className="text-right">
                        Quantity
                      </Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                        className="col-span-3"
                        placeholder="0"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="unitCost" className="text-right">
                        Unit Cost
                      </Label>
                      <Input
                        id="unitCost"
                        type="number"
                        step="0.01"
                        value={newItem.unitCost}
                        onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })}
                        className="col-span-3"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAddItem}>
                      Add Item
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                  <TableHead className="text-right">Unit Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const stockStatus = getStockStatus(item)
                  const totalValue = item.inStock * item.unitCost

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.inStock}</TableCell>
                      <TableCell className="text-right">{item.incoming}</TableCell>
                      <TableCell className="text-right">{item.reserved}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitCost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalValue)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            stockStatus.color === "destructive"
                              ? "destructive"
                              : stockStatus.color === "warning"
                                ? "secondary"
                                : "default"
                          }
                        >
                          {stockStatus.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {inventory.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No inventory items found. Add some items or import purchase orders to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
