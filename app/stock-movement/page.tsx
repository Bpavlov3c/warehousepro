"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface StockMovement {
  id: string
  sku: string
  product_name: string
  movement_type: string
  quantity: number
  previous_quantity: number
  new_quantity: number
  reference_type: string | null
  reference_id: string | null
  notes: string | null
  created_at: string
}

interface InventoryItem {
  sku: string
  product_name: string
  current_stock: number
  reserved_stock: number
  incoming_stock: number
}

export default function StockMovementPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState({
    sku: "",
    movement_type: "",
    quantity: "",
    notes: "",
  })

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch stock movements
      const { data: movementsData, error: movementsError } = await supabase
        .from("stock_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (movementsError) {
        // Check if table doesn't exist
        if (movementsError.message.includes("does not exist")) {
          console.log("[v0] Stock movements table doesn't exist yet")
          setMovements([])
        } else {
          throw movementsError
        }
      } else {
        setMovements(movementsData || [])
      }

      // Fetch current inventory summary
      const { data: inventoryData, error: inventoryError } = await supabase
        .from("product_inventory_summary")
        .select("*")
        .order("sku")

      if (inventoryError) {
        // Check if view doesn't exist, fallback to inventory table
        if (inventoryError.message.includes("does not exist")) {
          console.log("[v0] Product inventory summary view doesn't exist, using inventory table")
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("inventory")
            .select(`
              sku,
              products!inner(product_name),
              quantity_available,
              quantity_reserved,
              quantity_incoming
            `)
            .order("sku")

          if (fallbackError) throw fallbackError

          const transformedData =
            fallbackData?.map((item) => ({
              sku: item.sku,
              product_name: item.products?.product_name || "",
              current_stock: item.quantity_available || 0,
              reserved_stock: item.quantity_reserved || 0,
              incoming_stock: item.quantity_incoming || 0,
            })) || []

          setInventory(transformedData)
        } else {
          throw inventoryError
        }
      } else {
        setInventory(inventoryData || [])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Database Setup Required",
        description: "Please run the stock movements table creation script first",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.sku || !formData.movement_type || !formData.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      // Get current inventory for this SKU
      const { data: currentInventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("quantity_available, product_name")
        .eq("sku", formData.sku)
        .single()

      if (inventoryError && inventoryError.code !== "PGRST116") {
        throw inventoryError
      }

      const currentQuantity = currentInventory?.quantity_available || 0
      const movementQuantity = Number.parseInt(formData.quantity)
      let newQuantity = currentQuantity

      // Calculate new quantity based on movement type
      switch (formData.movement_type) {
        case "in":
          newQuantity = currentQuantity + movementQuantity
          break
        case "out":
          newQuantity = Math.max(0, currentQuantity - movementQuantity)
          break
        case "adjustment":
          newQuantity = movementQuantity // Direct adjustment to specific quantity
          break
        case "reserved":
          // For reserved, we don't change available quantity, just track the movement
          newQuantity = currentQuantity
          break
        case "unreserved":
          newQuantity = currentQuantity
          break
      }

      // Insert stock movement record
      const { error: movementError } = await supabase.from("stock_movements").insert({
        sku: formData.sku,
        product_name: currentInventory?.product_name || "",
        movement_type: formData.movement_type,
        quantity: movementQuantity,
        previous_quantity: currentQuantity,
        new_quantity: newQuantity,
        reference_type: "manual_adjustment",
        notes: formData.notes,
      })

      if (movementError) throw movementError

      // Update inventory if needed (not for reserved/unreserved)
      if (["in", "out", "adjustment"].includes(formData.movement_type)) {
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ quantity_available: newQuantity })
          .eq("sku", formData.sku)

        if (updateError) throw updateError
      }

      toast({
        title: "Success",
        description: "Stock movement recorded successfully",
      })

      // Reset form and refresh data
      setFormData({ sku: "", movement_type: "", quantity: "", notes: "" })
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      console.error("Error recording stock movement:", error)
      toast({
        title: "Error",
        description: "Failed to record stock movement",
        variant: "destructive",
      })
    }
  }

  const getMovementTypeColor = (type: string) => {
    switch (type) {
      case "in":
        return "bg-green-100 text-green-800"
      case "out":
        return "bg-red-100 text-red-800"
      case "adjustment":
        return "bg-blue-100 text-blue-800"
      case "reserved":
        return "bg-yellow-100 text-yellow-800"
      case "unreserved":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const filteredMovements = movements.filter((movement) => {
    const matchesSearch =
      movement.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.product_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === "all" || movement.movement_type === filterType
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock Movement</h1>
          <p className="text-muted-foreground">Track inventory changes and stock movements</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} disabled={movements.length === 0 && inventory.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Record Movement
        </Button>
      </div>

      {/* Current Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total SKUs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.reduce((sum, item) => sum + item.current_stock, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reserved Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventory.reduce((sum, item) => sum + item.reserved_stock, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add Movement Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Record Stock Movement</CardTitle>
            <CardDescription>Add a new stock movement entry</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Enter SKU"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="movement_type">Movement Type *</Label>
                  <Select
                    value={formData.movement_type}
                    onValueChange={(value) => setFormData({ ...formData, movement_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select movement type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Stock In</SelectItem>
                      <SelectItem value="out">Stock Out</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="unreserved">Unreserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes about this movement"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Record Movement</Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in">Stock In</SelectItem>
                <SelectItem value="out">Stock Out</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="unreserved">Unreserved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Previous</TableHead>
                <TableHead>New</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell>{new Date(movement.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono">{movement.sku}</TableCell>
                  <TableCell>{movement.product_name}</TableCell>
                  <TableCell>
                    <Badge className={getMovementTypeColor(movement.movement_type)}>{movement.movement_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className={movement.movement_type === "out" ? "text-red-600" : "text-green-600"}>
                      {movement.movement_type === "out" ? "-" : "+"}
                      {movement.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{movement.previous_quantity}</TableCell>
                  <TableCell>{movement.new_quantity}</TableCell>
                  <TableCell>{movement.notes || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredMovements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No stock movements found</div>
          )}
        </CardContent>
      </Card>

      {movements.length === 0 && inventory.length === 0 && !loading && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">Database Setup Required</CardTitle>
            <CardDescription className="text-yellow-700">
              The stock movements table hasn't been created yet. Please run the SQL script to set up the required
              database tables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 mb-4">
              Run the script:{" "}
              <code className="bg-yellow-100 px-2 py-1 rounded">scripts/create-stock-movements-table.sql</code>
            </p>
            <Button
              variant="outline"
              onClick={() => window.open("/scripts/create-stock-movements-table.sql", "_blank")}
              className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
            >
              View SQL Script
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
