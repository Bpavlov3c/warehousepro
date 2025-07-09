"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "@/hooks/use-toast"
import { Plus, MoreHorizontal, RefreshCw, Package, DollarSign, Clock, CheckCircle } from "lucide-react"

interface PurchaseOrder {
  id: number
  po_number: string
  supplier_name: string
  po_date: string
  delivery_cost: number
  status: string
  notes: string
  total_cost: number
  item_count: number
  created_at: string
}

interface NewPOForm {
  po_number: string
  supplier_name: string
  po_date: string
  delivery_cost: string
  status: string
  notes: string
}

const statusColors = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-blue-100 text-blue-800",
  Delivered: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<NewPOForm>({
    po_number: "",
    supplier_name: "",
    po_date: new Date().toISOString().split("T")[0],
    delivery_cost: "0",
    status: "Pending",
    notes: "",
  })

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/purchase-orders")

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to fetch purchase orders: ${response.status} ${errorData}`)
      }

      const data = await response.json()
      setPurchaseOrders(data)
    } catch (error) {
      console.error("Error fetching purchase orders:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch purchase orders")
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/purchase-orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      // Update local state
      setPurchaseOrders((prev) => prev.map((po) => (po.id === id ? { ...po, status: newStatus } : po)))

      toast({
        title: "Status Updated",
        description: `Purchase order status changed to ${newStatus}`,
      })
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          delivery_cost: Number.parseFloat(formData.delivery_cost) || 0,
        }),
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Failed to create purchase order: ${errorData}`)
      }

      const newPO = await response.json()
      setPurchaseOrders((prev) => [newPO, ...prev])

      setIsDialogOpen(false)
      setFormData({
        po_number: "",
        supplier_name: "",
        po_date: new Date().toISOString().split("T")[0],
        delivery_cost: "0",
        status: "Pending",
        notes: "",
      })

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      })
    } catch (error) {
      console.error("Error creating purchase order:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create purchase order",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const formatAmount = (amount: number | string | null | undefined): string => {
    const numAmount = typeof amount === "string" ? Number.parseFloat(amount) : amount || 0
    return numAmount.toFixed(2)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  const calculateStats = () => {
    const total = purchaseOrders.length
    const pending = purchaseOrders.filter((po) => po.status === "Pending").length
    const delivered = purchaseOrders.filter((po) => po.status === "Delivered").length
    const totalValue = purchaseOrders.reduce((sum, po) => sum + Number.parseFloat(po.total_cost?.toString() || "0"), 0)

    return { total, pending, delivered, totalValue }
  }

  const stats = calculateStats()

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading purchase orders...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchPurchaseOrders}>
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
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage your purchase orders and track deliveries</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPurchaseOrders}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Purchase Order</DialogTitle>
                  <DialogDescription>Add a new purchase order to track your inventory purchases.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="po_number" className="text-right">
                      PO Number *
                    </Label>
                    <Input
                      id="po_number"
                      value={formData.po_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, po_number: e.target.value }))}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="supplier_name" className="text-right">
                      Supplier *
                    </Label>
                    <Input
                      id="supplier_name"
                      value={formData.supplier_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, supplier_name: e.target.value }))}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="po_date" className="text-right">
                      PO Date *
                    </Label>
                    <Input
                      id="po_date"
                      type="date"
                      value={formData.po_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, po_date: e.target.value }))}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="delivery_cost" className="text-right">
                      Delivery Cost
                    </Label>
                    <Input
                      id="delivery_cost"
                      type="number"
                      step="0.01"
                      value={formData.delivery_cost}
                      onChange={(e) => setFormData((prev) => ({ ...prev, delivery_cost: e.target.value }))}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status" className="text-right">
                      Status
                    </Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Delivered">Delivered</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="notes" className="text-right">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="col-span-3"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Purchase Order"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
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
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>A list of all purchase orders with their current status and details.</CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Purchase Orders</h3>
              <p className="text-muted-foreground mb-4">
                You haven't created any purchase orders yet. Create your first one to get started.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Purchase Order
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Delivery Cost</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.supplier_name}</TableCell>
                    <TableCell>{formatDate(po.po_date)}</TableCell>
                    <TableCell>{po.item_count || 0}</TableCell>
                    <TableCell>${formatAmount(po.delivery_cost)}</TableCell>
                    <TableCell>${formatAmount(po.total_cost)}</TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[po.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}
                      >
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => updateStatus(po.id, "Pending")}>
                            Set to Pending
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(po.id, "Approved")}>
                            Set to Approved
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(po.id, "Delivered")}>
                            Set to Delivered
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateStatus(po.id, "Cancelled")}>
                            Set to Cancelled
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
