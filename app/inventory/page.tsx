"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { RefreshCw, Package, TrendingDown, TrendingUp, DollarSign, AlertTriangle, FileX } from "lucide-react"

interface InventoryItem {
  sku: string
  product_name: string
  category: string | null
  reorder_level: number
  current_stock: number
  avg_unit_cost: number
  total_value: number
  batch_count: number
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInventory = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log("🔄 Fetching inventory...")

      const response = await fetch("/api/inventory")

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to fetch inventory: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      console.log("✅ Received inventory data:", data)

      setInventory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("❌ Error fetching inventory:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch inventory")
      setInventory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const formatAmount = (amount: number): string => {
    return amount.toFixed(2)
  }

  const getStockStatus = (currentStock: number, reorderLevel: number) => {
    if (currentStock === 0) {
      return { status: "Out of Stock", color: "bg-red-100 text-red-800" }
    } else if (currentStock <= reorderLevel) {
      return { status: "Low Stock", color: "bg-yellow-100 text-yellow-800" }
    } else {
      return { status: "In Stock", color: "bg-green-100 text-green-800" }
    }
  }

  const calculateStats = () => {
    const totalItems = inventory.length
    const totalValue = inventory.reduce((sum, item) => sum + item.total_value, 0)
    const lowStockItems = inventory.filter(
      (item) => item.current_stock <= item.reorder_level && item.current_stock > 0,
    ).length
    const outOfStockItems = inventory.filter((item) => item.current_stock === 0).length

    return { totalItems, totalValue, lowStockItems, outOfStockItems }
  }

  const stats = calculateStats()

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading inventory...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchInventory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Track your inventory levels and stock status</p>
        </div>
        <Button variant="outline" onClick={fetchInventory}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatAmount(stats.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Current stock levels and inventory status for all products.</CardDescription>
        </CardHeader>
        <CardContent>
          {inventory.length === 0 ? (
            <div className="text-center py-8">
              <FileX className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Inventory Items</h3>
              <p className="text-muted-foreground mb-4">
                No inventory items found. Add products and purchase orders to see inventory data.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Avg Cost</TableHead>
                  <TableHead>Total Value</TableHead>
                  <TableHead>Batches</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => {
                  const stockStatus = getStockStatus(item.current_stock, item.reorder_level)

                  return (
                    <TableRow key={item.sku}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{item.category || "N/A"}</TableCell>
                      <TableCell>{item.current_stock}</TableCell>
                      <TableCell>{item.reorder_level}</TableCell>
                      <TableCell>${formatAmount(item.avg_unit_cost)}</TableCell>
                      <TableCell className="font-medium">${formatAmount(item.total_value)}</TableCell>
                      <TableCell>{item.batch_count}</TableCell>
                      <TableCell>
                        <Badge className={stockStatus.color}>{stockStatus.status}</Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
